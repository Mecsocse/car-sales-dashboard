import os
import sys
import requests
import zipfile
import io
import sqlite3
import logging
import re
import time
import json
from datetime import datetime, timedelta
import argparse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from config import DGT_BASE_URL, DGT_ENCODING, DB_PATH

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# INE Province & CCAA Mapping
INE_MAP = {
    '01': ('Álava', 'País Vasco'), '02': ('Albacete', 'Castilla-La Mancha'),
    '03': ('Alicante', 'Comunidad Valenciana'), '04': ('Almería', 'Andalucía'),
    '05': ('Ávila', 'Castilla y León'), '06': ('Badajoz', 'Extremadura'),
    '07': ('Illes Balears', 'Illes Balears'), '08': ('Barcelona', 'Cataluña'),
    '09': ('Burgos', 'Castilla y León'), '10': ('Cáceres', 'Extremadura'),
    '11': ('Cádiz', 'Andalucía'), '12': ('Castellón', 'Comunidad Valenciana'),
    '13': ('Ciudad Real', 'Castilla-La Mancha'), '14': ('Córdoba', 'Andalucía'),
    '15': ('A Coruña', 'Galicia'), '16': ('Cuenca', 'Castilla-La Mancha'),
    '17': ('Girona', 'Cataluña'), '18': ('Granada', 'Andalucía'),
    '19': ('Guadalajara', 'Castilla-La Mancha'), '20': ('Gipuzkoa', 'País Vasco'),
    '21': ('Huelva', 'Andalucía'), '22': ('Huesca', 'Aragón'),
    '23': ('Jaén', 'Andalucía'), '24': ('León', 'Castilla y León'),
    '25': ('Lleida', 'Cataluña'), '26': ('La Rioja', 'La Rioja'),
    '27': ('Lugo', 'Galicia'), '28': ('Madrid', 'Comunidad de Madrid'),
    '29': ('Málaga', 'Andalucía'), '30': ('Murcia', 'Región de Murcia'),
    '31': ('Navarra', 'Comunidad Foral de Navarra'), '32': ('Ourense', 'Galicia'),
    '33': ('Asturias', 'Principado de Asturias'), '34': ('Palencia', 'Castilla y León'),
    '35': ('Las Palmas', 'Canarias'), '36': ('Pontevedra', 'Galicia'),
    '37': ('Salamanca', 'Castilla y León'), '38': ('Santa Cruz de Tenerife', 'Canarias'),
    '39': ('Cantabria', 'Cantabria'), '40': ('Segovia', 'Castilla y León'),
    '41': ('Sevilla', 'Andalucía'), '42': ('Soria', 'Castilla y León'),
    '43': ('Tarragona', 'Cataluña'), '44': ('Teruel', 'Aragón'),
    '45': ('Toledo', 'Castilla-La Mancha'), '46': ('Valencia', 'Comunidad Valenciana'),
    '47': ('Valladolid', 'Castilla y León'), '48': ('Bizkaia', 'País Vasco'),
    '49': ('Zamora', 'Castilla y León'), '50': ('Zaragoza', 'Aragón'),
    '51': ('Ceuta', 'Ceuta'), '52': ('Melilla', 'Melilla')
}

