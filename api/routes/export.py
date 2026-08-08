from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import csv
import io
import sqlite3
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from config import DB_PATH, FREE_EXPORT_ENABLED
from api.middleware.freemium import check_export_enabled, FreemiumLimitError

router = APIRouter()

@router.get("/csv")
def export_csv():
    try:
        check_export_enabled(FREE_EXPORT_ENABLED)
    except FreemiumLimitError as e:
        raise HTTPException(status_code=403, detail=str(e))
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM ventas_registradas LIMIT 100") # Limit for safety
    rows = c.fetchall()
    conn.close()
    
    if not rows:
        return Response(content="No data", media_type="text/csv")
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(rows[0].keys())
    for r in rows:
        writer.writerow(r)
        
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=export.csv"})
