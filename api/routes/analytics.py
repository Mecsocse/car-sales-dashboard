from fastapi import APIRouter, HTTPException, Query, Depends
import sqlite3
from typing import Optional, List
from datetime import datetime
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from config import DB_PATH
from api.routes.registrations import build_full_where

router = APIRouter()

FUEL_COLOR_MAP = {
    "ELECTRICO": "#0284c7",
    "EV": "#0284c7",
    "Eléctrico (BEV)": "#0284c7",
    "HIBRIDO": "#16a34a",
    "HEV": "#16a34a",
    "Híbrido (HEV)": "#16a34a",
    "PHEV": "#7c3aed",
    "Híbrido Enchufable": "#7c3aed",
    "GASOLINA": "#dc2626",
    "Gasolina": "#dc2626",
    "DIESEL": "#64748b",
    "Diésel": "#64748b",
    "GAS": "#d97706",
    "GLP (Autogás)": "#d97706"
}

def get_db():
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
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

@router.get("/ccaa/list")
def get_ccaa_list(conn: sqlite3.Connection = Depends(get_db)):
    c = conn.cursor()
    c.execute("SELECT DISTINCT ccaa FROM ventas_registradas WHERE ccaa IS NOT NULL AND ccaa != '' ORDER BY ccaa")
    return [r['ccaa'] for r in c.fetchall()]

@router.get("/brands/ranking")
def get_brand_ranking(
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
    limit: int = 10,
    conn: sqlite3.Connection = Depends(get_db)
):
    c = conn.cursor()
    target_month = month if month else ("2026-08" if period in ("month", "custom_month") else None)
    where_sql, params, _ = build_full_where(
        country, period, target_month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
    )

    query = f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca, 
               COALESCE(v.modelo_clean, v.modelo_raw) as modelo,
               SUM(v.unidades) as total
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo)
        LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        GROUP BY marca, modelo
    """
    c.execute(query, params)
    rows = c.fetchall()

    brand_models = {}
    brand_totals = {}

    for r in rows:
        b = r['marca']
        m = r['modelo']
        tot = r['total']
        if b not in brand_models:
            brand_models[b] = []
            brand_totals[b] = 0
        brand_models[b].append({"modelo": m, "total": tot})
        brand_totals[b] += tot

    sorted_brands = sorted(brand_totals.keys(), key=lambda b: brand_totals[b], reverse=True)[:limit]
    total_all = sum(brand_totals.values()) or 1

    result = []
    for b in sorted_brands:
        tot = brand_totals[b]
        mods = sorted(brand_models[b], key=lambda x: x['total'], reverse=True)

        result.append({
            "marca": b,
            "total": tot,
            "cuota": round((tot / total_all * 100), 1),
            "modelos": mods
        })

    return result

@router.get("/models/ranking")
def get_model_ranking(
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
    limit: int = 10,
    conn: sqlite3.Connection = Depends(get_db)
):
    c = conn.cursor()
    target_month = month if month else ("2026-08" if period in ("month", "custom_month") else None)
    where_sql, params, _ = build_full_where(
        country, period, target_month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
    )

    query = f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca, 
               COALESCE(v.modelo_clean, v.modelo_raw) as modelo,
               v.carburante_std as carburante,
               SUM(v.unidades) as total
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo)
        LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        GROUP BY marca, modelo, carburante
    """
    c.execute(query, params)
    rows = c.fetchall()

    model_totals = {}
    model_fuels = {}

    for r in rows:
        marca, mod, carb, units = r['marca'], r['modelo'], r['carburante'], r['total']
        key = (marca, mod)
        model_totals[key] = model_totals.get(key, 0) + units

        if key not in model_fuels:
            model_fuels[key] = {}
        model_fuels[key][carb] = model_fuels[key].get(carb, 0) + units

    sorted_keys = sorted(model_totals.keys(), key=lambda k: model_totals[k], reverse=True)[:limit]
    total_all = sum(model_totals.values()) or 1

    result = []
    for marca, mod in sorted_keys:
        tot = model_totals[(marca, mod)]
        fuels_dict = model_fuels[(marca, mod)]
        top_fuel = max(fuels_dict.keys(), key=lambda f: fuels_dict[f]) if fuels_dict else "GASOLINA"

        result.append({
            "marca": marca,
            "modelo": mod,
            "modelo_full": f"{marca} {mod}",
            "carburante": top_fuel,
            "color": FUEL_COLOR_MAP.get(top_fuel, "#16a34a"),
            "total": tot,
            "cuota": round((tot / total_all * 100), 1)
        })

    return result

