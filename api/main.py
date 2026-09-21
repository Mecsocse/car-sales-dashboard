from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import os
import sys
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH, DASHBOARD_DIR

# Ensure production always connects to official Supabase database
DEFAULT_SUPABASE_URL = "postgresql://postgres.nmqclghnxmstpabcyugn:Apuig060489%3F@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = DEFAULT_SUPABASE_URL

from api.routes import registrations, analytics, export

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import threading

app = FastAPI(title="AutoMarket Intelligence API")

# Cache-Control middleware for Edge / CDN / Browser caching
class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "public, max-age=300, s-maxage=3600"
        return response

app.add_middleware(CacheControlMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(registrations.router, prefix="/api", tags=["registrations"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(export.router, prefix="/api/export", tags=["export"])

# Ensure DB exists & warm up RAM cache in background
@app.on_event("startup")
def startup_event():
    if not os.path.exists(DB_PATH):
        print("Database not found. Please run the init_db script.")
    
    def _run_warm():
        try:
            from api.routes.analytics import warm_cache
            warm_cache()
        except Exception as e:
            print("Cache warming notice:", e)
            
    threading.Thread(target=_run_warm, daemon=True).start()

    def _run_dgt_background_watcher():
        import time
        from datetime import datetime, timezone
        # Wait 30s after boot to let app initialize smoothly
        time.sleep(30)
        while True:
            sleep_duration = 900
            try:
                # Use UTC explicitly: Spain (CEST) is UTC+2 in summer, UTC+1 in winter
                # DGT publishes daily matriculaciones between 07:15 and 08:30 UTC (09:15 - 10:30 Spain time)
                now_utc = datetime.now(timezone.utc)
                hour_utc = now_utc.hour
                minute_utc = now_utc.minute
                weekday = now_utc.weekday() # 0 = Monday, 4 = Friday

                # Active window: 07:00 UTC to 20:00 UTC (09:00 to 22:00 Spain CEST)
                if 7 <= hour_utc <= 20:
                    from agents.extractor.dgt_spain import DGTSpainExtractor
                    extractor = DGTSpainExtractor()
                    extractor.auto_catchup(days_back=3)
                
                # High-frequency morning window (07:10 to 08:45 UTC / 09:10 to 10:45 CEST) on weekdays
                # Poll every 60 seconds so we ingest within 1 minute of DGT publishing!
                if weekday < 5 and ((hour_utc == 7 and minute_utc >= 10) or (hour_utc == 8 and minute_utc <= 45)):
                    sleep_duration = 60
                elif 7 <= hour_utc <= 20:
                    sleep_duration = 900 # 15 minutes during regular day
                else:
                    sleep_duration = 1800 # 30 minutes during night
            except Exception as e:
                print("DGT Background Watcher notice:", e)
                sleep_duration = 120
            
            time.sleep(sleep_duration)

    threading.Thread(target=_run_dgt_background_watcher, daemon=True).start()

@app.get("/api/admin/trigger-ingest", tags=["admin"])
def trigger_dgt_ingest(days: int = 3, force: bool = False):
    """Allows triggering DGT ingestion on-demand via browser or webhook."""
    def _async_ingest():
        try:
            from agents.extractor.dgt_spain import DGTSpainExtractor
            extractor = DGTSpainExtractor()
            extractor.auto_catchup(days_back=days, force=force)
        except Exception as e:
            print("Manual trigger error:", e)

    threading.Thread(target=_async_ingest, daemon=True).start()
    return {"status": "success", "message": f"DGT ingestion triggered in background (days_back={days}, force={force})"}


# Serve static dashboard files safely without shadowing /api
css_dir = os.path.join(DASHBOARD_DIR, "css")
js_dir = os.path.join(DASHBOARD_DIR, "js")
data_dir = os.path.join(DASHBOARD_DIR, "data")

if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")
if os.path.exists(data_dir):
    app.mount("/data", StaticFiles(directory=data_dir), name="data")

_SEO_HTML_CACHE = {}

def get_customized_seo_html(path: str) -> str:
    path_clean = path.strip("/").lower()
    if path_clean in _SEO_HTML_CACHE:
        return _SEO_HTML_CACHE[path_clean]
    
    index_path = os.path.join(DASHBOARD_DIR, "index.html")
    if not os.path.exists(index_path):
        return "<html><body>Dashboard index.html not found</body></html>"
    
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    meta = {
        "title": "Coches más vendidos en España (2026) y Última Matrícula DGT Hoy | CarDataSales",
        "desc": "Consulta la última matrícula de la DGT hoy (serie NSH), previsión de letras, qué matrícula te tocará, los 50 coches más vendidos en España (2026) y cuota de mercado en tiempo real.",
        "canonical": f"https://cardatasales.com/{path_clean}" if path_clean else "https://cardatasales.com/"
    }

    if "matricula" in path_clean:
        if "prevision" in path_clean:
            meta["title"] = "Previsión de Matrículas DGT (2026) · Qué Letra me Tocará | CarDataSales"
            meta["desc"] = "Calcula qué matrícula le tocará a tu coche nuevo en España. Calendario de previsión de letras DGT, ritmo diario de matriculaciones y estimación de días."
        else:
            meta["title"] = "Última Matrícula DGT Hoy (2026) y Letra Más Alta Observada | CarDataSales"
            meta["desc"] = "Comprueba la última matrícula oficial asignada hoy en España por la DGT, serie de letras más alta observada (NSH) e histórico completo de series desde el año 2000."
    elif "agosto" in path_clean:
        meta["title"] = "Coches Más Vendidos en España en Agosto 2026 · Ranking Oficial DGT | CarDataSales"
        meta["desc"] = "Informe completo de ventas y matriculaciones de coches en España en agosto de 2026. Modelos líderes, cuota de turismos eléctricos y desglose por CCAA."
    elif "septiembre" in path_clean:
        meta["title"] = "Matriculaciones y Coches Más Vendidos en Septiembre 2026 | CarDataSales"
        meta["desc"] = "Datos diarios actualizados de ventas de coches en España en septiembre de 2026. Consulta el ranking de turismos, cuota de mercado y última matrícula DGT."

    # Replace title, description, canonical, OG tags
    html = re.sub(r'<link\s+rel="canonical"\s+href="[^"]*"', f'<link rel="canonical" href="{meta["canonical"]}"', html)
    html = re.sub(r'<title>.*?</title>', f'<title>{meta["title"]}</title>', html)
    html = re.sub(r'<meta\s+name="title"\s+content="[^"]*"', f'<meta name="title" content="{meta["title"]}"', html)
    html = re.sub(r'<meta\s+property="og:title"\s+content="[^"]*"', f'<meta property="og:title" content="{meta["title"]}"', html)
    html = re.sub(r'<meta\s+name="twitter:title"\s+content="[^"]*"', f'<meta name="twitter:title" content="{meta["title"]}"', html)
    html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"', f'<meta name="description" content="{meta["desc"]}"', html)
    html = re.sub(r'<meta\s+property="og:description"\s+content="[^"]*"', f'<meta property="og:description" content="{meta["desc"]}"', html)
    html = re.sub(r'<meta\s+name="twitter:description"\s+content="[^"]*"', f'<meta name="twitter:description" content="{meta["desc"]}"', html)
    html = re.sub(r'<meta\s+property="og:url"\s+content="[^"]*"', f'<meta property="og:url" content="{meta["canonical"]}"', html)
    html = re.sub(r'<meta\s+name="twitter:url"\s+content="[^"]*"', f'<meta name="twitter:url" content="{meta["canonical"]}"', html)

    _SEO_HTML_CACHE[path_clean] = html
    return html

@app.get("/")
def read_root():
    return HTMLResponse(content=get_customized_seo_html(""), status_code=200)

@app.get("/informe-agosto-2026")
@app.get("/informe-agosto-2026/")
@app.get("/matriculaciones-agosto-2026")
@app.get("/ventas-agosto-2026")
@app.get("/informe-septiembre-2026")
@app.get("/informe-septiembre-2026/")
@app.get("/matriculaciones-septiembre-2026")
@app.get("/ventas-septiembre-2026")
def read_seo_landing_pages(request: Request):
    return HTMLResponse(content=get_customized_seo_html(request.url.path), status_code=200)

@app.get("/coches-mas-vendidos-espana")
@app.get("/coches-mas-vendidos-espana/")
@app.get("/coches-mas-vendidos-espana.html")
@app.get("/coche-mas-vendido-espana")
@app.get("/coche-mas-vendido-espana/")
@app.get("/coche-mas-vendido-espana.html")
@app.get("/coches-mas-vendidos")
@app.get("/coches-mas-vendidos/")
def read_coches_mas_vendidos_page():
    p = os.path.join(DASHBOARD_DIR, "coches-mas-vendidos-espana.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/ultima-matricula-dgt")
@app.get("/ultima-matricula-dgt/")
@app.get("/ultima-matricula-dgt.html")
@app.get("/matriculas")
@app.get("/matriculas/")
def read_ultima_matricula_page():
    p = os.path.join(DASHBOARD_DIR, "ultima-matricula-dgt.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/prevision-matriculas")
@app.get("/prevision-matriculas/")
@app.get("/prevision-matriculas.html")
def read_prevision_matriculas_page():
    p = os.path.join(DASHBOARD_DIR, "prevision-matriculas.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/metodologia")
@app.get("/metodologia/")
@app.get("/metodologia.html")
def read_metodologia_page():
    p = os.path.join(DASHBOARD_DIR, "metodologia.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/sobre-nosotros")
@app.get("/sobre-nosotros/")
@app.get("/sobre-nosotros.html")
def read_sobre_nosotros_page():
    p = os.path.join(DASHBOARD_DIR, "sobre-nosotros.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/contacto")
@app.get("/contacto/")
@app.get("/contacto.html")
def read_contacto_page():
    p = os.path.join(DASHBOARD_DIR, "contacto.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/politica-de-privacidad")
@app.get("/politica-de-privacidad/")
@app.get("/politica-de-privacidad.html")
def read_privacidad_page():
    p = os.path.join(DASHBOARD_DIR, "politica-de-privacidad.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/aviso-legal")
@app.get("/aviso-legal/")
@app.get("/aviso-legal.html")
def read_aviso_legal_page():
    p = os.path.join(DASHBOARD_DIR, "aviso-legal.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/politica-de-cookies")
@app.get("/politica-de-cookies/")
@app.get("/politica-de-cookies.html")
def read_cookies_page():
    p = os.path.join(DASHBOARD_DIR, "politica-de-cookies.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página no encontrada")

@app.get("/mapa")
@app.get("/mapa/")
@app.get("/mapa.html")
def read_mapa_page():
    p = os.path.join(DASHBOARD_DIR, "mapa.html")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/html")
    raise HTTPException(status_code=404, detail="Página de mapa no encontrada")


@app.get("/favicon.svg")
def get_favicon_svg():
    p = os.path.join(DASHBOARD_DIR, "favicon.svg")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/favicon.ico")
def get_favicon_ico():
    p_ico = os.path.join(DASHBOARD_DIR, "favicon.ico")
    if os.path.exists(p_ico):
        return FileResponse(p_ico, media_type="image/x-icon", headers={"Cache-Control": "public, max-age=86400"})
    p_48 = os.path.join(DASHBOARD_DIR, "favicon-48x48.png")
    if os.path.exists(p_48):
        return FileResponse(p_48, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Favicon not found")

@app.get("/apple-touch-icon.png")
@app.get("/apple-touch-icon-precomposed.png")
def get_apple_touch_icon():
    p = os.path.join(DASHBOARD_DIR, "apple-touch-icon.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Apple touch icon not found")

@app.get("/favicon-48x48.png")
def get_favicon_48():
    p = os.path.join(DASHBOARD_DIR, "favicon-48x48.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Icon not found")

@app.get("/favicon-96x96.png")
def get_favicon_96():
    p = os.path.join(DASHBOARD_DIR, "favicon-96x96.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Icon not found")

@app.get("/favicon-192x192.png")
@app.get("/favicon.png")
def get_favicon_192():
    p = os.path.join(DASHBOARD_DIR, "favicon-192x192.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Icon not found")

@app.get("/favicon-512x512.png")
def get_favicon_512():
    p = os.path.join(DASHBOARD_DIR, "favicon-512x512.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Icon not found")

@app.get("/site.webmanifest")
def get_webmanifest():
    p = os.path.join(DASHBOARD_DIR, "site.webmanifest")
    if os.path.exists(p):
        return FileResponse(p, media_type="application/manifest+json", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Manifest not found")

@app.get("/robots.txt")
def get_robots_txt():
    p = os.path.join(DASHBOARD_DIR, "robots.txt")
    if os.path.exists(p):
        return FileResponse(p, media_type="text/plain")
    raise HTTPException(status_code=404, detail="robots.txt not found")

@app.get("/sitemap.xml")
def get_sitemap_xml():
    p = os.path.join(DASHBOARD_DIR, "sitemap.xml")
    if os.path.exists(p):
        return FileResponse(p, media_type="application/xml")
    raise HTTPException(status_code=404, detail="sitemap.xml not found")

@app.get("/ads.txt")
def get_ads_txt():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("google.com, pub-1171398586910114, DIRECT, f08c47fec0942fa0\n")

@app.get("/og-image.png")
def get_og_image():
    p = os.path.join(DASHBOARD_DIR, "og-image.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    raise HTTPException(status_code=404, detail="og-image.png not found")

@app.get("/og-card.png")
def get_og_card():
    p = os.path.join(DASHBOARD_DIR, "og-card.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    p_fallback = os.path.join(DASHBOARD_DIR, "og-image.png")
    if os.path.exists(p_fallback):
        return FileResponse(p_fallback, media_type="image/png")
    raise HTTPException(status_code=404, detail="og-card.png not found")

@app.get("/social-preview.png")
def get_social_preview():
    p = os.path.join(DASHBOARD_DIR, "social-preview.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    p_fallback = os.path.join(DASHBOARD_DIR, "og-image.png")
    if os.path.exists(p_fallback):
        return FileResponse(p_fallback, media_type="image/png")
    raise HTTPException(status_code=404, detail="social-preview.png not found")

@app.get("/x_profile_avatar.png")
def get_x_profile_avatar():
    p = os.path.join(DASHBOARD_DIR, "x_profile_avatar.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    raise HTTPException(status_code=404, detail="Avatar not found")

@app.get("/x_banner_1500x500.png")
def get_x_banner():
    p = os.path.join(DASHBOARD_DIR, "x_banner_1500x500.png")
    if os.path.exists(p):
        return FileResponse(p, media_type="image/png")
    raise HTTPException(status_code=404, detail="Banner not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
