import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import sys
import time

SUPABASE_URI = 'postgresql://postgres.nmqclghnxmstpabcyugn:Apuig060489%3F@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
SQLITE_DB = 'matriculaciones.db'

def migrate():
    print("Connecting to local SQLite...")
    sq_conn = sqlite3.connect(SQLITE_DB)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    print("Connecting to Supabase PostgreSQL...")
    pg_conn = psycopg2.connect(SUPABASE_URI)
    pg_conn.autocommit = True
    pg_cur = pg_conn.cursor()
    pg_cur.execute('SET default_transaction_read_only = off;')

    print("Ensuring PostgreSQL tables exist on Supabase...")
    pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS ventas_registradas (
            id BIGSERIAL PRIMARY KEY,
            pais_id VARCHAR(10),
            fecha DATE,
            marca_id INT,
            marca_raw TEXT,
            marca_clean TEXT,
            modelo_raw TEXT,
            modelo_clean TEXT,
            carburante_id INT,
            carburante_std VARCHAR(50),
            carburante_raw TEXT,
            provincia_id INT,
            provincia VARCHAR(100),
            provincia_raw TEXT,
            tipo_vehiculo VARCHAR(50),
            unidades INT DEFAULT 1,
            es_nuevo INT DEFAULT 1,
            fuente VARCHAR(50),
            hash_dedup VARCHAR(64),
            ccaa VARCHAR(100)
        );
    """)
    print("Supabase table verified!")

    # Query clean TURISMO data grouped by date, brand, model, fuel, ccaa, provincia
    print("\nQuerying optimized TURISMO dataset from SQLite...")
    sq_cur.execute("""
        SELECT pais_id, fecha, MAX(marca_id) as marca_id, MAX(marca_raw) as marca_raw, marca_clean,
               MAX(modelo_raw) as modelo_raw, modelo_clean, MAX(carburante_id) as carburante_id,
               carburante_std, MAX(carburante_raw) as carburante_raw, MAX(provincia_id) as provincia_id,
               provincia, MAX(provincia_raw) as provincia_raw, tipo_vehiculo, SUM(unidades) as unidades,
               MAX(es_nuevo) as es_nuevo, MAX(fuente) as fuente, MAX(hash_dedup) as hash_dedup, ccaa
        FROM ventas_registradas
        WHERE (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL)
        GROUP BY fecha, marca_clean, modelo_clean, carburante_std, ccaa, provincia
    """)

    rows = sq_cur.fetchall()
    total_records = len(rows)
    print(f"Total optimized TURISMO records to insert: {total_records:,}")

    cols = ["pais_id", "fecha", "marca_id", "marca_raw", "marca_clean", "modelo_raw", "modelo_clean",
            "carburante_id", "carburante_std", "carburante_raw", "provincia_id", "provincia",
            "provincia_raw", "tipo_vehiculo", "unidades", "es_nuevo", "fuente", "hash_dedup", "ccaa"]
    col_str = ", ".join(cols)
    insert_query = f"INSERT INTO ventas_registradas ({col_str}) VALUES %s"

    batch_size = 10000
    inserted = 0
    start_t = time.time()

    for i in range(0, total_records, batch_size):
        batch = rows[i:i + batch_size]
        tuples = [tuple(r) for r in batch]
        execute_values(pg_cur, insert_query, tuples, page_size=2500)
        inserted += len(batch)
        elapsed = time.time() - start_t
        pct = (inserted / total_records) * 100
        print(f"  Progress: {inserted:,} / {total_records:,} ({pct:.1f}%) - {elapsed:.1f}s")

    print("\nRe-building PostgreSQL indexes on Supabase...")
    pg_cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas_registradas(fecha);
        CREATE INDEX IF NOT EXISTS idx_ventas_marca_clean ON ventas_registradas(marca_clean);
        CREATE INDEX IF NOT EXISTS idx_ventas_carburante_std ON ventas_registradas(carburante_std);
        CREATE INDEX IF NOT EXISTS idx_ventas_tipo_vehiculo ON ventas_registradas(tipo_vehiculo);
        CREATE INDEX IF NOT EXISTS idx_ventas_ccaa ON ventas_registradas(ccaa);
    """)

    print(f"\nMIGRATION SUCCESSFUL! Total {inserted:,} rows inserted in {time.time() - start_t:.1f}s")
    sq_conn.close()
    pg_conn.close()

if __name__ == '__main__':
    migrate()
