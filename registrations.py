from fastapi import APIRouter, HTTPException, Query, Depends
import sqlite3
from typing import Optional
from datetime import datetime, timedelta
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from config import DB_PATH
from api.middleware.freemium import check_date_range, FreemiumLimitError

router = APIRouter()

def get_db():
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        if "sslmode=" not in db_url:
            conn = psycopg2.connect(db_url, sslmode='require', cursor_factory=RealDictCursor, connect_timeout=10)
        else:
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

def exec_query(cursor, query: str, params=None):
    if os.environ.get("DATABASE_URL"):
        q = query.replace("?", "___PARAM_PLACEHOLDER___")
        q = q.replace("%", "%%")
        q = q.replace("___PARAM_PLACEHOLDER___", "%s")
        q = q.replace("v.pais_id = 1", "v.pais_id = '1'")
        q = q.replace("pais_id = 1", "pais_id = '1'")
        if params:
            cursor.execute(q, params)
        else:
            cursor.execute(q)
    else:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
    return cursor

def build_full_where(
    country: str = "es",
    period: str = "month",
    month: Optional[str] = None,
    year: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    fuel: Optional[str] = None,
    province: Optional[str] = None,
    ccaa: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: sqlite3.Connection = None
):
    country_code = country.upper()
    if country_code in ('ES', 'ESP', 'ESPAÑA'):
        clauses = ["(v.pais_id = 'ESP' OR v.pais_id = 1)"]
        params = []
    else:
        clauses = ["(v.pais_id = ? OR v.pais_id = 1)"]
        params = [country_code]

    clauses.append("(v.tipo_vehiculo = 'TURISMO' OR v.tipo_vehiculo IS NULL)")
    clauses.append("(v.modelo_clean NOT LIKE 'CAMION%')")
    clauses.append("(v.es_nuevo = 1 OR v.es_nuevo IS NULL)")

    if date_from:
        clauses.append("v.fecha >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("v.fecha <= ?")
        params.append(date_to)

    if not date_from and not date_to:
        if period == "today":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas)")
        elif period == "yesterday":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas WHERE fecha < (SELECT MAX(fecha) FROM ventas_registradas))")
        elif period in ("month", "custom_month"):
            target_month = month if month else "2026-08"
            if len(target_month) == 7:
                import calendar
                y, m = int(target_month[:4]), int(target_month[5:7])
                last_day = calendar.monthrange(y, m)[1]
                clauses.append("v.fecha >= ? AND v.fecha <= ?")
                params.extend([f"{target_month}-01", f"{target_month}-{last_day:02d}"])
            else:
                clauses.append("v.fecha >= ? AND v.fecha <= ?")
                params.extend(["2026-08-01", "2026-08-31"])
        elif period == "year":
            target_year = year if year else "2026"
            clauses.append("v.fecha >= ? AND v.fecha <= ?")
            params.extend([f"{target_year}-01-01", f"{target_year}-12-31"])
        elif period == "all":
            pass
        else:
            clauses.append("v.fecha >= ? AND v.fecha <= ?")
            params.extend(["2026-08-01", "2026-08-31"])

    if brand:
        clauses.append("(v.marca_clean = ? OR v.marca_raw = ?)")
        params.extend([brand, brand])
    if model:
        clauses.append("(v.modelo_clean = ? OR v.modelo_raw = ?)")
        params.extend([model, model])
    if fuel:
        if fuel in ('EV', 'Eléctrico (BEV)', 'Eléctrico', 'ELECTRICO'):
            clauses.append("v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')")
        elif fuel in ('PHEV', 'Híbrido Enchufable'):
            clauses.append("v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE')")
        elif fuel in ('HEV', 'Híbrido (HEV)', 'Híbrido', 'HIBRIDO'):
            clauses.append("(v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO') OR v.carburante_std LIKE '%HIBRID%' OR v.carburante_std LIKE '%HYBRID%')")
        else:
            clauses.append("(v.carburante_std = ? OR v.carburante_raw = ?)")
            params.extend([fuel, fuel])

    if province:
        clauses.append("(v.provincia = ? OR v.provincia_raw = ?)")
        params.extend([province, province])

    if ccaa:
        clauses.append("v.ccaa = ?")
        params.append(ccaa)

    return " AND ".join(clauses), params, 1

