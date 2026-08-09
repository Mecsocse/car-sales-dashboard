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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
