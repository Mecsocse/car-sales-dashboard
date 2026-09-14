import os, sys, glob, time, json, zipfile, io, urllib.request
sys.path.insert(0, '.')

# 1. Known Barcelona District names mapping
BCN_CITY_DISTRICTS = {
    '08001': 'Barcelona (El Raval / Ciutat Vella)',
    '08002': 'Barcelona (Gòtic / Ciutat Vella)',
    '08003': 'Barcelona (Barceloneta / Born)',
    '08004': 'Barcelona (Poble-sec / Montjuïc)',
    '08005': 'Barcelona (Poblenou / Vila Olímpica)',
    '08006': 'Barcelona (Sant Gervasi / Galvany)',
    '08007': 'Barcelona (Eixample Dret / Rambla Cat.)',
    '08008': 'Barcelona (Eixample Esquerre / Rambla Cat.)',
    '08009': 'Barcelona (Eixample Dret)',
    '08010': 'Barcelona (Eixample Dret / Urquinaona)',
    '08011': 'Barcelona (Eixample Esquerre)',
    '08012': 'Barcelona (Gràcia)',
    '08013': 'Barcelona (Sagrada Família / Fort Pienc)',
    '08014': 'Barcelona (Sants)',
    '08015': 'Barcelona (Eixample / Sant Antoni)',
    '08016': 'Barcelona (Nou Barris / Vilapicina)',
    '08017': 'Barcelona (Sarrià / Pedralbes)',
    '08018': 'Barcelona (Poblenou / Glòries)',
    '08019': 'Barcelona (Diagonal Mar / Besòs)',
    '08020': 'Barcelona (Sant Martí / La Verneda)',
    '08021': 'Barcelona (Sant Gervasi / Bonanova)',
    '08022': 'Barcelona (Sant Gervasi / El Putxet)',
    '08023': 'Barcelona (Gràcia / Vallcarca)',
    '08024': 'Barcelona (Gràcia / Camp d\'en Grassot)',
    '08025': 'Barcelona (Camp de l\'Arpa / Guinardó)',
    '08026': 'Barcelona (Clot / Camp de l\'Arpa)',
    '08027': 'Barcelona (La Sagrera / Congrés)',
    '08028': 'Barcelona (Les Corts / Camp Nou)',
    '08029': 'Barcelona (Les Corts)',
    '08030': 'Barcelona (Sant Andreu)',
    '08031': 'Barcelona (Horta / Vilapicina)',
    '08032': 'Barcelona (El Carmel / Horta)',
    '08033': 'Barcelona (Trinitat Vella / Sant Andreu)',
    '08034': 'Barcelona (Pedralbes / Les Corts)',
    '08035': 'Barcelona (Sant Genís / Vall d\'Hebron)',
    '08036': 'Barcelona (Eixample Esquerre / Hospital Clínic)',
    '08037': 'Barcelona (Eixample Dret)',
    '08038': 'Barcelona (Zona Franca / Montjuïc)',
    '08039': 'Barcelona (Port / Barceloneta)',
    '08040': 'Barcelona (Zona Franca Portuària)',
    '08041': 'Barcelona (Guinardó / Horta)',
    '08042': 'Barcelona (Nou Barris / Canyelles)'
}

# 2. Load GeoNames coordinates for Barcelona (08xxx)
print("1. Loading GeoNames coordinates for Barcelona (08xxx)...")
geonames_url = 'https://download.geonames.org/export/zip/ES.zip'
req = urllib.request.Request(geonames_url, headers={'User-Agent': 'CarDataSales/1.0'})

cp_geo = {}
with urllib.request.urlopen(req, timeout=15) as resp:
    with zipfile.ZipFile(io.BytesIO(resp.read())) as z:
        with z.open('ES.txt') as f:
            for line in f.read().decode('utf-8').splitlines():
                parts = line.split('\t')
                if len(parts) >= 11:
                    cp = parts[1].strip()
                    if cp.startswith('08'):
                        place = parts[2].strip()
                        lat = float(parts[9])
                        lng = float(parts[10])
                        name = BCN_CITY_DISTRICTS.get(cp, place)
                        if cp not in cp_geo:
                            cp_geo[cp] = {
                                'name': name,
                                'lat': lat,
                                'lng': lng
                            }

print(f"Loaded {len(cp_geo)} distinct postal codes with coordinates for Barcelona (08xxx).")

