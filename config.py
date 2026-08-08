"""
AutoMarket Intelligence Platform — Central Configuration
"""
import os

# ─── Paths ───────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "db")
DB_PATH = os.path.join(DB_DIR, "automarket.db")
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MAPPINGS_DIR = os.path.join(DATA_DIR, "mappings")
DASHBOARD_DIR = os.path.join(BASE_DIR, "dashboard")

# ─── DGT Spain Configuration ────────────────────────────
DGT_BASE_URL = "https://www.dgt.es/microdatos/salida"
DGT_FILE_PATTERN = "{base}/{year}/{month}/vehiculos/matriculaciones/export_mat_{date}.zip"
DGT_ENCODING = "latin-1"  # ISO-8859-1 typical for DGT files
DGT_DELIMITER = "|"
DGT_HISTORICAL_START_YEAR = 2020  # Try downloading from this year onwards

# ─── API Configuration ───────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = ["*"]

# ─── Freemium Limits ─────────────────────────────────────
FREE_HISTORY_MONTHS = 3
FREE_EXPORT_ENABLED = False
RATE_LIMIT_PER_MINUTE = 60

# ─── Ensure directories exist ────────────────────────────
for d in [DB_DIR, RAW_DIR, PROCESSED_DIR, MAPPINGS_DIR]:
    os.makedirs(d, exist_ok=True)