CANONICAL_MODELS = {
    'DACIA': ['SANDERO', 'DUSTER', 'JOGGER', 'SPRING', 'BIGSTER', 'LOGAN', 'LODGY', 'DOKKER'],
    'RENAULT': ['5 E-TECH', '4 E-TECH', 'MEGANE E-TECH', 'SCENIC E-TECH', 'CLIO', 'CAPTUR', 'AUSTRAL', 'ARKANA', 'MEGANE', 'SCENIC', 'ESPACE', 'RAFALE', 'SYMBIOZ', 'TWINGO', 'KANGOO', 'ZOE', 'KADJAR'],
    'MG': ['ZS', 'MG4', 'MG3', 'HS', 'EHS', 'CYBERSTER', 'MARVEL R', '5 ELECTRIC', 'S5', 'S6'],
    'SEAT': ['IBIZA', 'ARONA', 'ATECA', 'LEON', 'TARRACO', 'ALHAMBRA'],
    'HYUNDAI': ['IONIQ 5', 'IONIQ 6', 'IONIQ 9', 'TUCSON', 'KONA', 'I20', 'I10', 'I30', 'BAYON', 'SANTA FE', 'STARIA', 'INSTER'],
    'TOYOTA': ['COROLLA CROSS', 'YARIS CROSS', 'COROLLA', 'C-HR EV', 'C-HR', 'GR YARIS', 'YARIS', 'RAV4', 'AYGO X', 'BZ4X', 'HIGHLANDER', 'CAMRY', 'LAND CRUISER', 'PROACE CITY', 'PROACE', 'AURIS'],
    'VOLKSWAGEN': ['ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. BUZZ', 'T-ROC', 'T-CROSS', 'TIGUAN', 'GOLF', 'POLO', 'TAIGO', 'PASSAT', 'TOURAN', 'CADDY', 'MULTIVAN', 'CALIFORNIA', 'ARTEON', 'TOUAREG', 'TAYRON'],
    'KIA': ['EV2', 'EV3', 'EV4', 'EV5', 'EV6', 'EV9', 'SPORTAGE', 'NIRO', 'STONIC', 'XCEED', 'CEED', 'PICANTO', 'SORENTO', 'PROCEED', 'RIO', 'PV5'],
    'PEUGEOT': ['E-2008', 'E-208', 'E-3008', 'E-308', 'E-5008', '2008', '208', '3008', '308', '5008', '408', '508', 'RIFTER', 'TRAVELLER', 'PARTNER'],
    'CITROEN': ['Ë-C3 AIRCROSS', 'C3 AIRCROSS', 'Ë-C4 X', 'C4 X', 'Ë-C4', 'Ë-C3', 'C3', 'C4', 'C5 AIRCROSS', 'C5 X', 'BERLINGO', 'SPACETOURER'],
    'CUPRA': ['FORMENTOR', 'TERRAMAR', 'TAVASCAN', 'BORN', 'RAVAL', 'LEON', 'ATECA'],
    'BMW': ['IX1', 'IX2', 'IX3', 'IX', 'I4', 'I5', 'I7', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'SERIE 1', 'SERIE 2', 'SERIE 3', 'SERIE 4', 'SERIE 5', 'Z4', 'M2', 'M3', 'M4', 'M5'],
    'MERCEDES-BENZ': ['EQA', 'EQB', 'EQE', 'EQS', 'EQV', 'GLC', 'GLA', 'GLB', 'GLE', 'GLS', 'CLA', 'CLE', 'CLASE A', 'CLASE C', 'CLASE E', 'CLASE S', 'CLASE B', 'CLASE V', 'CITAN'],
    'AUDI': ['Q4', 'Q6', 'Q8', 'E-TRON', 'Q3', 'Q5', 'Q2', 'Q7', 'A3', 'A1', 'A4', 'A5', 'A6', 'TT', 'R8'],
    'SKODA': ['ELROQ', 'ENYAQ', 'EPIQ', 'KAMIQ', 'KAROQ', 'FABIA', 'OCTAVIA', 'KODIAQ', 'SCALA', 'SUPERB'],
    'NISSAN': ['QASHQAI', 'JUKE', 'X-TRAIL', 'TOWNSTAR', 'ARIYA', 'LEAF', 'MICRA'],
    'TESLA': ['MODEL Y', 'MODEL 3', 'MODEL X', 'MODEL S', 'CYBERTRUCK'],
    'FIAT': ['500E', '500', 'PANDA', '600', 'TIPO', '500X', 'TOPOLINO', 'DOBLO'],
    'OPEL': ['CORSA', 'MOKKA', 'CROSSLAND', 'ASTRA', 'GRANDLAND', 'FRONTERA', 'COMBO'],
    'JEEP': ['AVENGER', 'RENEGADE', 'COMPASS', 'WRANGLER', 'GRAND CHEROKEE'],
    'VOLVO': ['EX30', 'EX40', 'EC40', 'EX90', 'XC40', 'XC60', 'XC90', 'V60', 'V90', 'S60'],
    'MAZDA': ['6E', 'CX-30', 'CX-5', 'MAZDA3', 'MAZDA2', 'CX-60', 'CX-80', 'MX-5', 'MX-30'],
    'BYD': ['DOLPHIN SURF', 'DOLPHIN', 'SEALION 7', 'SEAL U', 'SEAL 06', 'SEAL', 'ATTO 2', 'ATTO 3', 'TANG', 'HAN', 'SEAGULL'],
    'OMODA': ['OMODA 5', 'OMODA 7', 'OMODA 9'],
    'JAECOO': ['JAECOO 7', 'JAECOO 8', 'JAECOO 5'],
    'EBRO': ['S700', 'S800', 'S400', 'S900'],
    'LEAPMOTOR': ['B10', 'T03', 'C10', 'B05']
}