# 3. Fuel mapper helper
def map_fuel(code_char):
    if code_char == '0': return 'GASOLINA'
    if code_char == '1': return 'DIESEL'
    if code_char == '2': return 'ELECTRICO'
    if code_char in ('3', '4', 'M'): return 'GLP'
    if code_char in ('E', 'H'): return 'HIBRIDO'
    return 'GASOLINA'

BRAND_MAP = {
    'VOLKSWAGEN': 'VOLKSWAGEN', 'VW': 'VOLKSWAGEN', 'TOYOTA': 'TOYOTA',
    'SEAT': 'SEAT', 'HYUNDAI': 'HYUNDAI', 'KIA': 'KIA', 'RENAULT': 'RENAULT',
    'PEUGEOT': 'PEUGEOT', 'DACIA': 'DACIA', 'BMW': 'BMW', 'MERCEDES-BENZ': 'MERCEDES',
    'MERCEDES': 'MERCEDES', 'AUDI': 'AUDI', 'CITROEN': 'CITROEN', 'NISSAN': 'NISSAN',
    'FORD': 'FORD', 'FIAT': 'FIAT', 'OPEL': 'OPEL', 'CUPRA': 'CUPRA',
    'SKODA': 'SKODA', 'MG': 'MG', 'TESLA': 'TESLA', 'VOLVO': 'VOLVO',
    'MAZDA': 'MAZDA', 'SUZUKI': 'SUZUKI', 'MINI': 'MINI', 'JEEP': 'JEEP',
    'LEXUS': 'LEXUS', 'BYD': 'BYD', 'ALFA ROMEO': 'ALFA ROMEO',
    'PORSCHE': 'PORSCHE', 'DS': 'DS', 'LAND ROVER': 'LAND ROVER', 'SMART': 'SMART'
}

def clean_brand(b):
    if not b: return 'OTROS'
    b_upper = str(b).strip().upper()
    return BRAND_MAP.get(b_upper, b_upper)

def clean_model(marca_clean, modelo_raw):
    mod = modelo_raw.upper().strip()
    if mod.startswith(marca_clean):
        mod = mod[len(marca_clean):].strip()
    if not mod:
        return 'TURISMO'
    
    MODEL_KEYWORDS = [
        'SANDERO', 'DUSTER', 'JOGGER', 'COROLLA', 'C-HR', 'CHR', 'YARIS CROSS', 'YARIS', 'RAV4', 'RAV 4',
        'AYGO CROSS', 'AYGO', 'ARONA', 'IBIZA', 'LEON', 'ATECA', 'FORMENTOR', 'BORN', 'TERRAMAR',
        'GOLF', 'T-ROC', 'T ROC', 'T-CROSS', 'T CROSS', 'TIGUAN', 'POLO', 'TAIGO', 'PASSAT', 'ID.3', 'ID.4', 'ID.5',
        'MODEL 3', 'MODEL Y', 'MODEL S', 'MODEL X', 'CYBERTRUCK',
        'ZS', 'MG4', 'MG 4', 'HS', 'MG3', 'MG 3', 'CYBERSTER',
        'C3 AIRCROSS', 'C3', 'C4', 'C4 X', 'C5 AIRCROSS', 'C5 X', 'BERLINGO',
        '208', '2008', '3008', '308', '408', '5008', 'RIFTER',
        'CLIO', 'CAPTUR', 'ARKANA', 'AUSTRAL', 'MEGANE', 'SCENIC', 'ESPACE', 'RAFALE', 'KANGOO',
        '500', 'PANDA', '600', 'TIPO',
        'TUCSON', 'KONA', 'I20', 'I10', 'I30', 'BAYON', 'IONIQ 5', 'IONIQ 6', 'SANTA FE',
        'SPORTAGE', 'NIRO', 'STONIC', 'EV3', 'EV6', 'EV9', 'CEED', 'XCEED', 'PICANTO', 'SORENTO',
        'QASHQAI', 'JUKE', 'X-TRAIL', 'MICRA', 'LEAF', 'ARIYA',
        'PUMA', 'KUGA', 'FOCUS', 'FIESTA', 'MUSTANG MACH-E', 'EXPLORER',
        'CORSA', 'ASTRA', 'MOKKA', 'CROSSLAND', 'GRANDLAND', 'FRONTERA',
        'AVENGER', 'RENEGADE', 'COMPASS', 'WRANGLER',
        'OCTAVIA', 'KAMIQ', 'KAROQ', 'KODIAQ', 'FABIA', 'ENYAQ', 'SCALA',
        'SERIE 1', 'SERIE 2', 'SERIE 3', 'SERIE 4', 'SERIE 5', 'X1', 'X2', 'X3', 'X4', 'X5', 'IX1', 'IX3',
        'A1', 'A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q8',
        'CLASE A', 'CLASE B', 'CLASE C', 'CLASE E', 'GLA', 'GLB', 'GLC', 'GLE', 'EQA', 'EQB', 'EQE', 'EQS',
        'XC40', 'XC60', 'XC90', 'EX30', 'EX90',
        'ATTO 3', 'DOLPHIN', 'SEAL', 'HAN', 'TANG', 'SEAL U'
    ]
    for kw in MODEL_KEYWORDS:
        if kw in mod:
            return kw.replace('CHR', 'C-HR').replace('T ROC', 'T-ROC').replace('T CROSS', 'T-CROSS').replace('RAV 4', 'RAV4').replace('MG 4', 'MG4')
            
    parts = mod.split()
    if parts:
        cleaned_parts = [p for p in parts if not (len(p) >= 6 and (any(c.isdigit() for c in p) or p.isupper()))][:2]
        if cleaned_parts:
            return " ".join(cleaned_parts)
        return parts[0]
    return 'OTROS'

