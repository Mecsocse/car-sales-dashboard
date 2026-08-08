"""
AutoMarket Intelligence — Launcher 🚀
Inicia el servidor backend y abre automáticamente el Dashboard Web en tu navegador.
"""
import os
import sys
import webbrowser
import time
import subprocess

def main():
    print("=" * 65)
    print(" AUTOMARKET INTELLIGENCE -- SERVIDOR Y DASHBOARD ANALITICO")
    print("=" * 65)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    # 1. Verify / Init DB
    db_path = os.path.join(base_dir, "db", "automarket.db")
    if not os.path.exists(db_path):
        print("\n[DB] Inicializando base de datos local y datos semilla...")
        init_script = os.path.join(base_dir, "db", "init_db.py")
        subprocess.run([sys.executable, init_script])

        seed_script = os.path.join(base_dir, "scripts", "seed_demo_data.py")
        if os.path.exists(seed_script):
            print("\n[DATA] Generando historico de matriculaciones...")
            subprocess.run([sys.executable, seed_script])

    # 2. Open browser after short delay
    url = "http://localhost:8000"
    print(f"\n[WEB] Abriendo Dashboard Web en tu navegador: {url}")
    
    def open_browser():
        time.sleep(1.5)
        webbrowser.open(url)

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # 3. Start FastAPI / Uvicorn Server
    print("\n[SERVER] Servidor iniciado en http://localhost:8000")
    print("   Presiona Ctrl+C para detener el servidor.\n")
    
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
