import os, sys, glob, time, json, zipfile, io, urllib.request

sys.path.insert(0, '.')

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


SANT_CUGAT_DISTRICTS = {
    '08172': {'name': 'Sant Cugat (Centre / Monestir)', 'lat': 41.4674, 'lng': 2.0830},
    '08173': {'name': 'Sant Cugat (Nord / Parc Central / Coll Favà)', 'lat': 41.4785, 'lng': 2.0870},
    '08174': {'name': 'Sant Cugat (Valldoreix)', 'lat': 41.4550, 'lng': 2.0670},
    '08195': {'name': 'Sant Cugat (Mira-sol)', 'lat': 41.4680, 'lng': 2.0520},
    '08196': {'name': 'Sant Cugat (Les Planes)', 'lat': 41.4280, 'lng': 2.0950},
    '08197': {'name': 'Sant Cugat (Valldoreix Sud / Can Monmany)', 'lat': 41.4460, 'lng': 2.0620},
    '08198': {'name': 'Sant Cugat (La Floresta)', 'lat': 41.4420, 'lng': 2.0730},
    '08190': {'name': 'Sant Cugat (Can Mates / Can Sant Joan)', 'lat': 41.4850, 'lng': 2.0700}
}

MAD_CITY_DISTRICTS = {
    '28001': 'Madrid (Salamanca / Recoletos)',
    '28002': 'Madrid (Chamartín / Prosperidad)',
    '28003': 'Madrid (Chamberí / Ríos Rosas)',
    '28004': 'Madrid (Centro / Malasaña / Chueca)',
    '28005': 'Madrid (Centro / La Latina)',
    '28006': 'Madrid (Salamanca / Castellana)',
    '28007': 'Madrid (Retiro / Estrella)',
    '28008': 'Madrid (Moncloa / Argüelles)',
    '28009': 'Madrid (Retiro / Ibiza)',
    '28010': 'Madrid (Chamberí / Almagro)',
    '28011': 'Madrid (Latina / Puerta del Ángel)',
    '28012': 'Madrid (Centro / Lavapiés)',
    '28013': 'Madrid (Centro / Sol / Ópera)',
    '28014': 'Madrid (Centro / Cortes / Huertas)',
    '28015': 'Madrid (Chamberí / Gaztambide)',
    '28016': 'Madrid (Chamartín / Nueva España)',
    '28017': 'Madrid (Ciudad Lineal / Quintana)',
    '28018': 'Madrid (Puente de Vallecas)',
    '28019': 'Madrid (Carabanchel / San Isidro)',
    '28020': 'Madrid (Tetuán / Cuatro Caminos)',
    '28021': 'Madrid (Villaverde)',
    '28022': 'Madrid (San Blas / Canillejas)',
    '28023': 'Madrid (Moncloa / Aravaca)',
    '28024': 'Madrid (Latina / Campamento)',
    '28025': 'Madrid (Carabanchel / Vista Alegre)',
    '28026': 'Madrid (Usera)',
    '28027': 'Madrid (Ciudad Lineal)',
    '28028': 'Madrid (Salamanca / Guindalera)',
    '28029': 'Madrid (Tetuán / Ventilla)',
    '28030': 'Madrid (Moratalaz)',
    '28031': 'Madrid (Villa de Vallecas)',
    '28032': 'Madrid (Vicálvaro)',
    '28033': 'Madrid (Hortaleza / Pinar de Chamartín)',
    '28034': 'Madrid (Fuencarral / Mirasierra)',
    '28035': 'Madrid (Fuencarral / Peñagrande)',
    '28036': 'Madrid (Chamartín / Castilla)',
    '28037': 'Madrid (San Blas / Simancas)',
    '28038': 'Madrid (Puente de Vallecas / Portazgo)',
    '28039': 'Madrid (Tetuán / Berruguete)',
    '28040': 'Madrid (Moncloa / Ciudad Universitaria)',
    '28041': 'Madrid (Usera / Orcasitas)',
    '28042': 'Madrid (Barajas / Aeropuerto)',
    '28043': 'Madrid (Hortaleza / Canillas)',
    '28044': 'Madrid (Latina / Aluche)',
    '28045': 'Madrid (Arganzuela / Delicias)',
    '28046': 'Madrid (Fuencarral / Las Tablas)',
    '28047': 'Madrid (Carabanchel / Eugenia de Montijo)',
    '28048': 'Madrid (El Pardo)',
    '28049': 'Madrid (Fuencarral / Montecarmelo)',
    '28050': 'Madrid (Hortaleza / Sanchinarro)',
    '28051': 'Madrid (Ensanche de Vallecas)',
    '28052': 'Madrid (Vicálvaro / El Cañaveral)',
    '28053': 'Madrid (Puente de Vallecas / San Diego)',
    '28054': 'Madrid (Carabanchel Alto / PAU)',
    '28055': 'Madrid (Hortaleza / Valdebebas)'
}