# 4. Scan 2026 files
files = sorted(glob.glob('data/raw/export_mensual_mat_2026*.txt') + glob.glob('data/raw/export_mat_2026*.txt'))
print(f"Found {len(files)} files to process for 2026.")

t0 = time.time()
bcn_data = {}

for fpath in files:
    with open(fpath, 'r', encoding='latin-1', errors='ignore') as f:
        for line in f:
            tipo = line[91:93].strip()
            if tipo != '40':
                continue
                
            cp = line[165:170].strip()
            if not cp.startswith('08') or len(cp) != 5:
                continue
                
            marca_raw = line[17:47].strip().upper()
            marca_clean = clean_brand(marca_raw)
            fuel_code = line[93:94].strip().upper()
            fuel_clean = map_fuel(fuel_code)
            modelo_raw = line[47:77].strip()
            modelo_clean = clean_model(marca_clean, modelo_raw)
            
            if 'BEV' in line[460:463]:
                fuel_clean = 'ELECTRICO'
            elif 'PHEV' in line[460:464]:
                fuel_clean = 'PHEV'
                
            if cp not in bcn_data:
                geo_info = cp_geo.get(cp, {'name': BCN_CITY_DISTRICTS.get(cp, f'CP {cp}'), 'lat': 41.3888, 'lng': 2.159})
                bcn_data[cp] = {
                    'cp': cp,
                    'name': geo_info['name'],
                    'lat': round(geo_info['lat'], 4),
                    'lng': round(geo_info['lng'], 4),
                    'total': 0,
                    'brands': {},
                    'fuels': {},
                    '_models_agg': {}
                }
                
            node = bcn_data[cp]
            node['total'] += 1
            node['brands'][marca_clean] = node['brands'].get(marca_clean, 0) + 1
            node['fuels'][fuel_clean] = node['fuels'].get(fuel_clean, 0) + 1
            m_full = f"{marca_clean} {modelo_clean}".strip().upper()
            node['_models_agg'][m_full] = node['_models_agg'].get(m_full, 0) + 1

# Process top models per postal code and convert to list
final_list = []
for cp, node in bcn_data.items():
    sorted_m = sorted(node['_models_agg'].items(), key=lambda x: x[1], reverse=True)[:3]
    top_models = [{'modelo': m[0], 'total': m[1]} for m in sorted_m]
    
    final_list.append({
        'cp': node['cp'],
        'name': node['name'],
        'lat': node['lat'],
        'lng': node['lng'],
        'total': node['total'],
        'brands': node['brands'],
        'fuels': node['fuels'],
        'top_models': top_models
    })

final_list.sort(key=lambda x: x['total'], reverse=True)

out_path = 'dashboard/data/geo_barcelona_cp_2026.json'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(final_list, f, ensure_ascii=False, indent=2)

dt = time.time() - t0
print(f"Extraction finished in {dt:.2f}s!")
print(f"Saved {len(final_list)} postal codes to {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB).")
