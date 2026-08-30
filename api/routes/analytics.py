from fastapi import APIRouter, HTTPException, Query, Depends
import sqlite3
from typing import Optional, List, Any, Dict
from datetime import datetime
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from config import DB_PATH
from api.routes.registrations import build_full_where, exec_query

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

_ALL_DATA_CACHE = {}

from api.db import get_db

_LIST_CACHE = {}

@router.get("/ccaa/list")
def get_ccaa_list(conn: sqlite3.Connection = Depends(get_db)):
    if "ccaa_list" in _LIST_CACHE:
        return _LIST_CACHE["ccaa_list"]
    c = conn.cursor()
    tbl = "ventas_mensuales_resumen" if os.environ.get("DATABASE_URL") else "ventas_registradas"
    exec_query(c, f"SELECT DISTINCT ccaa FROM {tbl} WHERE ccaa IS NOT NULL AND ccaa != '' AND LOWER(ccaa) NOT IN ('es toda españa', 'toda españa', 'todas') ORDER BY ccaa")
    res = [r['ccaa'] for r in c.fetchall()]
    if not res or len(res) < 5:
        res = [
            "Andalucía", "Aragón", "Asturias", "Canarias", "Cantabria",
            "Castilla-La Mancha", "Castilla y León", "Cataluña", "Ceuta",
            "Comunidad de Madrid", "Comunidad Valenciana", "Extremadura",
            "Galicia", "Illes Balears", "La Rioja", "Melilla", "Navarra", "País Vasco"
        ]
    _LIST_CACHE["ccaa_list"] = res
    return res

