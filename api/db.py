import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH

def get_db():
    DEFAULT_SUPABASE_URL = "postgresql://postgres.nmqclghnxmstpabcyugn:Apuig060489%3F@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
    db_url = os.environ.get("DATABASE_URL") or DEFAULT_SUPABASE_URL
    if db_url:
        if "pooler.supabase.com:5432" in db_url:
            db_url = db_url.replace(":5432", ":6543")
        if "sslmode=" not in db_url:
            db_url += ("&" if "?" in db_url else "?") + "sslmode=require"
        conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor, connect_timeout=10)
        conn.autocommit = True
        try:
            yield conn
        finally:
            conn.close()
    else:
        db_file = "matriculaciones.db" if os.path.exists("matriculaciones.db") else DB_PATH
        conn = sqlite3.connect(db_file, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
