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
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from config import DGT_BASE_URL, DGT_ENCODING, DGT_DELIMITER, DB_PATH, DGT_HISTORICAL_START_YEAR

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class DGTSpainExtractor:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path
        
    def download_and_extract(self, date_obj):
        year = date_obj.strftime("%Y")
        month_no_zero = str(date_obj.month)
        date_str = date_obj.strftime("%Y%m%d")
        
        url = f"{DGT_BASE_URL}/{year}/{month_no_zero}/vehiculos/matriculaciones/export_mat_{date_str}.zip"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 404:
                logging.info(f"No data for {date_str} (HTTP 404, likely weekend/holiday)")
                return None
            response.raise_for_status()
            
            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                txt_files = [f for f in z.namelist() if f.endswith('.txt')]
                if not txt_files:
                    logging.error(f"No .txt file found in ZIP for {date_str}")
                    return None
                    
                with z.open(txt_files[0]) as f:
                    df = pd.read_csv(f, sep=DGT_DELIMITER, encoding=DGT_ENCODING, dtype=str, on_bad_lines='skip')
                    return df
                    
        except requests.RequestException as e:
            logging.error(f"Error downloading {url}: {e}")
            return None
        except Exception as e:
            logging.error(f"Error processing ZIP for {date_str}: {e}")
            return None

    def process_dataframe(self, df, date_obj):
        cols = [c.upper() for c in df.columns]
        df.columns = cols
        
        def find_col(keywords):
            for c in cols:
                for kw in keywords:
                    if kw in c:
                        return c
            return None
            
        marca_col = find_col(['MARCA'])
        modelo_col = find_col(['MODELO'])
        fuel_col = find_col(['CARBURANTE', 'PROPULSION', 'MOTOR'])
        prov_col = find_col(['PROVINCIA_MAT', 'PROVINCIA'])
        tipo_col = find_col(['CLASE_MAT', 'TIPO_VEHICULO'])
        nuevo_col = find_col(['IND_NUEVO_USADO', 'ESTADO'])
        
        if not marca_col:
            logging.error("Could not find MARCA column")
            return []
            
        records = []
        for _, row in df.iterrows():
            marca = str(row.get(marca_col, '')).strip()
            if not marca or marca == 'nan':
                continue
                
            modelo = str(row.get(modelo_col, '')) if modelo_col else ''
            fuel = str(row.get(fuel_col, '')) if fuel_col else ''
            prov = str(row.get(prov_col, '')) if prov_col else ''
            tipo = str(row.get(tipo_col, '')) if tipo_col else ''
            nuevo_val = str(row.get(nuevo_col, '')) if nuevo_col else 'N'
            es_nuevo = 1 if nuevo_val.upper() in ['N', 'NUEVO'] else 0
            
            raw_str = f"{date_obj.strftime('%Y-%m-%d')}|{marca}|{modelo}|{fuel}|{prov}|{tipo}|{nuevo_val}"
            hash_dedup = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
            
            records.append({
                'fecha': date_obj.strftime('%Y-%m-%d'),
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
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Fetch mappings
            cursor.execute("SELECT nombre_raw, id FROM modelos")
            modelo_map = {r[0]: r[1] for r in cursor.fetchall()}
            
            # Dummy logic to map items for now (will be handled by normalizer ideally)
            # DGT extractor does the raw insert. The pipeline script orchestrates normalization.
            # But the instructions say batch inserts into ventas_registradas.
            # Let's insert raw records into ventas_registradas with NULL foreign keys for now,
            # or rely on the orchestrator to pass them to normalizer first.
            # Wait, the prompt says: "Generates SHA256 hash for deduplication. Batch inserts into ventas_registradas. Logs to pipeline_log"
            
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
            
            # Log
            cursor.execute("""
                INSERT INTO pipeline_log (fuente, fecha_datos, registros_raw, registros_ok, registros_dup, estado, mensaje)
                VALUES ('DGT', ?, ?, ?, ?, 'OK', 'Extracted and loaded')
            """, (date_obj.strftime('%Y-%m-%d'), len(records), inserted, dups))
            
            conn.commit()
            logging.info(f"Loaded {inserted} records for {date_obj.strftime('%Y-%m-%d')} ({dups} duplicates)")
            return inserted

    def run_date(self, date_obj):
        logging.info(f"Extracting DGT data for {date_obj.strftime('%Y-%m-%d')}")
        df = self.download_and_extract(date_obj)
        if df is not None:
            records = self.process_dataframe(df, date_obj)
            return self.save_records(records, date_obj)
        return 0

    def run_range(self, start_date, end_date):
        current = start_date
        total = 0
        while current <= end_date:
            total += self.run_date(current)
            current += timedelta(days=1)
        return total

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="YYYY-MM-DD")
    parser.add_argument("--range", nargs=2, help="START END dates YYYY-MM-DD")
    parser.add_argument("--month", help="YYYY-MM")
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
        # Default behavior: Catch up missing days from latest date in DB to today!
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT MAX(fecha) FROM ventas_registradas")
        row = c.fetchone()
        conn.close()
        
        if row and row[0]:
            last_date = datetime.strptime(row[0], "%Y-%m-%d")
            start = last_date + timedelta(days=1)
        else:
            start = datetime.now() - timedelta(days=7)
            
        end = datetime.now()
        logging.info(f"Catching up DGT daily data from {start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}")
        extractor.run_range(start, end)