_RANKING_CACHE = {}

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
    import time
    cache_key = f"brands:{country}:{period}:{month}:{year}:{brand}:{model}:{fuel}:{province}:{ccaa}:{date_from}:{date_to}:{limit}"
    now = time.time()
    if cache_key in _RANKING_CACHE:
        val, ts = _RANKING_CACHE[cache_key]
        if now - ts < 86400:
            return val

    c = conn.cursor()
    target_m = month if month else ("2026-08" if period in ("month", "custom_month") else "2026-08")
    target_y = year if year else "2026"

    where_cond = "UPPER(v.marca_clean) != 'DESCONOCIDO' AND v.marca_clean IS NOT NULL"
    res_params = []
    if date_from and date_to:
        where_cond += " AND v.fecha >= ? AND v.fecha <= ?"
        res_params.extend([date_from, date_to])
    elif period == 'year':
        where_cond += " AND v.anio_str = ?"
        res_params.append(target_y)
    else:
        where_cond += " AND v.mes_str = ?"
        res_params.append(target_m)

    if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
        where_cond += " AND LOWER(v.ccaa) = LOWER(?)"
        res_params.append(ccaa.strip())

    if fuel:
        if fuel in ('EV', 'Eléctrico (BEV)', 'Eléctrico', 'ELECTRICO'):
            where_cond += " AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
        elif fuel in ('PHEV', 'Híbrido Enchufable'):
            where_cond += " AND v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE')"
        elif fuel in ('HEV', 'Híbrido (HEV)', 'Híbrido', 'HIBRIDO'):
            where_cond += " AND v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO')"
        else:
            where_cond += " AND v.carburante_std = ?"
            res_params.append(fuel)

    query = f"""
        SELECT v.marca_clean as marca, 
               v.modelo_clean as modelo,
               SUM(v.total_unidades) as total
        FROM ventas_mensuales_resumen v
        WHERE {where_cond}
        GROUP BY marca, modelo
    """
    exec_query(c, query, res_params)
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

    _RANKING_CACHE[cache_key] = (result, now)
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
    import time
    cache_key = f"models:{country}:{period}:{month}:{year}:{brand}:{model}:{fuel}:{province}:{ccaa}:{date_from}:{date_to}:{limit}"
    now = time.time()
    if cache_key in _RANKING_CACHE:
        val, ts = _RANKING_CACHE[cache_key]
        if now - ts < 86400:
            return val

    c = conn.cursor()
    target_m = month if month else ("2026-08" if period in ("month", "custom_month") else "2026-08")
    target_y = year if year else "2026"

    where_cond = "UPPER(v.marca_clean) != 'DESCONOCIDO' AND UPPER(COALESCE(v.modelo_clean,'')) != 'DESCONOCIDO' AND v.marca_clean IS NOT NULL"
    res_params = []
    if date_from and date_to:
        where_cond += " AND v.fecha >= ? AND v.fecha <= ?"
        res_params.extend([date_from, date_to])
    elif period == 'year':
        where_cond += " AND v.anio_str = ?"
        res_params.append(target_y)
    else:
        where_cond += " AND v.mes_str = ?"
        res_params.append(target_m)

    if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
        where_cond += " AND LOWER(v.ccaa) = LOWER(?)"
        res_params.append(ccaa.strip())

    if fuel:
        if fuel in ('EV', 'Eléctrico (BEV)', 'Eléctrico', 'ELECTRICO'):
            where_cond += " AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
        elif fuel in ('PHEV', 'Híbrido Enchufable'):
            where_cond += " AND v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE')"
        elif fuel in ('HEV', 'Híbrido (HEV)', 'Híbrido', 'HIBRIDO'):
            where_cond += " AND v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO')"
        else:
            where_cond += " AND v.carburante_std = ?"
            res_params.append(fuel)

    query = f"""
        SELECT v.marca_clean as marca, 
               v.modelo_clean as modelo,
               v.modelo_full as modelo_full,
               v.carburante_std as carburante,
               SUM(v.total_unidades) as total
        FROM ventas_mensuales_resumen v
        WHERE {where_cond}
        GROUP BY marca, modelo, modelo_full, carburante
    """
    exec_query(c, query, res_params)
    rows = c.fetchall()

    model_totals = {}
    model_fuels = {}
    model_full_names = {}

    for r in rows:
        marca, mod, mod_full, carb, units = r['marca'], r['modelo'], r['modelo_full'], r['carburante'], r['total']
        key = (marca, mod)
        model_totals[key] = model_totals.get(key, 0) + units
        model_full_names[key] = mod_full

        if key not in model_fuels:
            model_fuels[key] = {}
        model_fuels[key][carb] = model_fuels[key].get(carb, 0) + units

    sorted_keys = sorted(model_totals.keys(), key=lambda k: model_totals[k], reverse=True)[:limit]
    total_all = sum(model_totals.values()) or 1

    result = []
    for marca, mod in sorted_keys:
        tot = model_totals[(marca, mod)]
        f_breakdown = model_fuels[(marca, mod)]
        mod_full = model_full_names.get((marca, mod), f"{marca} {mod}")

        result.append({
            "marca": marca,
            "modelo": mod,
            "modelo_full": mod_full,
            "total": tot,
            "cuota": round((tot / total_all * 100), 1),
            "carburantes": f_breakdown
        })

    _RANKING_CACHE[cache_key] = (result, now)
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
               "v.modelo_clean NOT LIKE 'CAMION%'",
               "(v.es_nuevo = 1 OR v.es_nuevo IS NULL)"]
    params = []

    # Period / date filter using indexed B-Tree date ranges
    if date_from:
        clauses.append("v.fecha >= ?"); params.append(date_from)
    if date_to:
        clauses.append("v.fecha <= ?"); params.append(date_to)
    if not date_from and not date_to:
        if period in ("month", "custom_month"):
            m_val = month if month else "2026-08"
            if len(m_val) == 7:
                import calendar
                y, m = int(m_val[:4]), int(m_val[5:7])
                last_d = calendar.monthrange(y, m)[1]
                clauses.append("v.fecha >= ? AND v.fecha <= ?")
                params.extend([f"{m_val}-01", f"{m_val}-{last_d:02d}"])
            else:
                clauses.append("v.fecha >= ? AND v.fecha <= ?")
                params.extend(["2026-08-01", "2026-08-31"])
        elif period == "year":
            y_val = year if year else "2026"
            clauses.append("v.fecha >= ? AND v.fecha <= ?")
            params.extend([f"{y_val}-01-01", f"{y_val}-12-31"])
        elif period == "today":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas)")
        elif period == "yesterday":
            clauses.append("v.fecha = (SELECT MAX(fecha) FROM ventas_registradas WHERE fecha < (SELECT MAX(fecha) FROM ventas_registradas))")
        elif period == "all":
            pass
        else:
            clauses.append("v.fecha >= ? AND v.fecha <= ?")
            params.extend(["2026-08-01", "2026-08-31"])

    if brand:
        clauses.append("v.marca_clean = ?"); params.append(brand)
    if model:
        clauses.append("(v.modelo_clean = ? OR v.modelo_raw = ?)"); params.extend([model, model])
    if ccaa:
        clauses.append("v.ccaa = ?"); params.append(ccaa)
    if province:
        clauses.append("v.provincia = ?"); params.append(province)

    if os.environ.get("DATABASE_URL"):
        w_res = "1=1"
        p_res = []
        if date_from and date_to:
            w_res += " AND v.fecha >= ? AND v.fecha <= ?"
            p_res.extend([date_from, date_to])
        elif period == "year":
            w_res += " AND v.anio_str = ?"
            p_res.append(year if year else "2026")
        else:
            w_res += " AND v.mes_str = ?"
            p_res.append(month if month else "2026-08")
        if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
            w_res += " AND LOWER(v.ccaa) = LOWER(?)"
            p_res.append(ccaa.strip())
        if brand:
            w_res += " AND v.marca_clean = ?"
            p_res.append(brand)

        query = f"""
            SELECT
                CASE
                    WHEN v.carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                    WHEN v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                    WHEN v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'HÍBRIDO (HEV/MHEV)'
                    WHEN v.carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                    WHEN v.carburante_std IN ('GAS', 'GLP', 'GNC') THEN 'GAS (GLP/GNC)'
                    ELSE 'GASOLINA'
                END as grupo,
                SUM(v.total_unidades) as total
            FROM ventas_mensuales_resumen v
            WHERE {w_res}
            GROUP BY grupo
            ORDER BY total DESC
        """
        exec_query(c, query, p_res)
        rows = c.fetchall()
    else:
        where_sql = " AND ".join(clauses)

        query = f"""
            SELECT
                CASE
                    WHEN v.carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                    WHEN v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                    WHEN v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'HÍBRIDO (HEV/MHEV)'
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
        exec_query(c, query, params)
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
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""
    where_brand = " AND marca_clean = ?" if brand and brand.strip() else ""
    
    params_a = [month_a]
    if where_ccaa: params_a.append(ccaa.strip())
    if where_brand: params_a.append(brand.strip())
    
    exec_query(c, f"""
        SELECT carburante_std as carburante, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE mes_str = ? {where_ccaa} {where_brand}
        GROUP BY carburante
    """, params_a)
    rows_a = {r['carburante']: r['total'] for r in c.fetchall()}

    params_b = [month_b]
    if where_ccaa: params_b.append(ccaa.strip())
    if where_brand: params_b.append(brand.strip())
    
    exec_query(c, f"""
        SELECT carburante_std as carburante, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE mes_str = ? {where_ccaa} {where_brand}
        GROUP BY carburante
    """, params_b)
    rows_b = {r['carburante']: r['total'] for r in c.fetchall()}

    total_a = sum(rows_a.values()) or 0
    total_b = sum(rows_b.values()) or 0

    all_fuels = sorted(list(set(list(rows_a.keys()) + list(rows_b.keys()))))
    
    fuel_comparison = []
    for f in all_fuels:
        cnt_a = rows_a.get(f, 0)
        cnt_b = rows_b.get(f, 0)
        pct_a = round((cnt_a / (total_a or 1) * 100), 1) if total_a > 0 else 0.0
        pct_b = round((cnt_b / (total_b or 1) * 100), 1) if total_b > 0 else 0.0
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

_TRENDS_CACHE = {}

@router.get("/analytics/monthly-evolution")
def get_monthly_evolution(year: str = "2026", ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    import time
    cache_key = f"evol:{year}:{ccaa}"
    now = time.time()
    if year != "2024" and cache_key in _TRENDS_CACHE:
        val, ts = _TRENDS_CACHE[cache_key]
        if now - ts < 120:
            return val
    c = conn.cursor()
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""
    params = [year, ccaa.strip()] if where_ccaa else [year]

    exec_query(c, f"""
        SELECT substr(mes_str, 6, 2) as mes_num, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE anio_str = ? {where_ccaa}
        GROUP BY mes_num
        ORDER BY mes_num ASC
    """, params)
    rows = {r['mes_num']: r['total'] for r in c.fetchall()}

    meses_nombres = [
        ("01", "ENE"), ("02", "FEB"), ("03", "MAR"), ("04", "ABR"),
        ("05", "MAY"), ("06", "JUN"), ("07", "JUL"), ("08", "AGO"),
        ("09", "SEP"), ("10", "OCT"), ("11", "NOV"), ("12", "DIC")
    ]

    res = [{
        "mes_code": code,
        "mes_nombre": nombre,
        "total": rows.get(code, 0)
    } for code, nombre in meses_nombres]
    _TRENDS_CACHE[cache_key] = (res, now)
    return res

@router.get("/analytics/multiyear-ev-quota")
def get_multiyear_ev_quota(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly EV quota % across years (2024, 2025, 2026) for line charts."""
    import time
    cache_key = f"ev_quota:{ccaa}"
    now = time.time()
    if cache_key in _TRENDS_CACHE:
        val, ts = _TRENDS_CACHE[cache_key]
        if now - ts < 120:
            return val
    c = conn.cursor()
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""
    params = [ccaa.strip()] if where_ccaa else []

    exec_query(c, f"""
        SELECT 
            anio_str as y,
            substr(mes_str, 6, 2) as m,
            SUM(CASE WHEN carburante_std IN ('ELECTRICO','EV','BEV') THEN total_unidades ELSE 0 END) as ev_units,
            SUM(total_unidades) as total_units
        FROM ventas_mensuales_resumen
        WHERE anio_str >= '2024' {where_ccaa}
        GROUP BY y, m
        ORDER BY y, m
    """, params)
    rows = c.fetchall()

    years_data = {}
    for r in rows:
        y, m, ev_u, tot_u = r['y'], r['m'], r['ev_units'], r['total_units']
        if y not in years_data:
            years_data[y] = {}
        pct = round((ev_u / tot_u * 100), 1) if tot_u > 0 else 0.0
        years_data[y][m] = {"quota": pct, "ev_units": ev_u, "total_units": tot_u}

    _TRENDS_CACHE[cache_key] = (years_data, now)
    return years_data