@router.get("/fuel/mix")
def get_fuel_mix(
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
    c = conn.cursor()

    # Build a minimal WHERE clause directly without JOINs
    clauses = ["(v.pais_id = 'ESP' OR v.pais_id = 1)",
               "(v.tipo_vehiculo = 'TURISMO' OR v.tipo_vehiculo IS NULL)",
               "v.modelo_clean NOT LIKE 'CAMION%'"]
    params = []

    # Period / date filter
    if date_from:
        clauses.append("v.fecha >= ?"); params.append(date_from)
    if date_to:
        clauses.append("v.fecha <= ?"); params.append(date_to)
    if not date_from and not date_to:
        if period in ("month", "custom_month"):
            m_val = month if month else "2026-08"
            clauses.append("v.fecha LIKE ?"); params.append(f"{m_val}%")
        elif period == "year":
            y_val = year if year else "2026"
            clauses.append("v.fecha LIKE ?"); params.append(f"{y_val}%")
        elif period == "today":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas)")
        elif period == "yesterday":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas WHERE fecha < (SELECT MAX(fecha) FROM ventas_registradas))")
        elif period == "all":
            pass
        else:
            clauses.append("v.fecha LIKE ?"); params.append("2026-08%")

    if brand:
        clauses.append("v.marca_clean = ?"); params.append(brand)
    if model:
        clauses.append("(v.modelo_clean = ? OR v.modelo_raw = ?)"); params.extend([model, model])
    if ccaa:
        clauses.append("v.ccaa = ?"); params.append(ccaa)
    if province:
        clauses.append("v.provincia = ?"); params.append(province)

    where_sql = " AND ".join(clauses)

    # SQL CASE breakdown: GASOLINA, HÍBRIDO (HEV), HÍBRIDO ENCHUFABLE (PHEV), ELÉCTRICO (BEV), DIÉSEL
    query = f"""
        SELECT
            CASE
                WHEN v.carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                WHEN v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                WHEN v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO')
                     OR v.carburante_std LIKE '%HIBRID%'
                     OR v.carburante_std LIKE '%HYBRID%' THEN 'HÍBRIDO (HEV/MHEV)'
                WHEN v.carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                WHEN v.carburante_std IN ('GAS', 'GLP', 'GNC') THEN 'GAS (GLP/GNC)'
                ELSE 'GASOLINA'
            END as grupo,
            SUM(v.unidades) as total
        FROM ventas_registradas v
        WHERE {where_sql}
        GROUP BY grupo
        ORDER BY total DESC
    """
    c.execute(query, params)
    rows = c.fetchall()

    FUEL_COLORS = {
        "GASOLINA":                 "#dc2626", # red
        "HÍBRIDO (HEV/MHEV)":       "#16a34a", # green
        "HÍBRIDO ENCHUFABLE (PHEV)": "#7c3aed", # purple
        "ELÉCTRICO (BEV)":          "#0284c7", # cyan/blue
        "DIÉSEL":                   "#64748b", # slate
        "GAS (GLP/GNC)":            "#d97706"  # amber
    }

    total_all = sum(r['total'] for r in rows) or 1
    return [{
        "carburante": r['grupo'],
        "nombre": r['grupo'],
        "total": r['total'],
        "color": FUEL_COLORS.get(r['grupo'], "#64748b"),
        "porcentaje": round((r['total'] / total_all * 100), 1)
    } for r in rows]

