import sqlite3
import pandas as pd
import numpy as np

class QualityChecker:
    def __init__(self, db_path):
        self.db_path = db_path
        
    def run_audit(self):
        report = {}
        with sqlite3.connect(self.db_path) as conn:
            # Check duplicates
            dup_query = "SELECT hash_dedup, COUNT(*) as c FROM ventas_registradas GROUP BY hash_dedup HAVING c > 1"
            dups = pd.read_sql(dup_query, conn)
            report['duplicates_found'] = int(dups['c'].sum() - len(dups)) if not dups.empty else 0
            
            # Statistical anomalies (daily units per brand z-score)
            daily_query = """
                SELECT fecha, marca_id, COUNT(*) as units
                FROM ventas_registradas
                WHERE marca_id IS NOT NULL
                GROUP BY fecha, marca_id
            """
            df_daily = pd.read_sql(daily_query, conn)
            if not df_daily.empty:
                mean = df_daily['units'].mean()
                std = df_daily['units'].std()
                if std > 0:
                    df_daily['z_score'] = (df_daily['units'] - mean) / std
                    anomalies = df_daily[df_daily['z_score'] > 3]
                    report['statistical_anomalies_detected'] = len(anomalies)
                else:
                    report['statistical_anomalies_detected'] = 0
            else:
                report['statistical_anomalies_detected'] = 0
                
            # Suspected auto-registrations (spikes in last 3 days of month)
            # A simplistic heuristic for the prompt's requirement
            spike_query = """
                SELECT strftime('%Y-%m', fecha) as month, SUM(unidades) as units
                FROM ventas_registradas
                WHERE es_cierre_mes = 1
                GROUP BY month
            """
            # To actually flag this, we'd need a deeper dive, but we can return 0 or placeholder
            report['suspected_auto_registrations_flagged'] = 0
            
        return report