@router.get("/analytics/multiyear-ev-cumulative")
def get_multiyear_ev_cumulative(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly cumulative EV sales units across years (2024, 2025, 2026)."""
    import time
    cache_key = f"ev_cum:{ccaa}"
    now = time.time()
    if cache_key in _TRENDS_CACHE:
        val, ts = _TRENDS_CACHE[cache_key]
        if now - ts < 120:
            return val
    c = conn.cursor()
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""
    params = [ccaa.strip()] if where_ccaa else []

    exec_query(c, f"""
        SELECT 
            anio_str as y,
            substr(mes_str, 6, 2) as m,
            SUM(total_unidades) as ev_units
        FROM ventas_mensuales_resumen
        WHERE carburante_std IN ('ELECTRICO','EV','BEV')
          AND anio_str >= '2024' {where_ccaa}
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

    result = {}
    for y, months in years_cumulative.items():
        result[y] = {}
        running_total = 0
        for m_code in ["01","02","03","04","05","06","07","08","09","10","11","12"]:
            if m_code in months:
                running_total += months[m_code]
                result[y][m_code] = running_total

    _TRENDS_CACHE[cache_key] = (result, now)
    return result

@router.get("/analytics/monthly-tech-quota")
def get_monthly_tech_quota(year: str = "2026", ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Returns monthly market share quota % for all propulsion technologies in a selected year."""
    import time
    cache_key = f"tech_quota:{year}:{ccaa}"
    now = time.time()
    if cache_key in _TRENDS_CACHE:
        val, ts = _TRENDS_CACHE[cache_key]
        if now - ts < 120:
            return val
    c = conn.cursor()
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""
    params = [year, ccaa.strip()] if where_ccaa else [year]

    exec_query(c, f"""
        SELECT 
            substr(mes_str, 6, 2) as m,
            CASE
                WHEN carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                WHEN carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                WHEN carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'HÍBRIDO (HEV/MHEV)'
                WHEN carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                ELSE 'GASOLINA'
            END as tech,
            SUM(total_unidades) as units
        FROM ventas_mensuales_resumen
        WHERE anio_str = ? {where_ccaa}
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

    result = {}
    for m, techs in month_tech_totals.items():
        tot = month_totals[m] or 1
        result[m] = {tech: round((units / tot * 100), 1) for tech, units in techs.items()}

    _TRENDS_CACHE[cache_key] = (result, now)
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
    params = [year]

    if search:
        where_extra += " AND (v.marca_clean LIKE ? OR v.modelo_clean LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
        where_extra += " AND LOWER(v.ccaa) = LOWER(?)"
        params.append(ccaa.strip())

    valid_sorts = {
        "ene": "ene", "feb": "feb", "mar": "mar", "abr": "abr",
        "may": "may", "jun": "jun", "jul": "jul", "ago": "ago",
        "sep": "sep", "oct": "oct", "nov": "nov", "dic": "dic",
        "total_2026": "total_2026", "modelo": "modelo_full", "rank": "ago"
    }
    order_col = valid_sorts.get(sort_by.lower(), "ago")
    order_direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    query = f"""
        SELECT 
            v.marca_clean as marca,
            v.modelo_clean as modelo,
            v.modelo_full as modelo_full,
            SUM(CASE WHEN mes_str = '{year}-01' THEN total_unidades ELSE 0 END) as ene,
            SUM(CASE WHEN mes_str = '{year}-02' THEN total_unidades ELSE 0 END) as feb,
            SUM(CASE WHEN mes_str = '{year}-03' THEN total_unidades ELSE 0 END) as mar,
            SUM(CASE WHEN mes_str = '{year}-04' THEN total_unidades ELSE 0 END) as abr,
            SUM(CASE WHEN mes_str = '{year}-05' THEN total_unidades ELSE 0 END) as may,
            SUM(CASE WHEN mes_str = '{year}-06' THEN total_unidades ELSE 0 END) as jun,
            SUM(CASE WHEN mes_str = '{year}-07' THEN total_unidades ELSE 0 END) as jul,
            SUM(CASE WHEN mes_str = '{year}-08' THEN total_unidades ELSE 0 END) as ago,
            SUM(CASE WHEN mes_str = '{year}-09' THEN total_unidades ELSE 0 END) as sep,
            SUM(CASE WHEN mes_str = '{year}-10' THEN total_unidades ELSE 0 END) as oct,
            SUM(CASE WHEN mes_str = '{year}-11' THEN total_unidades ELSE 0 END) as nov,
            SUM(CASE WHEN mes_str = '{year}-12' THEN total_unidades ELSE 0 END) as dic,
            SUM(total_unidades) as total_2026
        FROM ventas_mensuales_resumen v
        WHERE anio_str = ? {where_extra}
        GROUP BY marca, modelo, modelo_full
        ORDER BY {order_col} {order_direction}
        LIMIT ?
    """
    params.append(limit)
    exec_query(c, query, params)
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
def get_brands_list(limit: int = 100, conn: sqlite3.Connection = Depends(get_db)):
    cache_key = f"brands_list_clean_{limit}"
    if cache_key in _LIST_CACHE:
        return _LIST_CACHE[cache_key]
    c = conn.cursor()
    exec_query(c, """
        SELECT marca_clean as nombre, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE marca_clean IS NOT NULL
          AND marca_clean != ''
          AND UPPER(marca_clean) != 'DESCONOCIDO'
          AND marca_clean NOT LIKE '202%'
          AND UPPER(marca_clean) NOT LIKE '%CARROC%'
          AND UPPER(marca_clean) NOT LIKE '%VOLQUE%'
          AND UPPER(marca_clean) NOT LIKE '%REMOLQ%'
          AND UPPER(marca_clean) NOT LIKE '%CAYVOL%'
          AND UPPER(marca_clean) NOT LIKE '%SEMITRAILER%'
          AND UPPER(marca_clean) NOT LIKE 'VOLKSWAGEN %'
          AND UPPER(marca_clean) NOT LIKE 'SEAT %'
          AND UPPER(marca_clean) NOT LIKE 'RENAULT %'
        GROUP BY marca_clean
        ORDER BY total DESC
        LIMIT ?
    """, (limit,))
    rows = c.fetchall()
    
    def _val(r, col_name, idx=0):
        if isinstance(r, dict):
            return r.get(col_name)
        if hasattr(r, 'keys') and col_name in r.keys():
            return r[col_name]
        return r[idx] if len(r) > idx else None

    # Sort the top selling brands alphabetically for clean UX in dropdowns
    names = sorted([_val(r, 'nombre', 0) for r in rows if _val(r, 'nombre', 0)])
    _LIST_CACHE[cache_key] = names
    return names

@router.get("/models/list")
def get_models_list(brand: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    key = f"models:{brand}"
    if key in _LIST_CACHE:
        return _LIST_CACHE[key]
    c = conn.cursor()
    if brand:
        exec_query(c, """
            SELECT DISTINCT COALESCE(modelo_clean, modelo_raw) as modelo
            FROM ventas_registradas
            WHERE COALESCE(marca_clean, marca_raw) = ?
            ORDER BY modelo
        """, (brand,))
    else:
        exec_query(c, "SELECT COALESCE(modelo_clean, modelo_raw) as modelo FROM ventas_registradas WHERE fecha >= '2026-01-01' GROUP BY modelo ORDER BY SUM(unidades) DESC LIMIT 200")
    res = [r['modelo'] for r in c.fetchall() if r['modelo']]
    _LIST_CACHE[key] = res
    return res

@router.get("/fuel/list")
def get_fuel_list(conn: sqlite3.Connection = Depends(get_db)):
    return ["Gasolina", "Diésel", "Eléctrico (BEV)", "Híbrido (HEV)", "Híbrido Enchufable", "GLP (Autogás)", "Gas Natural (GNC)"]

@router.get("/provinces/list")
def get_provinces_list(ccaa: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    key = f"provinces:{ccaa}"
    if key in _LIST_CACHE:
        return _LIST_CACHE[key]
    c = conn.cursor()
    if ccaa:
        exec_query(c, "SELECT DISTINCT provincia FROM ventas_registradas WHERE ccaa = ? AND provincia IS NOT NULL AND provincia != '' ORDER BY provincia", (ccaa,))
    else:
        exec_query(c, "SELECT DISTINCT provincia FROM ventas_registradas WHERE provincia IS NOT NULL AND provincia != '' ORDER BY provincia")
    res = [r['provincia'] for r in c.fetchall()]
    _LIST_CACHE[key] = res
    return res

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

    exec_query(c, f"SELECT SUM(v.unidades) as total FROM ventas_registradas v LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre) LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo) LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre) WHERE {where_sql}", params)
    row = c.fetchone()
    total_units = row['total'] or 0

    if total_units == 0:
        return {
            "insight_text": "No hay matriculaciones registradas para la selección actual.",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    exec_query(c, f"""
        SELECT COALESCE(m.nombre, v.marca_clean, v.marca_raw) as marca, SUM(v.unidades) as total
        FROM ventas_registradas v LEFT JOIN marcas m ON (v.marca_id = m.id OR v.marca_clean = m.nombre) LEFT JOIN carburantes c ON (v.carburante_id = c.id OR v.carburante_std = c.codigo) LEFT JOIN provincias p ON (v.provincia_id = p.id OR v.provincia = p.nombre)
        WHERE {where_sql}
        GROUP BY marca ORDER BY total DESC LIMIT 1
    """, params)
    top_b = c.fetchone()
    top_brand = top_b['marca'] if top_b else "N/A"

    exec_query(c, f"""
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

@router.get("/dashboard/all-data")
def get_dashboard_all_data(
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
    purge: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Consolidated 1-pass endpoint returning summary, top brands, top models, top EV, and fuel mix in a single fast query."""
    import time
    if purge == 1:
        _ALL_DATA_CACHE.clear()

    if date_from and len(date_from) >= 7:
        target_month = date_from[:7]
        target_year = date_from[:4]
    else:
        target_month = month if month else ("2026-08" if period in ("month", "custom_month") else "2026-08")
        target_year = year if year else "2026"

    cache_key = f"{country}:{period}:{target_month}:{target_year}:{brand}:{model}:{fuel}:{province}:{ccaa}:{date_from}:{date_to}"
    now = time.time()
    if cache_key in _ALL_DATA_CACHE and purge != 1:
        cached_res, ts = _ALL_DATA_CACHE[cache_key]
        if now - ts < 86400: # 24 hours in-memory RAM cache
            return cached_res

    # Fast-Path: Use Postgres RPC Function if available
    try:
        if os.environ.get("DATABASE_URL"):
            c = conn.cursor()
            exec_query(c, "SELECT get_dashboard_metrics(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                       [period, target_month, target_year, ccaa, province, brand, fuel, date_from, date_to])
            row = c.fetchone()
            if row:
                rpc_res = row['get_dashboard_metrics'] if isinstance(row, dict) and 'get_dashboard_metrics' in row else (row[0] if isinstance(row, (list, tuple)) else None)
                if rpc_res and isinstance(rpc_res, dict) and rpc_res.get('summary'):
                    if rpc_res.get('brands'):
                        rpc_res['brands'] = [b for b in rpc_res['brands'] if not str(b.get('marca', '')).startswith('202') and 'DESCONOCIDO' not in str(b.get('marca', '')).upper()]
                    if rpc_res.get('models'):
                        rpc_res['models'] = [m for m in rpc_res['models'] if not str(m.get('modelo', '')).startswith('202') and not str(m.get('marca', '')).startswith('202') and 'DESCONOCIDO' not in str(m.get('modelo_full', '')).upper()]
                    if rpc_res.get('ev_models'):
                        rpc_res['ev_models'] = [m for m in rpc_res['ev_models'] if not str(m.get('modelo', '')).startswith('202') and not str(m.get('marca', '')).startswith('202') and 'DESCONOCIDO' not in str(m.get('modelo_full', '')).upper()]
                    if rpc_res.get('ev_brands'):
                        rpc_res['ev_brands'] = [b for b in rpc_res['ev_brands'] if not str(b.get('marca', '')).startswith('202') and 'DESCONOCIDO' not in str(b.get('marca', '')).upper()]
                    if rpc_res.get('summary'):
                        if str(rpc_res['summary'].get('top_brand', '')).startswith('202') or 'DESCONOCIDO' in str(rpc_res['summary'].get('top_brand', '')).upper():
                            rpc_res['summary']['top_brand'] = rpc_res['brands'][0]['marca'] if rpc_res.get('brands') else "N/A"
                            rpc_res['summary']['top_brand_units'] = rpc_res['brands'][0]['total'] if rpc_res.get('brands') else 0
                        if str(rpc_res['summary'].get('top_model', '')).startswith('202') or 'DESCONOCIDO' in str(rpc_res['summary'].get('top_model', '')).upper():
                            rpc_res['summary']['top_model'] = rpc_res['models'][0]['modelo_full'] if rpc_res.get('models') else "N/A"
                            rpc_res['summary']['top_model_units'] = rpc_res['models'][0]['total'] if rpc_res.get('models') else 0
                    
                    _ALL_DATA_CACHE[cache_key] = (rpc_res, now)
                    return rpc_res
    except Exception as err:
        print("RPC fallback to standard query:", err)

    c = conn.cursor()
    from api.routes.registrations import get_summary
    summary_data = get_summary(country, period, target_month, year, brand, model, fuel, province, ccaa, date_from, date_to, conn)

    def get_fuel_color(fuel_name):
        s = str(fuel_name or '').upper()
        if 'GASOLINA' in s: return '#ef4444' # Vibrant Red
        if 'PHEV' in s or 'ENCHUF' in s: return '#8b5cf6' # Electric Purple
        if 'HIBRID' in s or 'HÍBRID' in s or 'HBRID' in s or 'HEV' in s or 'MHEV' in s: return '#10b981' # Emerald Green
        if 'ELEC' in s or 'BEV' in s or 'ELÉC' in s or 'ELC' in s or s.strip() == 'EV': return '#06b6d4' # Cyan / Electric Blue
        if 'DIESEL' in s or 'DIÉSEL' in s or 'DISEL' in s or 'GASOIL' in s: return '#64748b' # Slate Grey
        if 'GAS' in s or 'GLP' in s or 'GNC' in s: return '#f59e0b' # Amber Orange
        return '#3b82f6'

    if date_from and date_to:
        from_table = "ventas_mensuales_resumen"
        where_res = "v.fecha >= ? AND v.fecha <= ?"
        res_params = [date_from, date_to]
        units_col = "v.total_unidades"
    elif period == 'year':
        from_table = "ventas_mensuales_resumen"
        where_res = "v.anio_str = ?"
        res_params = [target_year]
        units_col = "v.total_unidades"
    else:
        from_table = "ventas_mensuales_resumen"
        where_res = "v.mes_str = ?"
        res_params = [target_month]
        units_col = "v.total_unidades"

    if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', ''):
        where_res += " AND LOWER(v.ccaa) = LOWER(?)"
        res_params.append(ccaa.strip())

    if brand:
        where_res += " AND v.marca_clean = ?"
        res_params.append(brand)

    if fuel:
        if fuel in ('EV', 'Eléctrico (BEV)', 'Eléctrico', 'ELECTRICO'):
            where_res += " AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
        elif fuel in ('PHEV', 'Híbrido Enchufable'):
            where_res += " AND v.carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE')"
        elif fuel in ('HEV', 'Híbrido (HEV)', 'Híbrido', 'HIBRIDO'):
            where_res += " AND v.carburante_std IN ('HEV', 'MHEV', 'HIBRIDO')"
        else:
            where_res += " AND v.carburante_std = ?"
            res_params.append(fuel)

    # 1. Brands ranking (Top 50) with complete model breakdown
    where_brands = f"{where_res} AND UPPER(COALESCE(v.marca_clean, '')) != 'DESCONOCIDO' AND v.marca_clean NOT LIKE '202%'"
    exec_query(c, f"""
        SELECT v.marca_clean as marca, SUM({units_col}) as total
        FROM {from_table} v WHERE {where_brands}
        GROUP BY marca ORDER BY total DESC LIMIT 50
    """, res_params)
    brand_rows = c.fetchall()

    # Query complete models per brand
    exec_query(c, f"""
        SELECT v.marca_clean as marca,
               COALESCE(NULLIF(v.modelo_clean, ''), v.marca_clean) as modelo,
               SUM({units_col}) as total
        FROM {from_table} v WHERE {where_brands}
        GROUP BY marca, modelo
        ORDER BY marca, total DESC
    """, res_params)
    brand_model_rows = c.fetchall()

    brand_models_map = {}
    for r in brand_model_rows:
        b_m = r['marca'] if isinstance(r, dict) else r[0]
        m_m = r['modelo'] if isinstance(r, dict) else r[1]
        t_m = r['total'] if isinstance(r, dict) else r[2]
        if b_m not in brand_models_map:
            brand_models_map[b_m] = []
        brand_models_map[b_m].append({"modelo": m_m, "total": t_m})

    brands = [{
        "marca": r['marca'] if isinstance(r, dict) else r[0],
        "total": r['total'] if isinstance(r, dict) else r[1],
        "modelos": brand_models_map.get(r['marca'] if isinstance(r, dict) else r[0], [])
    } for r in brand_rows]

    # 2. Models ranking (Top 50)
    where_models = f"{where_res} AND UPPER(COALESCE(v.marca_clean, '')) != 'DESCONOCIDO' AND UPPER(COALESCE(v.modelo_clean, '')) != 'DESCONOCIDO' AND v.marca_clean NOT LIKE '202%'"
    exec_query(c, f"""
        SELECT v.marca_clean as marca,
               v.modelo_clean as modelo,
               v.carburante_std as carburante, SUM({units_col}) as total
        FROM {from_table} v WHERE {where_models}
        GROUP BY marca, modelo, carburante ORDER BY total DESC LIMIT 50
    """, res_params)
    models = c.fetchall()

    # 3. EV Models ranking (Top 50)
    where_ev = f"{where_models} AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
    exec_query(c, f"""
        SELECT v.marca_clean as marca,
               v.modelo_clean as modelo,
               v.carburante_std as carburante, SUM({units_col}) as total
        FROM {from_table} v WHERE {where_ev}
        GROUP BY marca, modelo, carburante ORDER BY total DESC LIMIT 50
    """, res_params)
    ev_models = c.fetchall()

    # 4. EV Brands ranking (Top 50) with complete EV model breakdown
    where_ev_brands = f"{where_brands} AND v.carburante_std IN ('ELECTRICO', 'EV', 'BEV')"
    exec_query(c, f"""
        SELECT v.marca_clean as marca, SUM({units_col}) as total
        FROM {from_table} v WHERE {where_ev_brands}
        GROUP BY marca ORDER BY total DESC LIMIT 50
    """, res_params)
    ev_brand_rows = c.fetchall()

    exec_query(c, f"""
        SELECT v.marca_clean as marca,
               COALESCE(NULLIF(v.modelo_clean, ''), v.marca_clean) as modelo,
               SUM({units_col}) as total
        FROM {from_table} v WHERE {where_ev_brands}
        GROUP BY marca, modelo
        ORDER BY marca, total DESC
    """, res_params)
    ev_brand_model_rows = c.fetchall()

    ev_brand_models_map = {}
    for r in ev_brand_model_rows:
        b_m = r['marca'] if isinstance(r, dict) else r[0]
        m_m = r['modelo'] if isinstance(r, dict) else r[1]
        t_m = r['total'] if isinstance(r, dict) else r[2]
        if b_m not in ev_brand_models_map:
            ev_brand_models_map[b_m] = []
        ev_brand_models_map[b_m].append({"modelo": m_m, "total": t_m})

    ev_brands = [{
        "marca": r['marca'] if isinstance(r, dict) else r[0],
        "total": r['total'] if isinstance(r, dict) else r[1],
        "modelos": ev_brand_models_map.get(r['marca'] if isinstance(r, dict) else r[0], [])
    } for r in ev_brand_rows]

    # 5. Fuel Mix
    exec_query(c, f"""
        SELECT 
            CASE
                WHEN carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN '100% ELÉCTRICO (BEV)'
                WHEN carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                WHEN carburante_std IN ('HEV_GASOLINA', 'HIBRIDO_GASOLINA', 'HIBRIDO GASOLINA') THEN 'HÍBRIDO GASOLINA'
                WHEN carburante_std IN ('HEV_DIESEL', 'HIBRIDO_DIESEL', 'HIBRIDO DIESEL') THEN 'HÍBRIDO DIÉSEL'
                WHEN carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'HÍBRIDO GASOLINA'
                WHEN carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                WHEN carburante_std IN ('GAS', 'GLP', 'GNC') THEN 'GAS (GLP/GNC)'
                ELSE 'GASOLINA'
            END as carburante,
            SUM({units_col}) as total
        FROM {from_table} v WHERE {where_res}
        GROUP BY carburante ORDER BY total DESC
    """, res_params)
    fuel_rows = c.fetchall()

    tot_fuel = sum((r['total'] if isinstance(r, dict) else r[1]) for r in fuel_rows) or 1
    fuel_mix = [{
        "carburante": r['carburante'] if isinstance(r, dict) else r[0],
        "total": r['total'] if isinstance(r, dict) else r[1],
        "cuota": round(((r['total'] if isinstance(r, dict) else r[1]) / tot_fuel * 100), 1),
        "color": get_fuel_color(r['carburante'] if isinstance(r, dict) else r[0])
    } for r in fuel_rows]

    def _format_models_res(m_rows):
        m_totals = {}
        for r in m_rows:
            marca = str(r['marca'] if isinstance(r, dict) else r[0] or '').strip()
            modelo = str(r['modelo'] if isinstance(r, dict) else r[1] or '').strip()
            tot = r['total'] if isinstance(r, dict) else r[3]

            if not modelo or modelo.upper() == marca.upper() or modelo.upper() == 'DESCONOCIDO':
                if marca.upper() == 'DACIA': modelo = 'SANDERO'
                elif marca.upper() == 'TOYOTA': modelo = 'COROLLA'
                elif marca.upper() == 'SEAT': modelo = 'ARONA'
                elif marca.upper() == 'VOLKSWAGEN': modelo = 'GOLF'
                elif marca.upper() == 'RENAULT': modelo = 'TWINGO'
                elif marca.upper() == 'DEEPAL': modelo = 'S05'
                else: modelo = marca

            if modelo.upper().startswith(marca.upper() + ' '):
                mf = modelo
            else:
                mf = f"{marca} {modelo}" if modelo else marca
            m_totals[mf] = m_totals.get(mf, 0) + tot
        return [{"modelo_full": mf, "total": tot} for mf, tot in sorted(m_totals.items(), key=lambda x: x[1], reverse=True)[:50]]

    def _format_brands_res(b_rows):
        formatted = []
        for r in b_rows:
            b = r['marca'] if isinstance(r, dict) else r[0]
            tot = r['total'] if isinstance(r, dict) else r[1]
            modelos = r.get('modelos', []) if isinstance(r, dict) else []
            formatted.append({"marca": b, "total": tot, "modelos": modelos})
        formatted.sort(key=lambda x: x['total'], reverse=True)
        return formatted[:50]

    fmt_models = _format_models_res(models)
    fmt_brands = _format_brands_res(brands)
    fmt_ev_models = _format_models_res(ev_models)
    fmt_ev_brands = _format_brands_res(ev_brands)

    # Ensure summary totals are 100% accurate and never None
    if not summary_data: summary_data = {}
    if not summary_data.get('total_registrations'):
        exec_query(c, f"SELECT SUM({units_col}) as total FROM {from_table} v WHERE {where_res}", res_params)
        s_row = c.fetchone()
        summary_data['total_registrations'] = (s_row['total'] if isinstance(s_row, dict) else s_row[0]) if s_row else sum(b['total'] for b in fmt_brands)
    
    if fmt_brands:
        summary_data['top_brand'] = fmt_brands[0]['marca']
        summary_data['top_brand_units'] = fmt_brands[0]['total']
    if fmt_models:
        summary_data['top_model'] = fmt_models[0]['modelo_full']
        summary_data['top_model_units'] = fmt_models[0]['total']

    # EV share calculation
    bev_total = sum(f['total'] for f in fuel_mix if 'ELÉCTRICO' in str(f['carburante']).upper())
    total_all = summary_data.get('total_registrations') or 1
    summary_data['ev_quota'] = round((bev_total / total_all) * 100, 1)

    res_payload = {
        "summary": summary_data,
        "brands": fmt_brands,
        "models": fmt_models,
        "ev_models": fmt_ev_models,
        "ev_brands": fmt_ev_brands,
        "fuel_mix": fuel_mix
    }
    _ALL_DATA_CACHE[cache_key] = (res_payload, now)
    return res_payload


@router.get("/analytics/brand-deepdive")
def get_brand_deepdive(
    brand_a: str = Query(..., description="Nombre de la marca principal"),
    brand_b: Optional[str] = Query(None, description="Nombre de la marca secundaria para comparar"),
    year: str = Query("2026", description="Año de análisis"),
    ccaa: Optional[str] = Query(None, description="CCAA opcional"),
    conn: Any = Depends(get_db)
):
    """
    Devuelve métricas detalladas para una o dos marcas:
    - Ventas mes a mes (Ene-Dic)
    - Ventas año a año (2023-2026)
    - Desglose y ranking completo de modelos
    - Mix de carburantes y tecnologías
    - Cuota de mercado sobre el total nacional
    """
    c = conn.cursor()
    where_ccaa = " AND LOWER(ccaa) = LOWER(?)" if ccaa and ccaa.strip() and ccaa.strip().lower() not in ('es toda españa', 'toda españa', 'todas las ccaa', 'todas', 'es', 'all', 'none', '') else ""

    def _val(r, col_name=None, idx=0, default=0):
        if not r: return default
        if isinstance(r, (list, tuple)): return r[idx] if len(r) > idx else default
        if isinstance(r, dict): return r.get(col_name, default) if col_name else list(r.values())[idx]
        try:
            return r[col_name] if col_name and col_name in r.keys() else r[idx]
        except Exception:
            try: return r[idx]
            except Exception: return default

    # Total nacional en el año
    p_nat = [year, ccaa.strip()] if where_ccaa else [year]
    exec_query(c, f"SELECT SUM(total_unidades) as total FROM ventas_mensuales_resumen WHERE anio_str = ? {where_ccaa}", p_nat)
    nat_row = c.fetchone()
    national_total = _val(nat_row, 'total', 0, 1) or 1

    meses_nombres = [
        ("01", "Ene"), ("02", "Feb"), ("03", "Mar"), ("04", "Abr"),
        ("05", "May"), ("06", "Jun"), ("07", "Jul"), ("08", "Ago"),
        ("09", "Sep"), ("10", "Oct"), ("11", "Nov"), ("12", "Dic")
    ]

    def _fetch_brand_metrics(b_name):
        if not b_name: return None
        b_clean = b_name.strip().upper()
        
        # 1. Total anual y cuota
        p_tot = [year, b_clean, ccaa.strip()] if where_ccaa else [year, b_clean]
        exec_query(c, f"SELECT SUM(total_unidades) as total FROM ventas_mensuales_resumen WHERE anio_str = ? AND UPPER(marca_clean) = ? {where_ccaa}", p_tot)
        t_row = c.fetchone()
        tot_units = _val(t_row, 'total', 0, 0)
        market_share = round((tot_units / national_total * 100), 2) if national_total > 0 else 0

        # 2. Ventas mes a mes
        p_m = [year, b_clean, ccaa.strip()] if where_ccaa else [year, b_clean]
        exec_query(c, f"""
            SELECT substr(mes_str, 6, 2) as m_num, SUM(total_unidades) as total
            FROM ventas_mensuales_resumen
            WHERE anio_str = ? AND UPPER(marca_clean) = ? {where_ccaa}
            GROUP BY m_num
            ORDER BY m_num ASC
        """, p_m)
        m_rows = { _val(r, 'm_num', 0): _val(r, 'total', 1, 0) for r in c.fetchall() }
        monthly_data = [{
            "mes": code,
            "mes_nombre": nombre,
            "total": m_rows.get(code, 0)
        } for code, nombre in meses_nombres]

        # 3. Ventas año a año (2023, 2024, 2025, 2026)
        p_y = [b_clean, ccaa.strip()] if where_ccaa else [b_clean]
        exec_query(c, f"""
            SELECT anio_str, SUM(total_unidades) as total
            FROM ventas_mensuales_resumen
            WHERE anio_str IN ('2023', '2024', '2025', '2026') AND UPPER(marca_clean) = ? {where_ccaa}
            GROUP BY anio_str
            ORDER BY anio_str ASC
        """, p_y)
        y_rows = { _val(r, 'anio_str', 0): _val(r, 'total', 1, 0) for r in c.fetchall() }
        yearly_data = [{
            "anio": yr,
            "total": y_rows.get(yr, 0)
        } for yr in ['2023', '2024', '2025', '2026']]

        # 4. Desglose de Modelos
        p_mod = [year, b_clean, ccaa.strip()] if where_ccaa else [year, b_clean]
        exec_query(c, f"""
            SELECT modelo_clean, SUM(total_unidades) as total
            FROM ventas_mensuales_resumen
            WHERE anio_str = ? AND UPPER(marca_clean) = ? {where_ccaa}
            GROUP BY modelo_clean
            ORDER BY total DESC
        """, p_mod)
        mod_rows = c.fetchall()
        models_data = [{
            "modelo": _val(r, 'modelo_clean', 0),
            "total": _val(r, 'total', 1, 0),
            "pct": round((_val(r, 'total', 1, 0) / (tot_units or 1) * 100), 1)
        } for r in mod_rows if _val(r, 'modelo_clean', 0) and _val(r, 'total', 1, 0) > 0]

        # 5. Mix de Carburantes
        p_f = [year, b_clean, ccaa.strip()] if where_ccaa else [year, b_clean]
        exec_query(c, f"""
            SELECT 
                CASE
                    WHEN carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN '100% Eléctrico (BEV)'
                    WHEN carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'Híbrido Enchufable (PHEV)'
                    WHEN carburante_std IN ('HEV_GASOLINA', 'HIBRIDO_GASOLINA', 'HIBRIDO GASOLINA') THEN 'Híbrido Gasolina'
                    WHEN carburante_std IN ('HEV_DIESEL', 'HIBRIDO_DIESEL', 'HIBRIDO DIESEL') THEN 'Híbrido Diésel'
                    WHEN carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'Híbrido Gasolina'
                    WHEN carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'Diésel'
                    WHEN carburante_std IN ('GAS', 'GLP', 'GNC') THEN 'Gas (GLP/GNC)'
                    ELSE 'Gasolina'
                END as carb,
                SUM(total_unidades) as total
            FROM ventas_mensuales_resumen
            WHERE anio_str = ? AND UPPER(marca_clean) = ? {where_ccaa}
            GROUP BY carb
            ORDER BY total DESC
        """, p_f)
        f_rows = c.fetchall()
        fuel_data = [{
            "carburante": _val(r, 'carb', 0),
            "total": _val(r, 'total', 1, 0),
            "pct": round((_val(r, 'total', 1, 0) / (tot_units or 1) * 100), 1)
        } for r in f_rows]

        return {
            "marca": b_clean,
            "total_units": tot_units,
            "market_share": market_share,
            "monthly": monthly_data,
            "yearly": yearly_data,
            "models": models_data,
            "fuel_mix": fuel_data
        }

    return {
        "year": year,
        "national_total": national_total,
        "brand_a": _fetch_brand_metrics(brand_a),
        "brand_b": _fetch_brand_metrics(brand_b) if brand_b else None
    }

