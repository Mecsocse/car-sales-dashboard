"""
Performs a clean re-ingest of 2025 and 2024 historical data using STRICT vehicle type classification.
Only DGT codes 400, 402, 406 are classified as TURISMO (matching ANFAC official statistics).
Code 401 (derivado comercial de turismo) = FURGONETA (excluded from turismo count).
"""
import os
import glob
import zipfile
import sqlite3
import pandas as pd
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))
from src.utils.normalizer import normalizar_marca, normalizar_modelo

RAW_DIR = "data/raw"
CODE_TO_PROV_CCAA = {
    '01': ('ÁLAVA', 'País Vasco'), '02': ('ALBACETE', 'Castilla-La Mancha'),
    '03': ('ALICANTE', 'Comunitat Valenciana'), '04': ('ALMERÍA', 'Andalucía'),
    '05': ('ÁVILA', 'Castilla y León'), '06': ('BADAJOZ', 'Extremadura'),
    '07': ('BALEARS', 'Illes Balears'), '08': ('BARCELONA', 'Cataluña'),
    '09': ('BURGOS', 'Castilla y León'), '10': ('CÁCERES', 'Extremadura'),
    '11': ('CÁDIZ', 'Andalucía'), '12': ('CASTELLÓN', 'Comunitat Valenciana'),
    '13': ('CIUDAD REAL', 'Castilla-La Mancha'), '14': ('CÓRDOBA', 'Andalucía'),
    '15': ('A CORUÑA', 'Galicia'), '16': ('CUENCA', 'Castilla-La Mancha'),
    '17': ('GIRONA', 'Cataluña'), '18': ('GRANADA', 'Andalucía'),
    '19': ('GUADALAJARA', 'Castilla-La Mancha'), '20': ('GIPUZKOA', 'País Vasco'),
    '21': ('HUELVA', 'Andalucía'), '22': ('HUESCA', 'Aragón'),
    '23': ('JAÉN', 'Andalucía'), '24': ('LEÓN', 'Castilla y León'),
    '25': ('LLEIDA', 'Cataluña'), '26': ('LA RIOJA', 'La Rioja'),
    '27': ('LUGO', 'Galicia'), '28': ('MADRID', 'Comunidad de Madrid'),
    '29': ('MÁLAGA', 'Andalucía'), '30': ('MURCIA', 'Región de Murcia'),
    '31': ('NAVARRA', 'Comunidad Foral de Navarra'), '32': ('OURENSE', 'Galicia'),
    '33': ('ASTURIAS', 'Principado de Asturias'), '34': ('PALENCIA', 'Castilla y León'),
    '35': ('LAS PALMAS', 'Canarias'), '36': ('PONTEVEDRA', 'Galicia'),
    '37': ('SALAMANCA', 'Castilla y León'), '38': ('SANTA CRUZ DE TENERIFE', 'Canarias'),
    '39': ('CANTABRIA', 'Cantabria'), '40': ('SEGOVIA', 'Castilla y León'),
    '41': ('SEVILLA', 'Andalucía'), '42': ('SORIA', 'Castilla y León'),
    '43': ('TARRAGONA', 'Cataluña'), '44': ('TERUEL', 'Aragón'),
    '45': ('TOLEDO', 'Castilla-La Mancha'), '46': ('VALENCIA', 'Comunitat Valenciana'),
    '47': ('VALLADOLID', 'Castilla y León'), '48': ('BIZKAIA', 'País Vasco'),
    '49': ('ZAMORA', 'Castilla y León'), '50': ('ZARAGOZA', 'Aragón'),
    '51': ('CEUTA', 'Ceuta y Melilla'), '52': ('MELILLA', 'Ceuta y Melilla')
}