def clean_brand(raw_b):
    b = str(raw_b).strip().upper()
    if b in ('MERCEDES-BENZ', 'MERCEDES BENZ', 'MB', 'MERCEDES'): return 'MERCEDES-BENZ'
    if b in ('VOLKSWAGEN', 'VW', 'VOLKSWAGEN, VW', 'VOLKSWAGEN VW', 'VOLKSWAGEN V W', 'VOLKSWAGEN AG'): return 'VOLKSWAGEN'
    if b in ('CITROEN', 'CITROËN'): return 'CITROEN'
    if b in ('ALFA', 'ALFA-ROMEO'): return 'ALFA ROMEO'
    if b.startswith('SIN MARCA') or b == 'DESCONOCIDO' or b.startswith('202') or b.isdigit(): return ''
    return b

def clean_model(raw_m, brand, prop=''):
    s = str(raw_m).strip().upper()
    b = clean_brand(brand)
    if not b: return ''
    
    # Specific brand distinctions
    if b == 'CITROEN':
        s_norm = s.replace('-', 'Ë-').replace('', 'Ë').replace('E-C3', 'Ë-C3').replace('E-C4', 'Ë-C4')
        if ('AIRCROSS' in s_norm or 'AIRCR' in s_norm) and 'C3' in s_norm:
            if prop in ('2', '9') or 'Ë-C3' in s_norm or 'ELÉCTRICO' in s_norm or 'ELECTRICO' in s_norm:
                return 'Ë-C3 AIRCROSS'
            return 'C3 AIRCROSS'
        if ('C4X' in s_norm or 'C4 X' in s_norm):
            if prop in ('2', '9') or 'Ë-C4' in s_norm or 'ELÉCTRICO' in s_norm or 'ELECTRICO' in s_norm:
                return 'Ë-C4 X'
            return 'C4 X'
        if 'C4' in s_norm and not ('AIRCROSS' in s_norm or 'CACTUS' in s_norm):
            if prop in ('2', '9') or 'Ë-C4' in s_norm or 'ELÉCTRICO' in s_norm or 'ELECTRICO' in s_norm:
                return 'Ë-C4'
            return 'C4'
        if 'C3' in s_norm:
            if prop in ('2', '9') or 'Ë-C3' in s_norm or 'ELÉCTRICO' in s_norm or 'ELECTRICO' in s_norm:
                return 'Ë-C3'
            return 'C3'
            
    if b == 'TOYOTA':
        if 'COROLLA CROSS' in s or ('COROLLA' in s and '3JTN' in s):
            return 'COROLLA CROSS'
        if ('C-HR' in s or 'CHR' in s) and prop in ('2', '9'):
            return 'C-HR EV'
    
    if b in CANONICAL_MODELS:
        for canon in CANONICAL_MODELS[b]:
            if re.search(r'\b' + re.escape(canon) + r'\b', s):
                return canon
                
    s = re.sub(r'\s+(?=[0-9A-Z]*\d)[0-9A-Z]{4,16}$', '', s)
    s = re.sub(r'^[0-9A-Z\*\-]+$', '', s) if len(s) > 12 and not ' ' in s else s
    s = re.sub(r'\s+(HYBRID|HEV|PHEV|BEV|EV|ELECTRIC|MHEV|TSI|TDI|TFSI|HDI|DCI|4MATIC|4DRIVE|QUATTRO|AWD)\b.*', '', s)
    s = s.strip()
    if s.startswith(b + ' '): s = s[len(b)+1:].strip()
    return s if s else raw_m.strip().upper()