print('1. Loading GeoNames coordinates for all Spanish postal codes...')
geonames_url = 'https://download.geonames.org/export/zip/ES.zip'
req = urllib.request.Request(geonames_url, headers={'User-Agent': 'CarDataSales/1.0'})

cp_geo = {}
with urllib.request.urlopen(req, timeout=20) as resp:
    with zipfile.ZipFile(io.BytesIO(resp.read())) as z:
        with z.open('ES.txt') as f:
            for line in f.read().decode('utf-8').splitlines():
                parts = line.split('\t')
                if len(parts) >= 11:
                    cp = parts[1].strip()
                    if len(cp) == 5 and cp.isdigit():
                        place = parts[2].strip()
                        lat = float(parts[9])
                        lng = float(parts[10])
                        
                        if cp in BCN_CITY_DISTRICTS:
                            name = BCN_CITY_DISTRICTS[cp]
                        elif cp in MAD_CITY_DISTRICTS:
                            name = MAD_CITY_DISTRICTS[cp]
                        elif cp in SANT_CUGAT_DISTRICTS:
                            name = SANT_CUGAT_DISTRICTS[cp]['name']
                            lat = SANT_CUGAT_DISTRICTS[cp]['lat']
                            lng = SANT_CUGAT_DISTRICTS[cp]['lng']
                        else:
                            name = place
                            
                        if cp not in cp_geo:
                            cp_geo[cp] = {
                                'name': name,
                                'lat': round(lat, 4),
                                'lng': round(lng, 4)
                            }

print(f'Loaded {len(cp_geo)} distinct postal codes with coordinates.')

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
            return ' '.join(cleaned_parts)
        return parts[0]
    return 'OTROS'

files = sorted(glob.glob('data/raw/export_mensual_mat_2026*.txt') + glob.glob('data/raw/export_mat_2026*.txt'))
print(f'Found {len(files)} files to process for 2026.')

t0 = time.time()
prov_postals = {f'{i:02d}': {} for i in range(1, 53)}
national_models = {}
national_brand_models = {}

total_records = 0
for fpath in files:
    with open(fpath, 'r', encoding='latin-1', errors='ignore') as f:
        for line in f:
            tipo = line[91:93].strip()
            if tipo != '40':
                continue
                
            cp = line[165:170].strip()
            if len(cp) != 5 or not cp.isdigit():
                continue
                
            prefix = cp[:2]
            if prefix not in prov_postals:
                continue
                
            total_records += 1
            marca_raw = line[17:47].strip().upper()
            marca_clean = clean_brand(marca_raw)
            f_slice = line[450:465] if len(line) >= 465 else ''
            fuel_code = line[93:94].strip().upper()
            
            if 'BEV' in f_slice or fuel_code == '2':
                fuel_clean = 'ELECTRICO'
            elif 'PHEV' in f_slice:
                fuel_clean = 'PHEV'
            elif 'HEV' in f_slice:
                fuel_clean = 'HEV'
            elif 'GLP' in f_slice or 'GNC' in f_slice or fuel_code in ('3', '4', 'M'):
                fuel_clean = 'GLP'
            elif fuel_code == '1':
                fuel_clean = 'DIESEL'
            else:
                fuel_clean = 'GASOLINA'
            
            modelo_raw = line[47:77].strip()
            modelo_clean = clean_model(marca_clean, modelo_raw)
                
            prov_dict = prov_postals[prefix]
            if cp not in prov_dict:
                geo_info = cp_geo.get(cp, {'name': f'CP {cp}', 'lat': 40.0, 'lng': -3.7})
                prov_dict[cp] = {
                    'cp': cp,
                    'name': geo_info['name'],
                    'lat': geo_info['lat'],
                    'lng': geo_info['lng'],
                    'total': 0,
                    'brands': {},
                    'fuels': {},
                    '_models': {}
                }
                
            node = prov_dict[cp]
            node['total'] += 1
            node['brands'][marca_clean] = node['brands'].get(marca_clean, 0) + 1
            node['fuels'][fuel_clean] = node['fuels'].get(fuel_clean, 0) + 1
            m_full = f'{marca_clean} {modelo_clean}'.strip().upper()
            node['_models'][m_full] = node['_models'].get(m_full, 0) + 1

            national_models[m_full] = national_models.get(m_full, 0) + 1
            if marca_clean not in national_brand_models:
                national_brand_models[marca_clean] = {}
            national_brand_models[marca_clean][modelo_clean] = national_brand_models[marca_clean].get(modelo_clean, 0) + 1

dt = time.time() - t0
print(f'Extracted {total_records} turismos across all 52 provinces in {dt:.2f}s!')

out_dir = 'dashboard/data/cp'
os.makedirs(out_dir, exist_ok=True)

total_bytes = 0
active_provinces = 0
index_manifest = {}

