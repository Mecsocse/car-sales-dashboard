from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH, DASHBOARD_DIR

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

# Serve static dashboard files safely without shadowing /api
css_dir = os.path.join(DASHBOARD_DIR, "css")
js_dir = os.path.join(DASHBOARD_DIR, "js")

if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
def read_root():
    index_path = os.path.join(DASHBOARD_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AutoMarket Intelligence API Running."}

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
        return FileResponse(p_ico, media_type="image/x-icon")
    p_svg = os.path.join(DASHBOARD_DIR, "favicon.svg")
    if os.path.exists(p_svg):
        return FileResponse(p_svg, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Favicon not found")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
