import json
import os
import sqlite3

class BrandMapper:
    def __init__(self, mappings_dir, db_path):
        self.mappings_path = os.path.join(mappings_dir, 'brand_master.json')
        self.db_path = db_path
        self.brand_mapping = {}
        self.load_mappings()
        
    def load_mappings(self):
        # Load JSON first to populate DB if necessary, or just read DB
        # Ideally, DB should be prepopulated from JSON.
        # Let's read DB to get ID mappings, and JSON to get alias logic.
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, nombre, aliases FROM marcas")
            rows = cursor.fetchall()
            
            for row in rows:
                marca_id, nombre, aliases_json = row
                try:
                    aliases = json.loads(aliases_json)
                except:
                    aliases = []
                self.brand_mapping[nombre.upper()] = marca_id
                for alias in aliases:
                    self.brand_mapping[alias.upper()] = marca_id
                    
        # If DB is empty, read from JSON directly to map against names
        if not self.brand_mapping:
            with open(self.mappings_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data.get('brands', []):
                    # We don't have DB IDs yet, return names as fallback
                    name = item['nombre']
                    self.brand_mapping[name.upper()] = name
                    for alias in item.get('aliases', []):
                        self.brand_mapping[alias.upper()] = name

    def map_brand(self, raw_name):
        if not raw_name:
            return None
            
        raw_upper = raw_name.strip().upper()
        
        # Exact match
        if raw_upper in self.brand_mapping:
            return self.brand_mapping[raw_upper]
            
        # Substring fuzzy match
        for known, m_id in self.brand_mapping.items():
            if known in raw_upper or raw_upper in known:
                return m_id
                
        return None
