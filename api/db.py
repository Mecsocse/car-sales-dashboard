import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH

_PG_POOL = None

def get_pg_pool():
    global _PG_POOL
    if _PG_POOL is None:
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            if "pooler.supabase.com:5432" in db_url:
                db_url = db_url.replace(":5432", ":6543")
            if "sslmode=" not in db_url:
                db_url += ("&" if "?" in db_url else "?") + "sslmode=require"
            try:
                _PG_POOL = pool.ThreadedConnectionPool(minconn=4, maxconn=20, dsn=db_url, cursor_factory=RealDictCursor)
            except Exception as e:
                print("Error initializing ThreadedConnectionPool:", e)
    return _PG_POOL

def get_db():
    pg_pool = get_pg_pool()
    if pg_pool:
        conn = pg_pool.getconn()
        conn.autocommit = True
        try:
            yield conn
        finally:
            pg_pool.putconn(conn)
    else:
        db_file = "matriculaciones.db" if os.path.exists("matriculaciones.db") else DB_PATH
        conn = sqlite3.connect(db_file, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
