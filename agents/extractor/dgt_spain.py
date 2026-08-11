import os
import requests
import zipfile
import io
import sqlite3
import pandas as pd
import hashlib
import logging
from datetime import datetime, timedelta
import argparse

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from config import DGT_BASE_URL, DGT_ENCODING, DGT_DELIMITER, DB_PATH, DGT_HISTORICAL_START_YEAR

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class DGTSpainExtractor:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        
    def download_and_extract(self, date_obj):
        import time
        year = date_obj.strftime("%Y")
        month_no_zero = str(date_obj.month)
        date_str = date_obj.strftime("%Y%m%d")
        
        url = f"{DGT_BASE_URL}/{year}/{month_no_zero}/vehiculos/matriculaciones/export_mat_{date_str}.zip"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code == 404:
                    logging.info(f"No data for {date_str} (HTTP 404, DGT file not yet published or weekend/holiday)")
                    return None
                response.raise_for_status()
                
                with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                    txt_files = [f for f in z.namelist() if f.endswith('.txt') or f.endswith('.csv')]
                    if not txt_files:
                        logging.warning(f"No text/csv file found inside ZIP for {date_str}")
                        return None
                    
                    target_file = txt_files[0]
                    with z.open(target_file) as f:
                        df = pd.read_csv(f, delimiter=DGT_DELIMITER, encoding=DGT_ENCODING, low_memory=False, dtype=str)
                        logging.info(f"Successfully downloaded and read {len(df)} raw rows for {date_str}")
                        return df
            except Exception as e:
                logging.warning(f"Attempt {attempt}/{max_attempts} failed for {date_str}: {e}")
                if attempt < max_attempts:
                    time.sleep(2)
                else:
                    logging.error(f"Failed to fetch DGT data for {date_str} after {max_attempts} attempts.")
                    return None

    def process_dataframe(self, df, date_obj):
        records = []
        date_str = date_obj.strftime("%Y-%m-%d")
        
        for idx, row in df.iterrows():
            marca = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else "DESCONOCIDO"
            modelo = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else "DESCONOCIDO"
            fuel = str(row.iloc[4]).strip() if len(row) > 4 and pd.notna(row.iloc[4]) else "GASOLINA"
            tipo = str(row.iloc[5]).strip() if len(row) > 5 and pd.notna(row.iloc[5]) else "TURISMO"
            prov = str(row.iloc[6]).strip() if len(row) > 6 and pd.notna(row.iloc[6]) else "DESCONOCIDO"
            es_nuevo = 1
            
            raw_concat = f"{date_str}_{marca}_{modelo}_{fuel}_{prov}_{idx}"
            hash_dedup = hashlib.sha256(raw_concat.encode('utf-8')).hexdigest()
            
            records.append({
                'fecha': date_str,
                'marca_raw': marca,
                'modelo_raw': modelo,
                'carburante_raw': fuel,
                'tipo_vehiculo': tipo,
                'provincia_raw': prov,
                'unidades': 1,
                'es_nuevo': es_nuevo,
                'hash_dedup': hash_dedup
            })
            
        return records

    def save_records(self, records, date_obj):
        if not records:
            return 0
            
        db_url = os.environ.get("DATABASE_URL")
        date_str = date_obj.strftime('%Y-%m-%d')
        
        if db_url:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cursor = conn.cursor()
                
                df = pd.DataFrame(records)
                df['fecha'] = date_str
                df['mes_str'] = date_obj.strftime('%Y-%m')
                df['anio_str'] = date_obj.strftime('%Y')
                df['marca_clean'] = df['marca_raw'].astype(str).str.strip().str.upper()
                df['modelo_clean'] = df['modelo_raw'].astype(str).str.strip().str.upper()
                df['modelo_full'] = df['marca_clean'] + ' ' + df['modelo_clean']
                
                def norm_fuel(val):
                    s = str(val).strip().upper()
                    if 'GASOLINA' in s: return 'GASOLINA'
                    if 'PHEV' in s or 'ENCHUF' in s: return 'PHEV'
                    if 'BEV' in s or 'ELEC' in s: return 'ELECTRICO'
                    if 'HEV' in s or 'MHEV' in s or 'HIBRID' in s or 'HÍBRID' in s: return 'HIBRIDO'
                    if 'DIESEL' in s or 'DIÉSEL' in s: return 'DIESEL'
                    if 'GLP' in s or 'GNC' in s or 'GAS' in s: return 'GAS'
                    return 'GASOLINA'

                df['carburante_std'] = df['carburante_raw'].apply(norm_fuel)
                df['provincia'] = df['provincia_raw'].astype(str).str.strip().str.upper()
                df['ccaa'] = 'Comunidad de Madrid'
                df['unidades'] = 1
                
                grouped = df.groupby(['fecha', 'mes_str', 'anio_str', 'marca_clean', 'modelo_clean', 'modelo_full', 'carburante_std', 'provincia', 'ccaa'])['unidades'].sum().reset_index()
                
                cursor.execute("DELETE FROM ventas_mensuales_resumen WHERE fecha = %s", (date_str,))
                
                insert_sql = """
                INSERT INTO ventas_mensuales_resumen (fecha, mes_str, anio_str, marca_clean, modelo_clean, modelo_full, carburante_std, provincia, ccaa, total_unidades)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                rows_to_insert = [
                    (r['fecha'], r['mes_str'], r['anio_str'], r['marca_clean'], r['modelo_clean'], r['modelo_full'], r['carburante_std'], r['provincia'], r['ccaa'], int(r['unidades']))
                    for _, r in grouped.iterrows()
                ]
                
                cursor.executemany(insert_sql, rows_to_insert)
                conn.commit()
                conn.close()
                logging.info(f"Loaded {len(records)} raw records ({len(rows_to_insert)} summary rows) into PostgreSQL for {date_str}")
                return len(records)
            except Exception as e:
                logging.error(f"Error saving to PostgreSQL for {date_str}: {e}")
                return 0
        else:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                inserted = 0
                dups = 0
                
                for r in records:
                    try:
                        cursor.execute("""
                            INSERT INTO ventas_registradas (
                                pais_id, fecha, marca_raw, modelo_raw, carburante_raw, 
                                tipo_vehiculo, provincia_raw, unidades, es_nuevo, 
                                fuente, hash_dedup
                            ) VALUES (
                                (SELECT id FROM paises WHERE codigo_iso = 'ES'), ?, ?, ?, ?, ?, ?, ?, ?, 'DGT', ?
                            )
                        """, (r['fecha'], r['marca_raw'], r['modelo_raw'], r['carburante_raw'], 
                              r['tipo_vehiculo'], r['provincia_raw'], r['unidades'], r['es_nuevo'], r['hash_dedup']))
                        inserted += 1
                    except sqlite3.IntegrityError:
                        dups += 1
                
                conn.commit()
                logging.info(f"Loaded {inserted} records for {date_str} into SQLite ({dups} duplicates)")
                return inserted

    def run_date(self, date_obj):
        logging.info(f"Extracting DGT data for {date_obj.strftime('%Y-%m-%d')}")
        df = self.download_and_extract(date_obj)
        if df is not None:
            records = self.process_dataframe(df, date_obj)
            return self.save_records(records, date_obj)
        return 0

    def run_range(self, start_date, end_date):
        if not start_date or not end_date:
            row = None
            if os.environ.get("DATABASE_URL"):
                try:
                    import psycopg2
                    conn = psycopg2.connect(os.environ["DATABASE_URL"])
                    c = conn.cursor()
                    c.execute("SELECT MAX(fecha) FROM ventas_mensuales_resumen WHERE fecha IS NOT NULL")
                    row = c.fetchone()
                    conn.close()
                except Exception as e:
                    logging.warning(f"Could not fetch max date from PostgreSQL: {e}")
            
            if row and row[0]:
                last_date = datetime.strptime(str(row[0]), "%Y-%m-%d")
                start_date = last_date + timedelta(days=1)
            else:
                start_date = datetime.now() - timedelta(days=7)
                
            end_date = datetime.now()
            
        current = start_date
        total = 0
        while current <= end_date:
            total += self.run_date(current)
            current += timedelta(days=1)
        return total

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DGT Spain Data Extractor")
    parser.add_argument("--date", help="Extract single date (YYYY-MM-DD)")
    parser.add_argument("--range", nargs=2, help="Extract date range (YYYY-MM-DD YYYY-MM-DD)")
    parser.add_argument("--month", help="Extract entire month (YYYY-MM)")
    parser.add_argument("--historical", action="store_true")
    args = parser.parse_args()
    
    extractor = DGTSpainExtractor()
    
    if args.date:
        extractor.run_date(datetime.strptime(args.date, "%Y-%m-%d"))
    elif args.range:
        start = datetime.strptime(args.range[0], "%Y-%m-%d")
        end = datetime.strptime(args.range[1], "%Y-%m-%d")
        extractor.run_range(start, end)
    elif args.month:
        start = datetime.strptime(args.month + "-01", "%Y-%m-%d")
        import calendar
        _, last_day = calendar.monthrange(start.year, start.month)
        end = datetime(start.year, start.month, last_day)
        extractor.run_range(start, end)
    elif args.historical:
        start = datetime(DGT_HISTORICAL_START_YEAR, 1, 1)
        end = datetime.now()
        extractor.run_range(start, end)
    else:
        extractor.run_range(None, None)