for prefix, cp_dict in sorted(prov_postals.items()):
    if not cp_dict:
        continue
    active_provinces += 1
    
    # 4b. Cartographic dispersion for duplicate coordinates
    coords_map = {}
    for cp, node in cp_dict.items():
        key = (round(node['lat'], 4), round(node['lng'], 4))
        coords_map.setdefault(key, []).append(node)

    import math
    for key, nodes in coords_map.items():
        if len(nodes) > 1:
            nodes.sort(key=lambda x: x['total'], reverse=True)
            base_lat, base_lng = key
            R = 0.0075  # ~800m offset
            lat_rad = math.radians(base_lat)
            cos_lat = max(math.cos(lat_rad), 0.2)
            if len(nodes) == 2:
                nodes[0]['lat'] = round(base_lat + R * 0.45, 4)
                nodes[0]['lng'] = round(base_lng - (R * 0.45) / cos_lat, 4)
                nodes[1]['lat'] = round(base_lat - R * 0.45, 4)
                nodes[1]['lng'] = round(base_lng + (R * 0.45) / cos_lat, 4)
            else:
                m = len(nodes) - 1
                for idx, node in enumerate(nodes[1:]):
                    angle = 2 * math.pi * idx / m
                    node['lat'] = round(base_lat + R * math.sin(angle), 4)
                    node['lng'] = round(base_lng + (R * math.cos(angle)) / cos_lat, 4)
                    node['lng'] = round(base_lng + (R * math.cos(angle)) / cos_lat, 4)

    prov_list = []
    prov_total_cars = 0
    for cp, node in cp_dict.items():
        prov_total_cars += node['total']
        sorted_m = sorted(node['_models'].items(), key=lambda x: x[1], reverse=True)
        top_models = [{'modelo': m[0], 'total': m[1]} for m in sorted_m[:10]]
        
        prov_list.append({
            'cp': node['cp'],
            'name': node['name'],
            'lat': node['lat'],
            'lng': node['lng'],
            'total': node['total'],
            'brands': node['brands'],
            'fuels': node['fuels'],
            'top_models': top_models,
            'models': { m[0]: m[1] for m in sorted_m }
        })
        
    prov_list.sort(key=lambda x: x['total'], reverse=True)
    
    out_file = os.path.join(out_dir, f'cp_{prefix}.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(prov_list, f, ensure_ascii=False)
        
    sz = os.path.getsize(out_file)
    total_bytes += sz
    
    index_manifest[prefix] = {
        'count': len(prov_list),
        'total': prov_total_cars
    }

bcn_legacy = 'dashboard/data/geo_barcelona_cp_2026.json'
if os.path.exists(os.path.join(out_dir, 'cp_08.json')):
    import shutil
    shutil.copyfile(os.path.join(out_dir, 'cp_08.json'), bcn_legacy)

with open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index_manifest, f, ensure_ascii=False, indent=2)

# Generate models catalog for UI selector
top_50_spain = [
    {'full_model': m[0], 'total': m[1]}
    for m in sorted(national_models.items(), key=lambda x: x[1], reverse=True)[:50]
]

brands_catalog = {}
for brand, models_dict in sorted(national_brand_models.items()):
    sorted_bm = sorted(models_dict.items(), key=lambda x: x[1], reverse=True)
    brands_catalog[brand] = [
        {'model': m[0], 'full_model': f'{brand} {m[0]}', 'total': m[1]}
        for m in sorted_bm if m[1] >= 2
    ]

catalog = {
    'top_models_spain': top_50_spain,
    'brand_models': brands_catalog
}
with open(os.path.join(out_dir, 'models_catalog.json'), 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

print(f'Generated {active_provinces} province files in {out_dir}/ ({total_bytes / 1024:.1f} KB total).')
print(f'Generated models_catalog.json with {len(top_50_spain)} national top models and {len(brands_catalog)} brands.')


# Compute province bounds
prov_bounds = {}
for prefix, cp_dict in sorted(prov_postals.items()):
    if not cp_dict: continue
    lats = [x['lat'] for x in cp_dict.values() if x['lat'] != 0]
    lngs = [x['lng'] for x in cp_dict.values() if x['lng'] != 0]
    if lats and lngs:
        prov_bounds[prefix] = [
            [round(min(lats) - 0.08, 4), round(min(lngs) - 0.08, 4)],
            [round(max(lats) + 0.08, 4), round(max(lngs) + 0.08, 4)]
        ]

with open(os.path.join(out_dir, 'bounds.json'), 'w', encoding='utf-8') as f:
    json.dump(prov_bounds, f, ensure_ascii=False, indent=2)

# Generate unified all_spain_cp.json
all_spain = {}
for prefix in sorted(prov_postals.keys()):
    cp_file = os.path.join(out_dir, f'cp_{prefix}.json')
    if os.path.exists(cp_file):
        with open(cp_file, 'r', encoding='utf-8') as f:
            all_spain[prefix] = json.load(f)

with open(os.path.join(out_dir, 'all_spain_cp.json'), 'w', encoding='utf-8') as f:
    json.dump(all_spain, f, ensure_ascii=False, separators=(',', ':'))
print('Generated all_spain_cp.json successfully.')

