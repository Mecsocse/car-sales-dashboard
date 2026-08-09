import pandas as pd
import sqlite3
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from config import MAPPINGS_DIR, DB_PATH
from agents.normalizer.brand_mapper import BrandMapper
from agents.normalizer.fuel_mapper import FuelMapper

class Normalizer:
    def __init__(self, db_path=DB_PATH, mappings_dir=MAPPINGS_DIR):
        self.db_path = db_path
        self.brand_mapper = BrandMapper(mappings_dir, db_path)
        self.fuel_mapper = FuelMapper(mappings_dir, db_path)
        
    def normalize_database_records(self):
        # Update records in DB that haven't been normalized yet
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, marca_raw, carburante_raw, provincia_raw FROM ventas_registradas WHERE marca_id IS NULL OR carburante_id IS NULL")
            rows = cursor.fetchall()
            
            # Fetch provinces to map
            cursor.execute("SELECT id, nombre FROM provincias")
            prov_map = {name.upper(): p_id for p_id, name in cursor.fetchall()}
            
            updates = []
            for row_id, marca_raw, fuel_raw, prov_raw in rows:
                marca_id = self.brand_mapper.map_brand(marca_raw) if marca_raw else None
                fuel_id = self.fuel_mapper.map_fuel(fuel_raw) if fuel_raw else None
                
                prov_id = None
                if prov_raw:
                    # Simple province mapping (exact or substring)
                    prov_upper = prov_raw.upper()
                    for p_name, p_id in prov_map.items():
                        if p_name in prov_upper or prov_upper in p_name:
                            prov_id = p_id
                            break
                            
                updates.append((marca_id, fuel_id, prov_id, row_id))
                
            if updates:
                cursor.executemany("UPDATE ventas_registradas SET marca_id = ?, carburante_id = ?, provincia_id = ? WHERE id = ?", updates)
                conn.commit()
                
            return len(updates)