def parse_dgt_fuel(line, brand_clean, model_clean):
    line_u = line.upper()
    prop = line[93:94].strip() if len(line) > 94 else ''
    model_u = model_clean.upper()
    
    # 1. Official DGT Pure Electric (BEV) code: prop == '2' or '9'
    if prop in ('2', '9'):
        if brand_clean == 'LEAPMOTOR' and ('EREV' in line_u or 'REEV' in line_u or 'EXTENDED' in line_u):
            return 'PHEV'
        return 'ELECTRICO'
        
    if brand_clean in ('TESLA', 'POLESTAR', 'SMART', 'ZEEKR', 'NIO', 'SERES', 'VOYAH', 'XPENG', 'LIVAN') and prop not in ('0', '1', '3', '4', '6', '7'):
        return 'ELECTRICO'
        
    if model_u in ('ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. BUZZ', 'IONIQ 5', 'IONIQ 6', 'EV2', 'EV3', 'EV4', 'EV5', 'EV6', 'EV9', 'BORN', 'TAVASCAN', 'RAVAL', 'E-208', 'E-2008', 'SPRING', 'ARIYA', 'LEAF', '500E', '5 E-TECH', '4 E-TECH', 'MEGANE E-TECH', 'SCENIC E-TECH', 'MUSTANG MACH-E', 'EXPLORER EV', 'ENYAQ', 'ELROQ', 'EX30', 'EX40', 'EC40', 'EX90', 'IX1', 'IX2', 'IX3', 'IX', 'I4', 'I5', 'I7', 'EQA', 'EQB', 'EQE', 'EQS', 'EQV', 'Q4', 'Q6', 'Q8 E-TRON', 'TAYCAN', 'MG4', 'CYBERSTER', 'MARVEL R', 'B10', 'T03') and prop not in ('0', '1', '3', '4', '6', '7'):
        return 'ELECTRICO'

    # 2. Híbridos Enchufables (PHEV)
    if 'PHEV' in line_u or 'ENCHUFABLE' in line_u or 'PLUG-IN' in line_u or 'TFSI E' in line_u or '4XE' in line_u or 'DM-I' in line_u or 'E-HYBRID' in line_u or 'EREV' in line_u or 'REEV' in line_u:
        return 'PHEV'
    if model_u in ('C-HR PLUG-IN', 'RAV4 PLUG-IN', 'FORMENTOR E-HYBRID', 'LEON E-HYBRID', 'TERRAMAR E-HYBRID', 'KUGA PHEV', 'GLC 300 E', 'GLC 300 DE', 'A 250 E', 'C 300 E', 'C 300 DE', '330E', '530E', '225XE', 'SEAL U DM-I', 'OUTLANDER PHEV', 'ECLIPSE CROSS PHEV'):
        return 'PHEV'
        
    # 3. Gas (GLP / GNC)
    if prop in ('6', '7') or 'GLP' in line_u or 'GNC' in line_u or 'ECO-G' in line_u or 'BI-FUEL' in line_u or 'TGI' in line_u:
        return 'GAS'
    if brand_clean == 'DACIA' and ('ECO-G' in line_u or prop == '6'):
        return 'GAS'
        
    # 4. Híbridos Diésel (HEV_DIESEL)
    if prop == '4' or (brand_clean in ('MERCEDES-BENZ', 'BMW', 'AUDI', 'VOLVO') and ('200 D' in line_u or '220 D' in line_u or '300 D' in line_u or '20D' in line_u or '30D' in line_u) and ('HEV' in line_u or 'MHEV' in line_u or 'HYBRID' in line_u or prop in ('3','4'))):
        return 'HEV_DIESEL'
        
    # 5. Híbridos Gasolina (HEV_GASOLINA)
    if prop == '3' or 'HEV' in line_u or 'MHEV' in line_u or 'HYBRID' in line_u or 'E-TECH' in line_u or 'E-POWER' in line_u:
        return 'HEV_GASOLINA'
    if brand_clean in ('TOYOTA', 'LEXUS', 'HONDA') and model_u not in ('LAND CRUISER', 'GR YARIS', 'AYGO X'):
        return 'HEV_GASOLINA'
    if brand_clean == 'FORD' and model_u in ('PUMA', 'KUGA') and 'ECOBOOST' in line_u:
        return 'HEV_GASOLINA'
    if brand_clean in ('HYUNDAI', 'KIA') and ('HYBRID' in line_u or 'MHEV' in line_u or '48V' in line_u):
        return 'HEV_GASOLINA'
    if brand_clean in ('RENAULT', 'NISSAN') and model_u in ('AUSTRAL', 'ARKANA', 'ESPACE', 'RAFALE', 'SYMBIOZ', 'QASHQAI', 'JUKE'):
        return 'HEV_GASOLINA'
        
    # 6. Diésel Puro (Térmico C)
    if prop == '1' or 'DIESEL' in line_u or 'TDI' in line_u or 'CDI' in line_u or 'BLUEHDI' in line_u or 'HDI' in line_u or 'DCI' in line_u or 'CRDI' in line_u or ' 2.0 D' in line_u:
        return 'DIESEL'
        
    # 7. Gasolina Pura (Térmico C)
    return 'GASOLINA'

