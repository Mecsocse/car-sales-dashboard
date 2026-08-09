import json
import os
import sqlite3

class FuelMapper:
    def __init__(self, mappings_dir, db_path):
        self.mappings_path = os.path.join(mappings_dir, 'fuel_categories.json')
        self.db_path = db_path
        self.dgt_mapping = {}
        self.code_to_id = {}
        self.load_mappings()
        
    def load_mappings(self):
        with open(self.mappings_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.dgt_mapping = data.get('dgt_mapping', {})
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT codigo, id FROM carburantes")
            rows = cursor.fetchall()
            for codigo, fuel_id in rows:
                self.code_to_id[codigo] = fuel_id

    def map_fuel(self, raw_name):
        if not raw_name:
            return self.code_to_id.get('OTROS')
            
        raw_upper = raw_name.strip().upper()
        
        mapped_code = self.dgt_mapping.get(raw_upper)
        if not mapped_code:
            # Try partial matches
            for key, val in self.dgt_mapping.items():
                if key in raw_upper:
                    mapped_code = val
                    break
        
        if not mapped_code:
            mapped_code = 'OTROS'
            
        return self.code_to_id.get(mapped_code)