def parse_line_strict(line, year_filter):
    if len(line) < 80 or not line[:8].isdigit():
        return None

    fecha_raw = line[0:8].strip()
    if len(fecha_raw) != 8:
        return None

    year_part = fecha_raw[4:8]
    if year_part != year_filter:
        return None

    fecha = f"{year_part}-{fecha_raw[2:4]}-{fecha_raw[0:2]}"

    # ANFAC methodology: M1 passenger cars = codes 400, 401, 402, 406
    # Code 401 (derivado de turismo) includes:
    #   - Genuine passenger cars registered as "mixto adaptable" for tax reasons → TURISMO
    #   - True cargo derivatives (Kangoo Cargo, Berlingo Van, etc.) → FURGONETA
    # We classify 401 as FURGONETA only if the model is a known cargo van
    GENUINE_CARGO_VANS_401 = {
        'KANGOO', 'BERLINGO', 'PARTNER', 'COMBO', 'RIFTER', 'PROACE CITY',
        'DOBLO', 'FIORINO', 'TRANSIT CONNECT', 'TRANSIT COURIER', 'TOURNEO',
        'CADDY', 'CADDY CARGO', 'DELIVER', 'NV200', 'TOWNSTAR',
        'TRAFIC', 'VIVARO', 'JUMPY', 'EXPERT', 'ZAFIRA LIFE',
        'MASTER', 'MOVANO', 'JUMPER', 'BOXER', 'DUCATO',
        'SPRINTER', 'VITO', 'VIANO', 'V-CLASS', 'CITAN',
        'CRAFTER', 'TRANSPORTER', 'CARAVELLE',
        'DAILY', 'TRANSIT', 'CUSTOM', 'CONNECT',
    }

    if len(line) >= 96:
        code = line[91:95].strip().upper()
        modelo_check = line[44:74].strip().upper()
        if code in ('400', '402', '406'):
            tipo_vehiculo = 'TURISMO'
        elif code == '401':
            # Check if it's a known cargo van model
            is_cargo = any(van in modelo_check for van in GENUINE_CARGO_VANS_401)
            tipo_vehiculo = 'FURGONETA' if is_cargo else 'TURISMO'
        elif code in ('403', '31'):
            tipo_vehiculo = 'FURGONETA'
        elif code.startswith('5'):
            tipo_vehiculo = 'MOTO'
        elif code.startswith('8'):
            tipo_vehiculo = 'AUTOBUS'
        elif code in ('201', '021', '900', 'S3', '7A1', '251', '250'):
            tipo_vehiculo = 'INDUSTRIAL'
        else:
            tipo_vehiculo = 'OTROS'
    else:
        tipo_vehiculo = 'TURISMO'

    marca_raw = line[14:44].strip()
    modelo_raw = line[44:74].strip()

    prov_code = line[165:167] if len(line) >= 167 else ''
    prov_info = CODE_TO_PROV_CCAA.get(prov_code, ('MADRID', 'Comunidad de Madrid'))

    fuel_zone = line[420:470].upper() if len(line) >= 470 else ''
    if 'BEV' in fuel_zone or '01000EV' in fuel_zone or 'ELECTRIC' in fuel_zone:
        carburante = 'ELECTRICO'
    elif 'PHEV' in fuel_zone or 'ENCHUFABLE' in fuel_zone:
        carburante = 'PHEV'
    elif 'HEV' in fuel_zone or 'MHEV' in fuel_zone or 'HIBRID' in fuel_zone or 'HYBRID' in fuel_zone:
        carburante = 'HEV'
    elif 'DIESEL' in fuel_zone or 'GASOIL' in fuel_zone or '02000' in fuel_zone:
        carburante = 'DIESEL'
    elif 'GLP' in fuel_zone or 'GNC' in fuel_zone:
        carburante = 'GAS'
    else:
        carburante = 'GASOLINA'

    marca_clean = normalizar_marca(marca_raw)
    if marca_clean == 'ECOAUTO':
        if 'TERRAMAR' in modelo_raw.upper():
            marca_clean = 'CUPRA'
        elif 'KUGA' in modelo_raw.upper() or 'TRANSIT' in modelo_raw.upper():
            marca_clean = 'FORD'
        elif 'AMAROK' in modelo_raw.upper():
            marca_clean = 'VOLKSWAGEN'

    modelo_clean = normalizar_modelo(modelo_raw, marca_clean)

    return {
        'pais_id': 'ESP',
        'fecha': fecha,
        'marca_raw': marca_raw,
        'marca_clean': marca_clean,
        'modelo_raw': modelo_raw,
        'modelo_clean': modelo_clean,
        'carburante_std': carburante,
        'provincia': prov_info[0],
        'ccaa': prov_info[1],
        'tipo_vehiculo': tipo_vehiculo,
        'unidades': 1
    }

def clean_ingest_year(year, conn):
    c = conn.cursor()
    year_str = str(year)
    print(f"\n=== CLEAN STRICT INGEST FOR YEAR {year} ===", flush=True)

    c.execute(f"DELETE FROM ventas_registradas WHERE fecha LIKE '{year_str}%'")
    conn.commit()
    print(f"Deleted existing {year} records.", flush=True)

    # Glob both monthly (export_mensual_mat_YYYYMM.zip) AND daily (export_mat_YYYYMMDD.zip) files!
    zips = sorted(glob.glob(f"{RAW_DIR}/*{year}*.zip"))
    total = 0

    for zf in zips:
        try:
            with zipfile.ZipFile(zf) as z:
                for name in z.namelist():
                    if name.endswith('.txt') or name.endswith('.dat'):
                        records = []
                        with z.open(name) as txt:
                            for line_b in txt:
                                line = line_b.decode('latin1', errors='ignore')
                                r = parse_line_strict(line, year_str)
                                if r:
                                    records.append(r)

                        if records:
                            c.executemany("""
                                INSERT INTO ventas_registradas (
                                    pais_id, fecha, marca_raw, marca_clean, modelo_raw, modelo_clean,
                                    carburante_std, provincia, ccaa, tipo_vehiculo, unidades
                                ) VALUES (:pais_id, :fecha, :marca_raw, :marca_clean, :modelo_raw, :modelo_clean,
                                          :carburante_std, :provincia, :ccaa, :tipo_vehiculo, :unidades)
                            """, records)
                            conn.commit()

                            turismos = sum(1 for r in records if r['tipo_vehiculo'] == 'TURISMO')
                            total += turismos
                            print(f"Processed {os.path.basename(zf)}: {turismos:,} turismos (M1 strict)", flush=True)
        except Exception as e:
            print(f"[ERROR] {zf}: {e}", flush=True)

    print(f"=== COMPLETED {year}: {total:,} TURISMOS (M1 strict) ===", flush=True)

if __name__ == "__main__":
    conn = sqlite3.connect('matriculaciones.db', timeout=30)
    clean_ingest_year(2026, conn)
    clean_ingest_year(2025, conn)
    clean_ingest_year(2024, conn)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ccaa ON ventas_registradas(ccaa)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_fecha ON ventas_registradas(fecha)")
    conn.commit()
    conn.close()
    print("\nDone.", flush=True)