class DGTSpainExtractor:
    def __init__(self, db_path=None):
        if db_path is None:
            self.db_path = "matriculaciones.db" if os.path.exists("matriculaciones.db") else DB_PATH
        else:
            self.db_path = db_path
        self.raw_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/raw'))
        os.makedirs(self.raw_dir, exist_ok=True)

    def download_and_extract(self, date_obj):
        year = date_obj.strftime("%Y")
        month_no_zero = str(date_obj.month)
        date_str = date_obj.strftime("%Y%m%d")
        
        # Check if already downloaded and saved locally in data/raw
        local_txt = os.path.join(self.raw_dir, f"export_mat_{date_str}.txt")
        if os.path.exists(local_txt) and os.path.getsize(local_txt) > 10000:
            try:
                with open(local_txt, 'r', encoding='latin-1', errors='ignore') as f:
                    lines = f.readlines()
                    if len(lines) > 50:
                        logging.info(f"Loaded {len(lines)} lines from local cache for {date_str}")
                        return lines
            except Exception:
                pass

        url = f"{DGT_BASE_URL}/{year}/{month_no_zero}/vehiculos/matriculaciones/export_mat_{date_str}.zip"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code == 404:
                    logging.info(f"No data for {date_str} (HTTP 404 - file not published or weekend/holiday)")
                    return None
                response.raise_for_status()
                
                # Save raw ZIP to data/raw
                local_zip = os.path.join(self.raw_dir, f"export_mat_{date_str}.zip")
                with open(local_zip, 'wb') as fz:
                    fz.write(response.content)

                with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                    txt_files = [f for f in z.namelist() if f.endswith('.txt') or f.endswith('.csv')]
                    if not txt_files:
                        logging.warning(f"No text/csv file found inside ZIP for {date_str}")
                        return None
                    
                    target_file = txt_files[0]
                    with z.open(target_file) as f:
                        content_bytes = f.read()
                        # Save extracted TXT to data/raw
                        with open(local_txt, 'wb') as ft:
                            ft.write(content_bytes)
                            
                        lines = content_bytes.decode(DGT_ENCODING, errors='ignore').splitlines()
                        logging.info(f"Successfully downloaded and saved {len(lines)} raw lines for {date_str}")
                        return lines
            except Exception as e:
                logging.warning(f"Attempt {attempt}/{max_attempts} failed for {date_str}: {e}")
                if attempt < max_attempts:
                    time.sleep(2)
                else:
                    logging.error(f"Failed to fetch DGT data for {date_str} after {max_attempts} attempts.")
                    return None
        return None

    def process_lines(self, lines, date_obj):
        from collections import defaultdict
        daily_summary = defaultdict(int)
        
        date_iso = date_obj.strftime("%Y-%m-%d")
        year = date_obj.strftime("%Y")
        mes_str = date_obj.strftime("%Y-%m")
        
        for l in lines:
            if len(l) < 185: continue
            
            date_raw = l[0:8].strip()
            if len(date_raw) != 8 or not date_raw.isdigit(): continue
            
            # Filter strictly PASSENGER CARS (Turismos tipo 40)
            tipo = l[91:93].strip()
            if tipo != '40': continue
            
            # Filter strictly NUEVOS TURISMOS (ANFAC standard, proc starts with 'N')
            proc = l[178:180].strip()
            if not proc.startswith('N'): continue
            
            brand_raw = l[17:47].strip()
            model_raw = l[47:77].strip()
            
            b_clean = clean_brand(brand_raw)
            if not b_clean: continue
            
            if any(cm in model_raw.upper() for cm in ('FORMENTOR', 'TERRAMAR', 'TAVASCAN', 'BORN', 'RAVAL')) or b_clean == 'CUPRA':
                b_clean = 'CUPRA'
                
            prop_code = l[93:94].strip() if len(l) > 94 else ''
            m_clean = clean_model(model_raw, b_clean, prop=prop_code)
            if not m_clean or m_clean == 'DESCONOCIDO': continue
            
            mf = f"{b_clean} {m_clean}"
            p_code = l[165:167].strip()
            prov, ccaa = INE_MAP.get(p_code, ('Madrid', 'Comunidad de Madrid'))
            
            fuel = parse_dgt_fuel(l, b_clean, m_clean)
            
            key = (date_iso, mes_str, year, b_clean, m_clean, mf, fuel, prov, ccaa)
            daily_summary[key] += 1
            
        logging.info(f"Date {date_iso}: Extracted {sum(daily_summary.values())} clean turismos ({len(daily_summary)} unique summary groups)")
        return daily_summary

    def save_summary_data(self, daily_summary, date_obj):
        if not daily_summary:
            return 0
            
        date_iso = date_obj.strftime('%Y-%m-%d')
        total_turismos = sum(daily_summary.values())
        
        # 1. PostgreSQL Supabase Save
        db_url = os.environ.get("DATABASE_URL") or "postgresql://postgres.nmqclghnxmstpabcyugn:Apuig060489%3F@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
        if db_url:
            try:
                import psycopg2
                from psycopg2.extras import execute_batch
                conn = psycopg2.connect(db_url)
                conn.autocommit = True
                cursor = conn.cursor()
                
                # Delete any existing rows for this date
                cursor.execute("DELETE FROM ventas_mensuales_resumen WHERE fecha = %s", (date_iso,))
                
                rows_to_insert = [
                    (k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7], k[8], count)
                    for k, count in daily_summary.items()
                ]
                
                insert_query = """
                    INSERT INTO ventas_mensuales_resumen (
                        fecha, mes_str, anio_str, marca_clean, modelo_clean, modelo_full, carburante_std, provincia, ccaa, total_unidades
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                execute_batch(cursor, insert_query, rows_to_insert, page_size=2000)

                # Also save latest plate series if available in raw file
                local_txt = os.path.join(self.raw_dir, f"export_mat_{date_obj.strftime('%Y%m%d')}.txt")
                if os.path.exists(local_txt):
                    try:
                        with open(local_txt, 'r', encoding='latin-1', errors='ignore') as ft:
                            l0 = ft.readline().strip()
                            m = re.search(r'([A-Z]{3})\s*$', l0)
                            if m:
                                serie = m.group(1)
                                cursor.execute("""
                                    CREATE TABLE IF NOT EXISTS dgt_matriculas_historial (
                                        fecha DATE PRIMARY KEY,
                                        serie_letras VARCHAR(10) NOT NULL,
                                        numero_estimado VARCHAR(10),
                                        matricula_completa VARCHAR(20),
                                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                                    );
                                    INSERT INTO dgt_matriculas_historial (fecha, serie_letras, numero_estimado, matricula_completa)
                                    VALUES (%s, %s, '7160', %s)
                                    ON CONFLICT (fecha) DO UPDATE
                                    SET serie_letras = EXCLUDED.serie_letras,
                                        matricula_completa = EXCLUDED.matricula_completa;
                                """, (date_iso, serie, f"7160 {serie}"))
                    except Exception as ep:
                        logging.warning(f"Could not record plate for {date_iso}: {ep}")

                conn.close()
                logging.info(f"Saved {total_turismos} clean turismos to Supabase for {date_iso}")
            except Exception as e:
                logging.error(f"Error saving to Supabase for {date_iso}: {e}")

        # 2. Local SQLite Save
        try:
            conn_sq = sqlite3.connect(self.db_path)
            c_sq = conn_sq.cursor()
            
            c_sq.execute("DELETE FROM ventas_mensuales_resumen WHERE fecha = ?", (date_iso,))
            
            rows_sq = [
                (k[0], k[1], k[2], k[8], k[7], k[3], k[4], k[5], k[6], count)
                for k, count in daily_summary.items()
            ]
            c_sq.executemany("""
                INSERT INTO ventas_mensuales_resumen (
                    fecha, mes_str, anio_str, ccaa, provincia, marca_clean, modelo_clean, modelo_full, carburante_std, total_unidades
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, rows_sq)
            
            conn_sq.commit()
            conn_sq.close()
            logging.info(f"Saved {total_turismos} clean turismos to SQLite for {date_iso}")
        except Exception as e:
            logging.error(f"Error saving to SQLite for {date_iso}: {e}")
            
        return total_turismos

    def run_date(self, date_obj):
        date_str = date_obj.strftime('%Y-%m-%d')
        logging.info(f"Checking DGT Spain for date {date_str}...")
        lines = self.download_and_extract(date_obj)
        if lines:
            daily_summary = self.process_lines(lines, date_obj)
            return self.save_summary_data(daily_summary, date_obj)
        return 0

    def run_range(self, start_date, end_date):
        current = start_date
        total = 0
        while current <= end_date:
            # Skip future dates
            if current.date() > datetime.now().date():
                break
            total += self.run_date(current)
            current += timedelta(days=1)
        return total

    def recook_precomputed_from_db(self, affected_months=None):
        """Re-generates precomputed JSON files for the affected months.
        
        Reads from Supabase via get_dashboard_metrics RPC, writes to data/precomputed/.
        This ensures the web always shows fresh data after each bot run,
        with ZERO live database queries from user traffic.
        """
        precomp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/precomputed'))
        os.makedirs(precomp_dir, exist_ok=True)
        
        db_url = os.environ.get("DATABASE_URL") or "postgresql://postgres.nmqclghnxmstpabcyugn:Apuig060489%3F@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
        
        if not affected_months:
            now = datetime.now()
            affected_months = [now.strftime('%Y-%m')]
            # If we're in the first 3 days, also recook previous month
            if now.day <= 3:
                prev = now.replace(day=1) - timedelta(days=1)
                affected_months.append(prev.strftime('%Y-%m'))
        
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor, connect_timeout=30)
            cursor = conn.cursor()
            
            for month_str in affected_months:
                year_str = month_str[:4]
                try:
                    # Cook this month via the RPC function
                    cursor.execute(
                        "SELECT get_dashboard_metrics(%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        ['month', month_str, year_str, '', '', '', '', None, None]
                    )
                    row = cursor.fetchone()
                    if row and row.get('get_dashboard_metrics'):
                        month_data = row['get_dashboard_metrics']
                        fpath = os.path.join(precomp_dir, f"all_data_month_{month_str}.json")
                        with open(fpath, 'w', encoding='utf-8') as f:
                            json.dump(month_data, f, ensure_ascii=False)
                        total = month_data.get('summary', {}).get('total_month', 0)
                        logging.info(f"[COOK] Re-cooked month {month_str} -> {total:,} un.")
                except Exception as e:
                    logging.error(f"[COOK] Error cooking month {month_str}: {e}")
            
            # Also recook the current year
            current_year = datetime.now().strftime('%Y')
            try:
                cursor.execute(
                    "SELECT get_dashboard_metrics(%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    ['year', f'{current_year}-12', current_year, '', '', '', '', None, None]
                )
                row = cursor.fetchone()
                if row and row.get('get_dashboard_metrics'):
                    year_data = row['get_dashboard_metrics']
                    fpath = os.path.join(precomp_dir, f"all_data_year_{current_year}.json")
                    with open(fpath, 'w', encoding='utf-8') as f:
                        json.dump(year_data, f, ensure_ascii=False)
                    total = year_data.get('summary', {}).get('total_month', 0)
                    logging.info(f"[COOK] Re-cooked year {current_year} -> {total:,} un.")
            except Exception as e:
                logging.error(f"[COOK] Error cooking year {current_year}: {e}")
            
            conn.close()
            
            # Invalidate in-memory cache so warm_cache picks up fresh data
            try:
                from api.routes.analytics import _ALL_DATA_CACHE
                _ALL_DATA_CACHE.clear()
                logging.info("[COOK] Cleared in-memory API cache")
            except Exception:
                pass  # Not running inside FastAPI process, that's fine
                
            logging.info("[COOK] Pre-computed data refresh complete!")
            
        except Exception as e:
            logging.error(f"[COOK] Could not connect to Supabase for re-cooking: {e}")
            # Fallback: try cooking from local SQLite
            try:
                scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scripts'))
                sys.path.insert(0, scripts_dir)
                from cook_all_data import cook_all
                cook_all()
                logging.info("[COOK] Fallback: cooked from local SQLite successfully")
            except Exception as e2:
                logging.error(f"[COOK] Fallback SQLite cooking also failed: {e2}")

    def auto_catchup(self, days_back=10):
        """Automatically checks recent days and downloads any missing or updated DGT files."""
        end = datetime.now()
        start = end - timedelta(days=days_back)
        logging.info(f"Starting DGT Spain Auto Catchup from {start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}...")
        total = self.run_range(start, end)
        
        # After ingesting new data, re-cook precomputed JSONs for instant web serving
        if total > 0:
            logging.info(f"Ingested {total:,} new records. Re-cooking precomputed data...")
            # Determine which months were affected
            affected = set()
            d = start
            while d <= end:
                affected.add(d.strftime('%Y-%m'))
                d += timedelta(days=1)
            self.recook_precomputed_from_db(list(affected))
        else:
            logging.info("No new records ingested, skipping re-cook.")
        
        return total

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DGT Spain Automated Ingestion Extractor")
    parser.add_argument("--date", help="YYYY-MM-DD")
    parser.add_argument("--range", nargs=2, help="START END dates YYYY-MM-DD")
    parser.add_argument("--month", help="YYYY-MM")
    parser.add_argument("--catchup", type=int, default=10, help="Number of past days to check and catch up (default: 10)")
    args = parser.parse_args()
    
    extractor = DGTSpainExtractor()
    
    if args.date:
        extractor.run_date(datetime.strptime(args.date, "%Y-%m-%d"))
    elif args.range:
        start = datetime.strptime(args.range[0], "%Y-%m-%d")
        end = datetime.strptime(args.range[1], "%Y-%m-%d")
        extractor.run_range(start, end)
    elif args.month:
        import calendar
        y, m = int(args.month[:4]), int(args.month[5:7])
        start = datetime.strptime(f"{args.month}-01", "%Y-%m-%d")
        last_day = calendar.monthrange(y, m)[1]
        end = datetime.strptime(f"{args.month}-{last_day:02d}", "%Y-%m-%d")
        extractor.run_range(start, end)
    else:
        extractor.auto_catchup(days_back=args.catchup)
