import argparse
import sys
import os
import subprocess

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import DB_PATH

def run_pipeline():
    parser = argparse.ArgumentParser(description="Run AutoMarket Intelligence Pipeline")
    parser.add_argument("--date", help="Single date YYYY-MM-DD")
    parser.add_argument("--range", nargs=2, help="Start and End dates YYYY-MM-DD")
    parser.add_argument("--month", help="Month YYYY-MM")
    parser.add_argument("--historical", action="store_true", help="Download from 2020 to today")
    
    args = parser.parse_args()
    
    # 1. Run initialization if DB doesn't exist
    if not os.path.exists(DB_PATH):
        print("Database not found. Initializing...")
        init_script = os.path.join(os.path.dirname(__file__), '../db/init_db.py')
        if os.path.exists(init_script):
            subprocess.run([sys.executable, init_script])
    
    # 2. Extraction
    print("Starting extraction (DGT Spain)...")
    dgt_script = os.path.join(os.path.dirname(__file__), '../agents/extractor/dgt_spain.py')
    
    cmd = [sys.executable, dgt_script]
    if args.date:
        cmd.extend(["--date", args.date])
    elif args.range:
        cmd.extend(["--range", args.range[0], args.range[1]])
    elif args.month:
        cmd.extend(["--month", args.month])
    elif args.historical:
        cmd.append("--historical")
        
    subprocess.run(cmd)
    
    # 3. Normalization
    print("Starting normalization...")
    from agents.normalizer.normalizer import Normalizer
    normalizer = Normalizer()
    updated = normalizer.normalize_database_records()
    print(f"Normalized {updated} records.")
    
    # 4. Quality Audit
    print("Running quality audit...")
    from agents.auditor.quality_checker import QualityChecker
    auditor = QualityChecker(DB_PATH)
    report = auditor.run_audit()
    print("Audit Report:")
    for k, v in report.items():
        print(f" - {k}: {v}")
        
    print("Pipeline finished successfully.")

if __name__ == "__main__":
    run_pipeline()
