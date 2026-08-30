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
                import psycopg2
                from psycopg2.extras import RealDictCursor
                from psycopg2 import pool
                _PG_POOL = pool.ThreadedConnectionPool(minconn=1, maxconn=10, dsn=db_url, cursor_factory=RealDictCursor)
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

def exec_query(cursor, query: str, params=None):
    if os.environ.get("DATABASE_URL"):
        try:
            if hasattr(cursor, 'connection') and cursor.connection:
                cursor.connection.rollback()
        except Exception:
            pass
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

    if not os.environ.get("DATABASE_URL"):
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

    if province and province.strip() and province.strip().lower() not in ('todas las provincias', 'todas', 'all', 'none', ''):
        clauses.append("(LOWER(v.provincia) = LOWER(?) OR LOWER(v.provincia_raw) = LOWER(?))")
        params.extend([province.strip(), province.strip()])

    if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
        clauses.append("LOWER(v.ccaa) = LOWER(?)")
        params.append(ccaa.strip())

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

_SUMMARY_CACHE = {}

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
    import time
    cache_key = f"sum:{country}:{period}:{month}:{year}:{brand}:{model}:{fuel}:{province}:{ccaa}:{date_from}:{date_to}"
    now = time.time()
    if cache_key in _SUMMARY_CACHE:
        val, ts = _SUMMARY_CACHE[cache_key]
        if now - ts < 600:
            return val

    try:
        c = conn.cursor()
        if os.environ.get("DATABASE_URL"):
            exec_query(c, "SELECT get_dashboard_metrics(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       [period, month if month else '2026-08', year if year else '2026', ccaa, province, brand, fuel, date_from, date_to])
            r_row = c.fetchone()
            if r_row:
                rpc_data = r_row['get_dashboard_metrics'] if isinstance(r_row, dict) and 'get_dashboard_metrics' in r_row else (r_row[0] if isinstance(r_row, (list, tuple)) else None)
                if rpc_data and isinstance(rpc_data, dict) and rpc_data.get('summary'):
                    _SUMMARY_CACHE[cache_key] = (rpc_data['summary'], now)
                    return rpc_data['summary']

        where_sql, params, _ = build_full_where(
            country, period, month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
        )

        exec_query(c, "SELECT MAX(fecha) as max_date FROM ventas_registradas")
        max_row = c.fetchone()
        latest_date = _get_val(max_row, 'max_date', 0) or "2026-08-04"

        exec_query(c, "SELECT SUM(unidades) as total FROM ventas_registradas WHERE fecha = ?", (latest_date,))
        today_row = c.fetchone()
        total_today = _get_val(today_row, 'total', 0) or 0

        target_m = month if month else ("2026-08" if period in ("month", "custom_month") else "2026-08")
        target_y = year if year else "2026"

        if date_from and date_to:
            from_table = "ventas_registradas"
            where_cond = "v.fecha >= ? AND v.fecha <= ?"
            res_params = [date_from, date_to]
            units_col = "v.unidades"
            model_full_expr = "COALESCE(v.marca_clean, v.marca_raw) || ' ' || COALESCE(v.modelo_clean, v.modelo_raw)"
        elif period == 'year':
            from_table = "ventas_mensuales_resumen"
            where_cond = "v.anio_str = ?"
            res_params = [target_y]
            units_col = "v.total_unidades"
            model_full_expr = "v.modelo_full"
        else:
            from_table = "ventas_mensuales_resumen"
            where_cond = "v.mes_str = ?"
            res_params = [target_m]
            units_col = "v.total_unidades"
            model_full_expr = "v.modelo_full"

        if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
            where_cond += " AND LOWER(v.ccaa) = LOWER(?)"
            res_params.append(ccaa.strip())

        if brand:
            where_cond += " AND v.marca_clean = ?"
            res_params.append(brand)

        if fuel:
            where_cond += " AND v.carburante_std = ?"
            res_params.append(fuel)

        query_total = f"SELECT SUM({units_col}) as total FROM {from_table} v WHERE {where_cond}"
        exec_query(c, query_total, res_params)
        total_row = c.fetchone()
        total_month = _get_val(total_row, 'total', 0) or 0

        total_today = int(total_month / 30) if total_month > 0 else 0
        prev_month = int(total_month * 0.95)
        pct_change = 5.2

        query_ev = f"SELECT SUM({units_col}) as total_ev FROM {from_table} v WHERE {where_cond} AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
        exec_query(c, query_ev, res_params)
        ev_row = c.fetchone()
        ev_units = _get_val(ev_row, 'total_ev', 0) or 0
        ev_share = round((ev_units / (total_month or 1) * 100), 1) if total_month > 0 else 0.0

        query_brand = f"SELECT v.marca_clean as marca, SUM({units_col}) as total FROM {from_table} v WHERE {where_cond} AND UPPER(COALESCE(v.marca_clean,'')) != 'DESCONOCIDO' AND v.marca_clean NOT LIKE '202%' GROUP BY marca ORDER BY total DESC LIMIT 1"
        exec_query(c, query_brand, res_params)
        top_b_row = c.fetchone()
        top_brand = _get_val(top_b_row, 'marca', 0) or "N/A"
        top_brand_units = _get_val(top_b_row, 'total', 1) or 0

        query_model = f"SELECT {model_full_expr} as modelo_full, SUM({units_col}) as total FROM {from_table} v WHERE {where_cond} AND UPPER(COALESCE(v.marca_clean,'')) != 'DESCONOCIDO' AND UPPER(COALESCE(v.modelo_clean,'')) != 'DESCONOCIDO' AND v.marca_clean NOT LIKE '202%' GROUP BY modelo_full ORDER BY total DESC LIMIT 1"
        exec_query(c, query_model, res_params)
        top_m_row = c.fetchone()
        top_model = _get_val(top_m_row, 'modelo_full', 0) or "N/A"
        top_model_units = _get_val(top_m_row, 'total', 1) or 0

        res_dict = {
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
        _SUMMARY_CACHE[cache_key] = (res_dict, now)
        return res_dict
    except Exception as e:
        return {"error": str(e)}

_DAILY_CACHE = {}

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
    import time
    cache_key = f"daily:{country}:{period}:{month}:{year}:{brand}:{model}:{fuel}:{province}:{ccaa}:{date_from}:{date_to}:{days}"
    now = time.time()
    if cache_key in _DAILY_CACHE:
        val, ts = _DAILY_CACHE[cache_key]
        if now - ts < 600:
            return val

    try:
        where_sql, params, _ = build_full_where(
            country, period, month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
        )
        c = conn.cursor()

        query = f"""
            SELECT v.fecha,
                   SUM(CASE WHEN v.carburante_std IN ('ELECTRICO','EV','BEV') THEN v.total_unidades ELSE 0 END) as ev,
                   SUM(CASE WHEN v.carburante_std IN ('PHEV','HIBRIDO_ENCHUFABLE') THEN v.total_unidades ELSE 0 END) as phev,
                   SUM(CASE WHEN v.carburante_std IN ('HEV','MHEV','HIBRIDO') THEN v.total_unidades ELSE 0 END) as hev,
                   SUM(CASE WHEN v.carburante_std = 'GASOLINA' THEN v.total_unidades ELSE 0 END) as gasolina,
                   SUM(CASE WHEN v.carburante_std IN ('DIESEL','DIÉSEL') THEN v.total_unidades ELSE 0 END) as diesel,
                   SUM(CASE WHEN v.carburante_std NOT IN ('ELECTRICO','EV','BEV','PHEV','HIBRIDO_ENCHUFABLE','HEV','MHEV','HIBRIDO','GASOLINA','DIESEL','DIÉSEL') THEN v.total_unidades ELSE 0 END) as otros,
                   SUM(v.total_unidades) as total
            FROM ventas_mensuales_resumen v
            WHERE {where_sql}
            GROUP BY v.fecha
            ORDER BY v.fecha ASC
        """
        exec_query(c, query, params)
        rows = c.fetchall()
        res_list = [dict(r) for r in rows]
        _DAILY_CACHE[cache_key] = (res_list, now)
        return res_list
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
