import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH

def get_db():
    db_url = os.environ.get("DATABASE_URL")
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
