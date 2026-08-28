from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))
from config import DB_PATH, DASHBOARD_DIR

from api.routes import registrations, analytics, export

app = FastAPI(title="AutoMarket Intelligence API")

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

# Ensure DB exists
@app.on_event("startup")
def startup_event():
    if not os.path.exists(DB_PATH):
        print("Database not found. Please run the init_db script.")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