@router.get("/analytics/compare-months")
def compare_months(
    month_a: str = "2026-08",
    month_b: str = "2026-07",
    brand: Optional[str] = None,
    ccaa: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    c = conn.cursor()
    where_a, params_a, _ = build_full_where(month=month_a, brand=brand, ccaa=ccaa, conn=conn)
    query_mix = f"""
        SELECT v.carburante_std as carburante, SUM(v.unidades) as total
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        WHERE {where_a}
        GROUP BY carburante
    """
    c.execute(query_mix, params_a)
    rows_a = {r['carburante']: r['total'] for r in c.fetchall()}

    where_b, params_b, _ = build_full_where(month=month_b, brand=brand, ccaa=ccaa, conn=conn)
    c.execute(query_mix, params_b)
    rows_b = {r['carburante']: r['total'] for r in c.fetchall()}

    total_a = sum(rows_a.values()) or 1
    total_b = sum(rows_b.values()) or 1

    all_fuels = sorted(list(set(list(rows_a.keys()) + list(rows_b.keys()))))
    
    fuel_comparison = []
    for f in all_fuels:
        cnt_a = rows_a.get(f, 0)
        cnt_b = rows_b.get(f, 0)
        pct_a = round((cnt_a / total_a * 100), 1)
        pct_b = round((cnt_b / total_b * 100), 1)
        diff_pp = round(pct_a - pct_b, 1)

        fuel_comparison.append({
            "carburante": f,
            "color": FUEL_COLOR_MAP.get(f, "#2563eb"),
            "units_a": cnt_a,
            "pct_a": pct_a,
            "units_b": cnt_b,
            "pct_b": pct_b,
            "diff_pp": diff_pp
        })

    vol_diff_pct = round(((total_a - total_b) / total_b * 100), 1) if total_b > 0 else 0.0

    return {
        "month_a": month_a,
        "month_b": month_b,
        "total_a": total_a,
        "total_b": total_b,
        "vol_diff_pct": vol_diff_pct,
        "fuel_comparison": fuel_comparison
    }

@router.get("/analytics/monthly-evolution")
def get_monthly_evolution(year: str = "2026", ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    c = conn.cursor()
    where_ccaa = " AND ccaa = ?" if ccaa else ""
    params = [f"{year}%", ccaa] if ccaa else [f"{year}%"]

    c.execute(f"""
        SELECT substr(fecha, 6, 2) as mes_num, SUM(unidades) as total
        FROM ventas_registradas
        WHERE fecha LIKE ? AND (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL) AND modelo_clean NOT LIKE 'CAMION%' {where_ccaa}
        GROUP BY mes_num
        ORDER BY mes_num ASC
    """, params)
    rows = {r['mes_num']: r['total'] for r in c.fetchall()}

    meses_nombres = [
        ("01", "ENE"), ("02", "FEB"), ("03", "MAR"), ("04", "ABR"),
        ("05", "MAY"), ("06", "JUN"), ("07", "JUL"), ("08", "AGO"),
        ("09", "SEP"), ("10", "OCT"), ("11", "NOV"), ("12", "DIC")
    ]

    return [{
        "mes_code": code,
        "mes_nombre": nombre,
        "total": rows.get(code, 0)
    } for code, nombre in meses_nombres]

@router.get("/analytics/multiyear-ev-quota")
def get_multiyear_ev_quota(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly EV quota % across years (2024, 2025, 2026) for line charts."""
    c = conn.cursor()
    where_ccaa = " AND ccaa = ?" if ccaa else ""
    params = [ccaa] if ccaa else []

    c.execute(f"""
        SELECT 
            substr(fecha, 1, 4) as y,
            substr(fecha, 6, 2) as m,
            SUM(CASE WHEN carburante_std IN ('ELECTRICO','EV','BEV') THEN unidades ELSE 0 END) as ev_units,
            SUM(unidades) as total_units
        FROM ventas_registradas
        WHERE (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL)
          AND modelo_clean NOT LIKE 'CAMION%'
          AND fecha >= '2024-01-01' {where_ccaa}
        GROUP BY y, m
        ORDER BY y, m
    """, params)
    rows = c.fetchall()

    # Structure data by year
    years_data = {}
    for r in rows:
        y, m, ev_u, tot_u = r['y'], r['m'], r['ev_units'], r['total_units']
        if y not in years_data:
            years_data[y] = {}
        pct = round((ev_u / tot_u * 100), 1) if tot_u > 0 else 0.0
        years_data[y][m] = {"quota": pct, "ev_units": ev_u, "total_units": tot_u}

    return years_data

@router.get("/analytics/multiyear-ev-cumulative")
def get_multiyear_ev_cumulative(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly cumulative EV sales units across years (2024, 2025, 2026)."""
    c = conn.cursor()
    where_ccaa = " AND ccaa = ?" if ccaa else ""
    params = [ccaa] if ccaa else []

    c.execute(f"""
        SELECT 
            substr(fecha, 1, 4) as y,
            substr(fecha, 6, 2) as m,
            SUM(unidades) as ev_units
        FROM ventas_registradas
        WHERE (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL)
          AND modelo_clean NOT LIKE 'CAMION%'
          AND carburante_std IN ('ELECTRICO','EV','BEV')
          AND fecha >= '2024-01-01' {where_ccaa}
        GROUP BY y, m
        ORDER BY y, m
    """, params)
    rows = c.fetchall()

    years_cumulative = {}
    for r in rows:
        y, m, ev_u = r['y'], r['m'], r['ev_units']
        if y not in years_cumulative:
            years_cumulative[y] = {}
        years_cumulative[y][m] = ev_u

    # Calculate running sum per year
    result = {}
    for y, months in years_cumulative.items():
        result[y] = {}
        running_total = 0
        for m_code in ["01","02","03","04","05","06","07","08","09","10","11","12"]:
            if m_code in months:
                running_total += months[m_code]
                result[y][m_code] = running_total

    return result

@router.get("/analytics/monthly-tech-quota")
def get_monthly_tech_quota(year: str = "2026", ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly market share quota % for all propulsion technologies in a selected year."""
    c = conn.cursor()
    where_ccaa = " AND ccaa = ?" if ccaa else ""
    params = [f"{year}%", ccaa] if ccaa else [f"{year}%"]

    c.execute(f"""
        SELECT 
            substr(fecha, 6, 2) as m,
            CASE
                WHEN carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                WHEN carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                WHEN carburante_std IN ('HEV', 'MHEV', 'HIBRIDO') OR carburante_std LIKE '%HIBRID%' OR carburante_std LIKE '%HYBRID%' THEN 'HÍBRIDO (HEV/MHEV)'
                WHEN carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                ELSE 'GASOLINA'
            END as tech,
            SUM(unidades) as units
        FROM ventas_registradas
        WHERE fecha LIKE ? AND (tipo_vehiculo = 'TURISMO' OR tipo_vehiculo IS NULL) AND modelo_clean NOT LIKE 'CAMION%' {where_ccaa}
        GROUP BY m, tech
        ORDER BY m, units DESC
    """, params)
    rows = c.fetchall()

    month_tech_totals = {}
    month_totals = {}
    for r in rows:
        m, tech, u = r['m'], r['tech'], r['units']
        if m not in month_tech_totals:
            month_tech_totals[m] = {}
            month_totals[m] = 0
        month_tech_totals[m][tech] = u
        month_totals[m] += u

    # Build % breakdown per month
    result = {}
    for m, techs in month_tech_totals.items():
        tot = month_totals[m] or 1
        result[m] = {tech: round((units / tot * 100), 1) for tech, units in techs.items()}

    return result

@router.get("/analytics/monthly-matrix")
def get_monthly_matrix(
    year: str = "2026", 
    limit: int = 50,
    search: Optional[str] = None,
    ccaa: Optional[str] = None,
    sort_by: str = "ago",
    sort_dir: str = "desc",
    conn: sqlite3.Connection = Depends(get_db)
):
    c = conn.cursor()
    where_extra = ""
    params = [f"{year}%"]

    if search:
        where_extra += " AND (v.marca_clean LIKE ? OR v.modelo_clean LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if ccaa:
        where_extra += " AND v.ccaa = ?"
        params.append(ccaa)

    valid_sorts = {
        "ene": "ene", "feb": "feb", "mar": "mar", "abr": "abr",
        "may": "may", "jun": "jun", "jul": "jul", "ago": "ago",
        "sep": "sep", "oct": "oct", "nov": "nov", "dic": "dic",
        "total_2026": "total_2026", "modelo": "modelo_full", "rank": "ago"
    }
    order_col = valid_sorts.get(sort_by.lower(), "ago")
    order_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    query = f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca,
               COALESCE(v.modelo_clean, v.modelo_raw) as modelo,
               COALESCE(m.nombre, v.marca_clean, v.marca_raw) || ' ' || COALESCE(v.modelo_clean, v.modelo_raw) as modelo_full,
               SUM(CASE WHEN fecha LIKE '{year}-01%' THEN unidades ELSE 0 END) as ene,
               SUM(CASE WHEN fecha LIKE '{year}-02%' THEN unidades ELSE 0 END) as feb,
               SUM(CASE WHEN fecha LIKE '{year}-03%' THEN unidades ELSE 0 END) as mar,
               SUM(CASE WHEN fecha LIKE '{year}-04%' THEN unidades ELSE 0 END) as abr,
               SUM(CASE WHEN fecha LIKE '{year}-05%' THEN unidades ELSE 0 END) as may,
               SUM(CASE WHEN fecha LIKE '{year}-06%' THEN unidades ELSE 0 END) as jun,
               SUM(CASE WHEN fecha LIKE '{year}-07%' THEN unidades ELSE 0 END) as jul,
               SUM(CASE WHEN fecha LIKE '{year}-08%' THEN unidades ELSE 0 END) as ago,
               SUM(CASE WHEN fecha LIKE '{year}-09%' THEN unidades ELSE 0 END) as sep,
               SUM(CASE WHEN fecha LIKE '{year}-10%' THEN unidades ELSE 0 END) as oct,
               SUM(CASE WHEN fecha LIKE '{year}-11%' THEN unidades ELSE 0 END) as nov,
               SUM(CASE WHEN fecha LIKE '{year}-12%' THEN unidades ELSE 0 END) as dic,
               SUM(unidades) as total_2026
        FROM ventas_registradas v
        LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre)
        WHERE v.fecha LIKE ? AND (v.tipo_vehiculo = 'TURISMO' OR v.tipo_vehiculo IS NULL) AND v.modelo_clean NOT LIKE 'CAMION%' {where_extra}
        GROUP BY marca, modelo
        ORDER BY {order_col} {order_direction}
        LIMIT ?
    """
    params.append(limit)
    c.execute(query, params)
    rows = c.fetchall()

    return [{
        "rank": idx + 1,
        "marca": r['marca'],
        "modelo": r['modelo'],
        "modelo_full": f"{r['marca']} {r['modelo']}",
        "ene": r['ene'], "feb": r['feb'], "mar": r['mar'], "abr": r['abr'],
        "may": r['may'], "jun": r['jun'], "jul": r['jul'], "ago": r['ago'],
        "sep": r['sep'], "oct": r['oct'], "nov": r['nov'], "dic": r['dic'],
        "total_2026": r['total_2026']
    } for idx, r in enumerate(rows)]

@router.get("/provinces/ranking")
def get_province_ranking(conn: sqlite3.Connection = Depends(get_db)):
    return []

@router.get("/brands/list")
def get_brands_list(conn: sqlite3.Connection = Depends(get_db)):
    c = conn.cursor()
    c.execute("SELECT DISTINCT COALESCE(marca_clean, marca_raw) as nombre FROM ventas_registradas WHERE marca_clean IS NOT NULL ORDER BY nombre")
    return [r['nombre'] for r in c.fetchall() if r['nombre']]

@router.get("/models/list")
def get_models_list(brand: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    c = conn.cursor()
    if brand:
        c.execute("""
            SELECT DISTINCT COALESCE(modelo_clean, modelo_raw) as modelo
            FROM ventas_registradas
            WHERE COALESCE(marca_clean, marca_raw) = ?
            ORDER BY modelo
        """, (brand,))
    else:
        c.execute("SELECT DISTINCT COALESCE(modelo_clean, modelo_raw) as modelo FROM ventas_registradas ORDER BY modelo")
    return [r['modelo'] for r in c.fetchall() if r['modelo']]

@router.get("/fuel/list")
def get_fuel_list(conn: sqlite3.Connection = Depends(get_db)):
    return ["Gasolina", "Diésel", "Eléctrico (BEV)", "Híbrido (HEV)", "Híbrido Enchufable", "GLP (Autogás)", "Gas Natural (GNC)"]

@router.get("/provinces/list")
def get_provinces_list(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    c = conn.cursor()
    if ccaa:
        c.execute("SELECT DISTINCT provincia FROM ventas_registradas WHERE ccaa = ? AND provincia IS NOT NULL AND provincia != '' ORDER BY provincia", (ccaa,))
    else:
        c.execute("SELECT DISTINCT provincia FROM ventas_registradas WHERE provincia IS NOT NULL AND provincia != '' ORDER BY provincia")
    return [r['provincia'] for r in c.fetchall()]

@router.get("/insights")
def get_insights(
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
    c = conn.cursor()
    target_month = month if month else ("2026-08" if period in ("month", "custom_month") else None)
    where_sql, params, _ = build_full_where(
        country, period, target_month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn
    )

    c.execute(f"SELECT SUM(v.unidades) as total FROM ventas_registradas v LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre) LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo) LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre) WHERE {where_sql}", params)
    row = c.fetchone()
    total_units = row['total'] or 0

    if total_units == 0:
        return {
            "insight_text": "No hay matriculaciones registradas para la selección actual.",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    c.execute(f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca, SUM(v.unidades) as total
        FROM ventas_registradas v LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre) LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo) LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        GROUP BY marca ORDER BY total DESC LIMIT 1
    """, params)
    top_b = c.fetchone()
    top_brand = top_b['marca'] if top_b else "N/A"

    c.execute(f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) || ' ' || COALESCE(v.modelo_clean, v.modelo_raw) as modelo_full, SUM(v.unidades) as total
        FROM ventas_registradas v LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre) LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo) LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        GROUP BY modelo_full ORDER BY total DESC LIMIT 1
    """, params)
    top_m = c.fetchone()
    top_model = top_m['modelo_full'] if top_m else "N/A"

    ccaa_str = f" en {ccaa}" if ccaa else ""
    text = f"En el periodo activo{ccaa_str} se registran {total_units:,} unidades. La marca número 1 es {top_brand} y el modelo líder es {top_model}."

    return {
        "insight_text": text,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