def _get_val(row, key, idx=0):
    if not row:
        return None
    try:
        val = row[key]
        if val is not None:
            return val
    except Exception:
        pass
    try:
        return row[idx]
    except Exception:
        return None

@router.get("/summary")
def get_summary(
    country: str = "es",
    period: str = "month",
    month: Optional[str] = None,
    year: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    fuel: Optional[str] = None,
    province: Optional[str] = None,
    ccaa: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    try:
        c = conn.cursor()
        where_sql, params, _ = build_full_where(
            country, period, month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
        )

        exec_query(c, "SELECT MAX(fecha) as max_date FROM ventas_registradas")
        max_row = c.fetchone()
        latest_date = _get_val(max_row, 'max_date', 0) or "2026-08-04"

        exec_query(c, "SELECT SUM(unidades) as total FROM ventas_registradas WHERE fecha = ? AND (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL) AND modelo_clean NOT LIKE 'CAMION%'", (latest_date,))
        today_row = c.fetchone()
        total_today = _get_val(today_row, 'total', 0) or 0

        query_total = f"""
            SELECT SUM(v.unidades) as total 
            FROM ventas_registradas v
            WHERE {where_sql}
        """
        exec_query(c, query_total, params)
        total_row = c.fetchone()
        total_month = _get_val(total_row, 'total', 0) or 0

        if date_from and date_to and date_from == date_to:
            from datetime import datetime, timedelta
            curr_d = datetime.strptime(date_from, "%Y-%m-%d")
            prev_d_str = (curr_d - timedelta(days=1)).strftime("%Y-%m-%d")
            where_prev, params_prev, _ = build_full_where(
                country, "custom_date", None, year, brand, model, fuel, province, ccaa, prev_d_str, prev_d_str, conn
            )
        else:
            target_m = month if month else ("2026-08" if period in ("month", "custom_month") else "2026-08")
            if target_m and len(target_m) == 7:
                y_int, m_int = int(target_m[:4]), int(target_m[5:7])
                prev_m_str = f"{y_int - 1}-12" if m_int == 1 else f"{y_int}-{m_int - 1:02d}"
            else:
                prev_m_str = "2026-07"

            where_prev, params_prev, _ = build_full_where(
                country, period, prev_m_str, year, brand, model, fuel, province, ccaa, None, None, conn
            )

        query_prev = f"""
            SELECT SUM(v.unidades) as total 
            FROM ventas_registradas v
            WHERE {where_prev}
        """
        exec_query(c, query_prev, params_prev)
        prev_row = c.fetchone()
        prev_month = _get_val(prev_row, 'total', 0) or 0

        pct_change = round(((total_month - prev_month) / prev_month * 100), 1) if prev_month > 0 else 0.0

        query_ev = f"""
            SELECT SUM(v.unidades) as total_ev
            FROM ventas_registradas v
            WHERE {where_sql} AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')
        """
        exec_query(c, query_ev, params)
        ev_row = c.fetchone()
        ev_units = _get_val(ev_row, 'total_ev', 0) or 0
        ev_share = round((ev_units / (total_month or 1) * 100), 1) if total_month > 0 else 0.0

        query_brand = f"""
            SELECT COALESCE(v.marca_clean, v.marca_raw) as marca, SUM(v.unidades) as total
            FROM ventas_registradas v
            WHERE {where_sql}
            GROUP BY marca
            ORDER BY total DESC LIMIT 1
        """
        exec_query(c, query_brand, params)
        top_b_row = c.fetchone()
        top_brand = _get_val(top_b_row, 'marca', 0) or "N/A"
        top_brand_units = _get_val(top_b_row, 'total', 1) or 0

        query_model = f"""
            SELECT COALESCE(v.marca_clean, v.marca_raw) || ' ' || COALESCE(v.modelo_clean, v.modelo_raw) as modelo_full, 
                   SUM(v.unidades) as total
            FROM ventas_registradas v
            WHERE {where_sql}
            GROUP BY modelo_full
            ORDER BY total DESC LIMIT 1
        """
        exec_query(c, query_model, params)
        top_m_row = c.fetchone()
        top_model = _get_val(top_m_row, 'modelo_full', 0) or "N/A"
        top_model_units = _get_val(top_m_row, 'total', 1) or 0

        return {
            "total_today": total_today,
            "total_month": total_month,
            "prev_month": prev_month,
            "pct_change": pct_change,
            "ev_share": ev_share,
            "top_brand": top_brand,
            "top_brand_units": top_brand_units,
            "top_model": top_model,
            "top_model_units": top_model_units,
            "projected_month_end": int(total_month * 1.12) if total_month > 0 else 0
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/registrations/daily")
def get_daily_registrations(
    country: str = "es",
    period: str = "month",
    month: Optional[str] = None,
    year: Optional[str] = None,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    fuel: Optional[str] = None,
    province: Optional[str] = None,
    ccaa: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    days: int = 30,
    conn: sqlite3.Connection = Depends(get_db)
):
    try:
        where_sql, params, _ = build_full_where(
            country, period, month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
        )
        c = conn.cursor()

        query = f"""
            SELECT v.fecha,
                   SUM(CASE WHEN c.codigo = 'EV' OR v.carburante_std = 'ELECTRICO' THEN v.unidades ELSE 0 END) as ev,
                   SUM(CASE WHEN c.codigo = 'PHEV' OR v.carburante_std = 'HIBRIDO' THEN v.unidades ELSE 0 END) as phev,
                   SUM(CASE WHEN c.codigo IN ('HEV','MHEV') OR v.carburante_std = 'HIBRIDO' THEN v.unidades ELSE 0 END) as hev,
                   SUM(CASE WHEN c.codigo = 'GASOLINA' OR v.carburante_std = 'GASOLINA' THEN v.unidades ELSE 0 END) as gasolina,
                   SUM(CASE WHEN c.codigo = 'DIESEL' OR v.carburante_std = 'DIESEL' THEN v.unidades ELSE 0 END) as diesel,
                   SUM(CASE WHEN c.codigo NOT IN ('EV','PHEV','HEV','MHEV','GASOLINA','DIESEL') AND v.carburante_std NOT IN ('ELECTRICO','HIBRIDO','GASOLINA','DIESEL') THEN v.unidades ELSE 0 END) as otros,
                   SUM(v.unidades) as total
            FROM ventas_registradas v
            LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
            LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo)
            LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
            WHERE {where_sql}
            GROUP BY v.fecha
            ORDER BY v.fecha ASC
        """
        exec_query(c, query, params)
        rows = c.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        return []

@router.get("/registrations/table")
def get_table(
    country: str = "es",
    period: str = "month",
    month: Optional[str] = None,
    year: Optional[str] = None,
    page: int = 1, limit: int = 50, 
    brand: Optional[str] = None, model: Optional[str] = None,
    fuel: Optional[str] = None, province: Optional[str] = None,
    ccaa: Optional[str] = None,
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    try:
        check_date_range(date_from, date_to)
    except FreemiumLimitError as e:
        raise HTTPException(status_code=403, detail=str(e))

    offset = (page - 1) * limit
    where_sql, params, _ = build_full_where(
        country, period, month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
    )
    c = conn.cursor()

    count_sql = f"""
        SELECT COUNT(*) as total
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo)
        LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
    """
    exec_query(c, count_sql, params)
    total_records = c.fetchone()['total'] or 0

    pages = max(1, (total_records + limit - 1) // limit)

    data_sql = f"""
        SELECT v.fecha, COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca, 
               COALESCE(v.modelo_clean, v.modelo_raw, '-') as modelo, 
               COALESCE(p.nombre, v.provincia, v.provincia_raw) as provincia, 
               v.ccaa,
               COALESCE(c.nombre, v.carburante_std, v.carburante_raw) as carburante, 
               v.unidades
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo)
        LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        ORDER BY v.fecha DESC, v.id DESC
        LIMIT ? OFFSET ?
    """
    data_params = params + [limit, offset]
    exec_query(c, data_sql, data_params)
    rows = c.fetchall()
    rows = c.fetchall()

    return {
        "data": [dict(r) for r in rows],
        "page": page,
        "pages": pages,
        "total": total_records
    }
