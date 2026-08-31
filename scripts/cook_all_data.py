import sqlite3
import json
import os
import sys

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../matriculaciones.db'))

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/precomputed'))
os.makedirs(OUT_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

def get_fuel_color(fuel_name):
    s = str(fuel_name or '').upper()
    if 'GASOLINA' in s: return '#ef4444' # Red
    if 'PHEV' in s or 'ENCHUF' in s: return '#8b5cf6' # Purple
    if 'DIESEL' in s or 'DIÉSEL' in s: return '#64748b' # Slate
    if 'HEV' in s or 'HIBRIDO' in s or 'HÍBRIDO' in s: return '#10b981' # Green
    if 'ELECTRICO' in s or 'ELÉCTRICO' in s or 'EV' in s or 'BEV' in s: return '#06b6d4' # Cyan
    if 'GAS' in s or 'GLP' in s or 'GNC' in s: return '#f59e0b' # Amber
    return '#94a3b8'

def cook_all_data_payload(where_clause, params, period, target_month, target_year):
    # 1. Total & EV
    c.execute(f"SELECT SUM(total_unidades) as total FROM ventas_mensuales_resumen WHERE {where_clause}", params)
    total_m = c.fetchone()['total'] or 0
    
    c.execute(f"SELECT SUM(total_unidades) as total_ev FROM ventas_mensuales_resumen WHERE {where_clause} AND carburante_std IN ('ELECTRICO','EV','BEV')", params)
    ev_u = c.fetchone()['total_ev'] or 0
    ev_share = round((ev_u / (total_m or 1) * 100), 1) if total_m > 0 else 0.0

    # 2. Brands Ranking
    c.execute(f"""
        SELECT marca_clean as marca, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE {where_clause} AND UPPER(marca_clean) NOT LIKE '%DESCONOCIDO%' AND marca_clean NOT LIKE '202%'
        GROUP BY marca_clean
        ORDER BY total DESC
        LIMIT 50
    """, params)
    brands = [{'marca': r['marca'], 'total': r['total']} for r in c.fetchall()]

    # 3. Models Ranking
    c.execute(f"""
        SELECT marca_clean as marca, modelo_clean as modelo, modelo_full, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE {where_clause} AND UPPER(marca_clean) NOT LIKE '%DESCONOCIDO%' AND UPPER(modelo_clean) NOT LIKE '%DESCONOCIDO%' AND marca_clean NOT LIKE '202%'
        GROUP BY marca_clean, modelo_clean, modelo_full
        ORDER BY total DESC
        LIMIT 50
    """, params)
    models = [{'marca': r['marca'], 'modelo': r['modelo'], 'modelo_full': r['modelo_full'], 'total': r['total']} for r in c.fetchall()]

    # 4. EV Models
    c.execute(f"""
        SELECT marca_clean as marca, modelo_clean as modelo, modelo_full, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE {where_clause} AND carburante_std IN ('ELECTRICO','EV','BEV') AND UPPER(marca_clean) NOT LIKE '%DESCONOCIDO%' AND UPPER(modelo_clean) NOT LIKE '%DESCONOCIDO%' AND marca_clean NOT LIKE '202%'
        GROUP BY marca_clean, modelo_clean, modelo_full
        ORDER BY total DESC
        LIMIT 50
    """, params)
    ev_models = [{'marca': r['marca'], 'modelo': r['modelo'], 'modelo_full': r['modelo_full'], 'total': r['total']} for r in c.fetchall()]

    # 5. EV Brands
    c.execute(f"""
        SELECT marca_clean as marca, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE {where_clause} AND carburante_std IN ('ELECTRICO','EV','BEV') AND UPPER(marca_clean) NOT LIKE '%DESCONOCIDO%' AND marca_clean NOT LIKE '202%'
        GROUP BY marca_clean
        ORDER BY total DESC
        LIMIT 50
    """, params)
    ev_brands = [{'marca': r['marca'], 'total': r['total']} for r in c.fetchall()]

    # 6. Fuel Mix
    c.execute(f"""
        SELECT carburante_std as carburante, SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE {where_clause}
        GROUP BY carburante_std
        ORDER BY total DESC
    """, params)
    raw_fuels = c.fetchall()
    fuel_mix = []
    for r in raw_fuels:
        name = r['carburante']
        u = r['total']
        pct = round((u / (total_m or 1) * 100), 1) if total_m > 0 else 0.0
        fuel_mix.append({
            'carburante': name,
            'unidades': u,
            'porcentaje': pct,
            'color': get_fuel_color(name)
        })

    top_brand = brands[0]['marca'] if brands else "N/A"
    top_brand_units = brands[0]['total'] if brands else 0
    top_model = models[0]['modelo_full'] if models else "N/A"
    top_model_units = models[0]['total'] if models else 0

    summary = {
        'total_month': total_m,
        'total_registrations': total_m,
        'ev_share': ev_share,
        'pct_change': 0.0,
        'top_brand': top_brand,
        'top_brand_units': top_brand_units,
        'top_model': top_model,
        'top_model_units': top_model_units,
        'projected_month_end': int(total_m * 1.1) if total_m > 0 else 0
    }

    return {
        'summary': summary,
        'brands': brands,
        'models': models,
        'ev_models': ev_models,
        'ev_brands': ev_brands,
        'fuel_mix': fuel_mix
    }

def cook_all():
    print("=== Cooking All Pre-Computed Data ===")
    # 1. Distinct months
    c.execute("SELECT DISTINCT mes_str FROM ventas_mensuales_resumen ORDER BY mes_str ASC")
    months = [r['mes_str'] for r in c.fetchall()]
    
    for m in months:
        y = m[:4]
        payload = cook_all_data_payload("mes_str = ?", [m], "month", m, y)
        out_file = os.path.join(OUT_DIR, f"all_data_month_{m}.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False)
        print(f"  [OK] Cooked Month {m} -> {payload['summary']['total_month']:,} un.")

    # 2. Distinct years
    c.execute("SELECT DISTINCT anio_str FROM ventas_mensuales_resumen ORDER BY anio_str ASC")
    years = [r['anio_str'] for r in c.fetchall()]
    for y in years:
        payload = cook_all_data_payload("anio_str = ?", [y], "year", f"{y}-12", y)
        out_file = os.path.join(OUT_DIR, f"all_data_year_{y}.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False)
        print(f"  [OK] Cooked Year {y} -> {payload['summary']['total_month']:,} un.")

    # 3. Monthly Evolution for 2026, 2025, 2024
    for y in ['2026', '2025', '2024']:
        c.execute("""
            SELECT mes_str, SUM(total_unidades) as total
            FROM ventas_mensuales_resumen
            WHERE anio_str = ?
            GROUP BY mes_str
            ORDER BY mes_str ASC
        """, (y,))
        evo_data = [{'mes': r['mes_str'], 'total': r['total']} for r in c.fetchall()]
        out_file = os.path.join(OUT_DIR, f"monthly_evolution_{y}.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(evo_data, f, ensure_ascii=False)

    # 4. Multiyear EV Quota
    c.execute("""
        SELECT anio_str, mes_str,
               SUM(CASE WHEN carburante_std IN ('ELECTRICO','EV','BEV') THEN total_unidades ELSE 0 END) as ev,
               SUM(total_unidades) as total
        FROM ventas_mensuales_resumen
        WHERE anio_str IN ('2024','2025','2026')
        GROUP BY anio_str, mes_str
        ORDER BY anio_str ASC, mes_str ASC
    """)
    ev_quota_res = {}
    for r in c.fetchall():
        y, m, ev, tot = r['anio_str'], r['mes_str'][-2:], r['ev'], r['total']
        if y not in ev_quota_res: ev_quota_res[y] = {}
        ev_quota_res[y][m] = round((ev / (tot or 1) * 100), 1) if tot > 0 else 0.0
    with open(os.path.join(OUT_DIR, "multiyear_ev_quota.json"), 'w', encoding='utf-8') as f:
        json.dump(ev_quota_res, f, ensure_ascii=False)

    # 5. Multiyear EV Cumulative
    ev_cum_res = {}
    for y in ['2024', '2025', '2026']:
        ev_cum_res[y] = {}
        running = 0
        for m_code in [f"{i:02d}" for i in range(1, 13)]:
            m_str = f"{y}-{m_code}"
            c.execute("SELECT SUM(total_unidades) as ev FROM ventas_mensuales_resumen WHERE mes_str = ? AND carburante_std IN ('ELECTRICO','EV','BEV')", (m_str,))
            row = c.fetchone()
            val = row['ev'] if row and row['ev'] else 0
            if val > 0 or (y != '2026' or int(m_code) <= 8):
                running += val
                ev_cum_res[y][m_code] = running
    with open(os.path.join(OUT_DIR, "multiyear_ev_cumulative.json"), 'w', encoding='utf-8') as f:
        json.dump(ev_cum_res, f, ensure_ascii=False)

    # 6. Monthly Tech Quota 2026
    c.execute("""
        SELECT substr(mes_str, 6, 2) as m,
               CASE
                   WHEN carburante_std IN ('ELECTRICO', 'EV', 'BEV') THEN 'ELÉCTRICO (BEV)'
                   WHEN carburante_std IN ('PHEV', 'HIBRIDO_ENCHUFABLE') THEN 'HÍBRIDO ENCHUFABLE (PHEV)'
                   WHEN carburante_std IN ('HEV', 'MHEV', 'HIBRIDO', 'HÍBRIDO') THEN 'HÍBRIDO (HEV/MHEV)'
                   WHEN carburante_std IN ('DIESEL', 'GASOIL', 'DIÉSEL') THEN 'DIÉSEL'
                   ELSE 'GASOLINA'
               END as tech,
               SUM(total_unidades) as units
        FROM ventas_mensuales_resumen
        WHERE anio_str = '2026'
        GROUP BY m, tech
        ORDER BY m, units DESC
    """)
    m_techs = {}
    m_tots = {}
    for r in c.fetchall():
        m, tech, u = r['m'], r['tech'], r['units']
        if m not in m_techs: m_techs[m] = {}; m_tots[m] = 0
        m_techs[m][tech] = u
        m_tots[m] += u
    tech_quota_res = {}
    for m, techs in m_techs.items():
        tot = m_tots[m] or 1
        tech_quota_res[m] = {tech: round((units / tot * 100), 1) for tech, units in techs.items()}
    with open(os.path.join(OUT_DIR, "monthly_tech_quota_2026.json"), 'w', encoding='utf-8') as f:
        json.dump(tech_quota_res, f, ensure_ascii=False)

    # 7. Monthly Matrix for each year
    for y in ['2024', '2025', '2026']:
        c.execute(f"""
            SELECT 
                marca_clean as marca,
                modelo_clean as modelo,
                modelo_full,
                SUM(CASE WHEN mes_str = '{y}-01' THEN total_unidades ELSE 0 END) as ene,
                SUM(CASE WHEN mes_str = '{y}-02' THEN total_unidades ELSE 0 END) as feb,
                SUM(CASE WHEN mes_str = '{y}-03' THEN total_unidades ELSE 0 END) as mar,
                SUM(CASE WHEN mes_str = '{y}-04' THEN total_unidades ELSE 0 END) as abr,
                SUM(CASE WHEN mes_str = '{y}-05' THEN total_unidades ELSE 0 END) as may,
                SUM(CASE WHEN mes_str = '{y}-06' THEN total_unidades ELSE 0 END) as jun,
                SUM(CASE WHEN mes_str = '{y}-07' THEN total_unidades ELSE 0 END) as jul,
                SUM(CASE WHEN mes_str = '{y}-08' THEN total_unidades ELSE 0 END) as ago,
                SUM(CASE WHEN mes_str = '{y}-09' THEN total_unidades ELSE 0 END) as sep,
                SUM(CASE WHEN mes_str = '{y}-10' THEN total_unidades ELSE 0 END) as oct,
                SUM(CASE WHEN mes_str = '{y}-11' THEN total_unidades ELSE 0 END) as nov,
                SUM(CASE WHEN mes_str = '{y}-12' THEN total_unidades ELSE 0 END) as dic,
                SUM(total_unidades) as total_2026
            FROM ventas_mensuales_resumen
            WHERE anio_str = '{y}' AND UPPER(marca_clean) NOT LIKE '%DESCONOCIDO%' AND UPPER(modelo_clean) NOT LIKE '%DESCONOCIDO%' AND marca_clean NOT LIKE '202%'
            GROUP BY marca_clean, modelo_clean, modelo_full
            ORDER BY total_2026 DESC
            LIMIT 50
        """)
        matrix_res = [dict(r) for r in c.fetchall()]
        with open(os.path.join(OUT_DIR, f"monthly_matrix_{y}.json"), 'w', encoding='utf-8') as f:
            json.dump(matrix_res, f, ensure_ascii=False)

    print(f"All pre-computed files generated in {OUT_DIR} successfully!")

if __name__ == "__main__":
    cook_all()
    conn.close()
