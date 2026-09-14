/**
 * CarDataSales - Mapa Territorial de Matriculaciones
 * Leaflet.js interactive bubble map visualization for 52 Spanish provinces
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://car-sales-api-jafd.onrender.com';

const PROVINCIA_COORDS = {
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3879, 2.1699],
    'Valencia': [39.4699, -0.3763],
    'Alicante': [38.3452, -0.4810],
    'Sevilla': [37.3891, -5.9845],
    'Málaga': [36.7213, -4.4214],
    'Murcia': [37.9922, -1.1307],
    'Cádiz': [36.5271, -6.2886],
    'Bizkaia': [43.2630, -2.9350],
    'A Coruña': [43.3623, -8.4115],
    'Las Palmas': [28.1235, -15.4363],
    'Santa Cruz de Tenerife': [28.4636, -16.2518],
    'Illes Balears': [39.5696, 2.6502],
    'Asturias': [43.3619, -5.8494],
    'Zaragoza': [41.6488, -0.8891],
    'Pontevedra': [42.4336, -8.6480],
    'Granada': [37.1773, -3.5986],
    'Tarragona': [41.1189, 1.2445],
    'Girona': [41.9794, 2.8214],
    'Córdoba': [37.8882, -4.7794],
    'Almería': [36.8381, -2.4597],
    'Toledo': [39.8628, -4.0273],
    'Badajoz': [38.8794, -6.9706],
    'Navarra': [42.8125, -1.6458],
    'Jaén': [37.7796, -3.7849],
    'Castellón': [39.9864, -0.0513],
    'Cantabria': [43.4623, -3.8099],
    'Huelva': [37.2614, -6.9447],
    'Valladolid': [41.6523, -4.7245],
    'Ciudad Real': [38.9848, -3.9274],
    'León': [42.5987, -5.5671],
    'Lleida': [41.6176, 0.6200],
    'Albacete': [38.9943, -1.8585],
    'Cáceres': [39.4753, -6.3724],
    'Burgos': [42.3440, -3.6969],
    'Álava': [42.8469, -2.6716],
    'Salamanca': [40.9701, -5.6635],
    'Lugo': [43.0125, -7.5558],
    'Ourense': [42.3358, -7.8639],
    'Gipuzkoa': [43.3183, -1.9812],
    'La Rioja': [42.4658, -2.4499],
    'Guadalajara': [40.6327, -3.1673],
    'Huesca': [42.1362, -0.4087],
    'Cuenca': [40.0704, -2.1374],
    'Zamora': [41.5033, -5.7446],
    'Palencia': [42.0095, -4.5288],
    'Ávila': [40.6567, -4.6813],
    'Segovia': [40.9429, -4.1088],
    'Teruel': [40.3456, -1.1072],
    'Soria': [41.7640, -2.4688],
    'Ceuta': [35.8894, -5.3198],
    'Melilla': [35.2923, -2.9381]
};

function normalizeName(str) {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

const COORDS_NORMALIZED = {};
Object.entries(PROVINCIA_COORDS).forEach(([k, v]) => {
    COORDS_NORMALIZED[normalizeName(k)] = v;
});

const PROVINCIA_PREFIX = {
    'ALAVA': '01', 'ARABA': '01', 'ALBACETE': '02', 'ALICANTE': '03', 'ALACANT': '03',
    'ALMERIA': '04', 'AVILA': '05', 'BADAJOZ': '06', 'ILLES BALEARS': '07', 'BALEARES': '07',
    'BARCELONA': '08', 'BURGOS': '09', 'CACERES': '10', 'CADIZ': '11', 'CASTELLON': '12',
    'CASTELLO': '12', 'CIUDAD REAL': '13', 'CORDOBA': '14', 'A CORUNA': '15', 'LA CORUNA': '15',
    'CUENCA': '16', 'GIRONA': '17', 'GERONA': '17', 'GRANADA': '18', 'GUADALAJARA': '19',
    'GIPUZKOA': '20', 'GUIPUZCOA': '20', 'HUELVA': '21', 'HUESCA': '22', 'JAEN': '23',
    'LEON': '24', 'LLEIDA': '25', 'LERIDA': '25', 'LA RIOJA': '26', 'RIOJA': '26',
    'LUGO': '27', 'MADRID': '28', 'MALAGA': '29', 'MURCIA': '30', 'NAVARRA': '31',
    'OURENSE': '32', 'ORENSE': '32', 'ASTURIAS': '33', 'PALENCIA': '34', 'LAS PALMAS': '35',
    'PONTEVEDRA': '36', 'SALAMANCA': '37', 'SANTA CRUZ DE TENERIFE': '38', 'TENERIFE': '38',
    'CANTABRIA': '39', 'SEGOVIA': '40', 'SEVILLA': '41', 'SORIA': '42', 'TARRAGONA': '43',
    'TERUEL': '44', 'TOLEDO': '45', 'VALENCIA': '46', 'VALLADOLID': '47',
    'BIZKAIA': '48', 'VIZCAYA': '48', 'ZAMORA': '49', 'ZARAGOZA': '50', 'CEUTA': '51',
    'MELILLA': '52'
};

const PREFIX_TO_NAME = {
    '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
    '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
    '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
    '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
    '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
    '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
    '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
    '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
    '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo',
    '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza',
    '51': 'Ceuta', '52': 'Melilla'
};

const PROVINCIA_BOUNDS = {
    '01': [[42.39, -3.23], [43.26, -2.19]], '02': [[38.01, -2.85], [39.46, -0.88]], '03': [[37.76, -1.19], [39.40, 0.25]],
    '04': [[36.60, -3.16], [37.81, -1.56]], '05': [[40.05, -5.74], [41.22, -4.15]], '06': [[37.96, -7.38], [39.46, -4.68]],
    '07': [[38.56, 1.18], [40.10, 4.39]], '08': [[41.10, 1.31], [42.35, 2.85]], '09': [[41.40, -4.34], [43.22, -2.52]],
    '10': [[39.03, -7.44], [40.55, -5.10]], '11': [[35.95, -6.53], [37.03, -5.07]], '12': [[39.65, -0.80], [40.82, 0.58]],
    '13': [[38.30, -5.07], [39.58, -2.60]], '14': [[37.13, -5.66], [38.70, -2.88]], '15': [[42.27, -9.36], [43.84, -7.64]],
    '16': [[39.17, -3.23], [40.69, -1.15]], '17': [[41.30, 1.73], [42.56, 3.39]], '18': [[36.60, -4.36], [37.91, -2.38]],
    '19': [[40.08, -3.56], [41.37, -1.49]], '20': [[42.87, -2.63], [43.47, -1.68]], '21': [[36.91, -7.57], [38.24, -6.12]],
    '22': [[41.37, -0.92], [42.88, 0.82]], '23': [[37.31, -4.31], [38.56, -2.40]], '24': [[41.97, -7.11], [43.27, -4.75]],
    '25': [[41.01, 0.25], [42.93, 2.28]], '26': [[41.86, -3.20], [42.72, -1.65]], '27': [[42.21, -8.48], [43.80, -6.87]],
    '28': [[39.90, -4.59], [41.23, -3.00]], '29': [[36.25, -5.44], [37.37, -3.51]], '30': [[37.30, -2.25], [38.71, -0.59]],
    '31': [[41.82, -2.58], [43.39, -0.82]], '32': [[41.74, -8.85], [43.27, -6.75]], '33': [[42.82, -7.24], [43.73, -4.47]],
    '34': [[41.69, -5.07], [43.06, -3.90]], '35': [[27.63, -16.67], [29.26, -13.36]], '36': [[41.80, -8.97], [43.48, -7.80]],
    '37': [[40.18, -6.92], [41.37, -5.05]], '38': [[27.54, -18.20], [28.93, -16.05]], '39': [[42.69, -4.87], [43.58, -3.07]],
    '40': [[40.61, -4.79], [41.62, -3.26]], '41': [[36.75, -6.61], [38.19, -4.57]], '42': [[40.99, -3.46], [42.20, -1.71]],
    '43': [[40.44, 0.15], [41.63, 2.08]], '44': [[39.81, -1.82], [41.39, 0.37]], '45': [[39.31, -5.38], [40.34, -2.90]],
    '46': [[38.59, -1.53], [40.25, 0.20]], '47': [[41.04, -5.60], [42.37, -3.96]], '48': [[42.94, -3.54], [43.52, -2.15]],
    '49': [[41.06, -7.06], [42.27, -5.21]], '50': [[40.89, -2.20], [42.77, 0.43]], '51': [[35.78, -5.44], [35.99, -5.20]],
    '52': [[35.17, -3.05], [35.40, -2.84]]
};

class TerritorialMapApp {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.postalLayer = null;
        this.currentData = null;
        this.brandsCatalog = null;
        this.provinceMarkersMap = {};
        this.hiddenProvinceMarkers = new Set();
        this.loadedPostalData = {}; // prefix -> array of postal nodes
        this.activePostalPrefixes = new Set();
        this.isPostalViewActive = false;

        this.init();
    }

    async init() {
        this.initLeaflet();
        this.bindEvents();
        await this.loadBrandsCatalog();
        await this.fetchAndRender();
    }

    initLeaflet() {
        // Initialize Map centered on Spain
        this.map = L.map('map', {
            center: [40.0, -3.7],
            zoom: 6,
            minZoom: 5,
            maxZoom: 17,
            zoomControl: false
        });

        // Add Zoom Control to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Clean OpenStreetMap tiles (No API key required, 100% free and reliable)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Fuente: DGT',
            maxZoom: 18
        }).addTo(this.map);

        this.markersLayer = L.layerGroup().addTo(this.map);
        this.postalLayer = L.layerGroup().addTo(this.map);

        // Listen to zoom and movement
        this.map.on('zoomend moveend', () => this.handleZoomOrMove());
    }

    zoomToProvince(provName) {
        const norm = normalizeName(provName);
        const coords = COORDS_NORMALIZED[norm];
        if (coords) {
            this.map.flyTo(coords, 9, { duration: 1 });
        }
    }

    async handleZoomOrMove() {
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();

        if (zoom >= 9) {
            // Find which provinces intersect the current viewport bounds
            const visible = [];
            Object.entries(PROVINCIA_BOUNDS).forEach(([prefix, pBbox]) => {
                const provLatLngBounds = L.latLngBounds(pBbox[0], pBbox[1]);
                if (bounds.intersects(provLatLngBounds)) {
                    const provName = PREFIX_TO_NAME[prefix] || `Provincia ${prefix}`;
                    const norm = normalizeName(provName);
                    visible.push({ prefix, provName, norm });
                }
            });

            if (visible.length > 0) {
                // Hide provincial markers for visible provinces
                visible.forEach(v => {
                    const marker = this.provinceMarkersMap[v.norm];
                    if (marker && this.markersLayer.hasLayer(marker)) {
                        this.markersLayer.removeLayer(marker);
                        this.hiddenProvinceMarkers.add(v.norm);
                    }
                });

                // Restore markers for provinces that panned out of view
                const visibleNorms = new Set(visible.map(v => v.norm));
                this.hiddenProvinceMarkers.forEach(norm => {
                    if (!visibleNorms.has(norm)) {
                        const marker = this.provinceMarkersMap[norm];
                        if (marker && !this.markersLayer.hasLayer(marker)) {
                            marker.addTo(this.markersLayer);
                        }
                        this.hiddenProvinceMarkers.delete(norm);
                    }
                });

                // Fetch postal JSONs for visible provinces
                const loads = visible.map(async v => {
                    if (!this.loadedPostalData[v.prefix]) {
                        try {
                            const res = await fetch(`/data/cp/cp_${v.prefix}.json`);
                            if (res.ok) {
                                this.loadedPostalData[v.prefix] = await res.json();
                            }
                        } catch (err) {
                            console.warn(`Error loading cp_${v.prefix}.json:`, err);
                        }
                    }
                });
                await Promise.all(loads);

                this.activePostalPrefixes = new Set(visible.map(v => v.prefix));
                this.renderActivePostals();

                const provNames = visible.map(v => v.provName);
                const label = provNames.length <= 2 
                    ? provNames.join(', ') 
                    : `${provNames.slice(0, 2).join(', ')} (+${provNames.length - 2})`;
                this.showDrilldownBadge(true, label);
                this.isPostalViewActive = true;
                return;
            }
        }

        // When zoom < 9 or no provinces visible
        if (this.isPostalViewActive) {
            this.postalLayer.clearLayers();
            this.hiddenProvinceMarkers.forEach(norm => {
                const marker = this.provinceMarkersMap[norm];
                if (marker && !this.markersLayer.hasLayer(marker)) {
                    marker.addTo(this.markersLayer);
                }
            });
            this.hiddenProvinceMarkers.clear();
            this.activePostalPrefixes.clear();
            this.showDrilldownBadge(false);
            this.isPostalViewActive = false;
        }
    }

    showDrilldownBadge(visible, label) {
        let badge = document.getElementById('bcn-drilldown-badge');
        if (visible) {
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'bcn-drilldown-badge';
                badge.className = 'bcn-drilldown-badge';
                const wrapper = document.getElementById('map-wrapper');
                if (wrapper) wrapper.appendChild(badge);
            }
            badge.innerHTML = `<span class="badge-dot"></span><span>Desglose Códigos Postales: ${label || 'España'}</span>`;
            badge.style.display = 'flex';
        } else {
            if (badge) badge.style.display = 'none';
        }
    }

    computePostalRadius(units, maxUnits) {
        if (units <= 0) return 0;
        if (units === 1) return 3.5;
        if (units === 2) return 5.0;
        if (maxUnits <= 2) return 5.0;
        // Logarithmic scale so medium volumes (10-30 units) stand out clearly
        const ratio = Math.log(units) / Math.log(maxUnits);
        return Math.max(3.5, Math.min(27, 5.0 + ratio * 22));
    }

    renderActivePostals() {
        this.postalLayer.clearLayers();

        const brandSelect = document.getElementById('filter-brand');
        const fuelSelect = document.getElementById('filter-fuel');
        const brand = brandSelect ? brandSelect.value : '';
        const fuel = fuelSelect ? fuelSelect.value : '';

        const activeItems = [];
        let maxUnits = 1;

        this.activePostalPrefixes.forEach(prefix => {
            const list = this.loadedPostalData[prefix];
            if (!list) return;

            list.forEach(node => {
                let units = 0;
                if (brand) {
                    units = (node.brands && node.brands[brand]) || 0;
                } else if (fuel) {
                    units = (node.fuels && node.fuels[fuel]) || 0;
                } else {
                    units = node.total || 0;
                }

                if (units > 0) {
                    if (units > maxUnits) maxUnits = units;
                    activeItems.push({ node, units });
                }
            });
        });

        if (activeItems.length === 0) return;

        const colors = this.getBubbleColors(brand, fuel);

        activeItems.forEach(({ node, units }) => {
            const radius = this.computePostalRadius(units, maxUnits);

            // Dynamic opacity & weight based on volume
            let fillOpacity = 0.55;
            let weight = 1.5;
            if (units >= 10) {
                fillOpacity = 0.72;
                weight = 2.0;
            }
            if (units >= 40) {
                fillOpacity = 0.85;
                weight = 2.5;
            }

            const circle = L.circleMarker([node.lat, node.lng], {
                radius: radius,
                fillColor: colors.fill,
                fillOpacity: fillOpacity,
                color: colors.stroke,
                weight: weight,
                className: 'interactive-bubble'
            });

            // Hover tooltip
            circle.bindTooltip(`
                <div style="font-family: inherit; font-size: 12px; font-weight: 700;">
                    CP ${node.cp} - ${node.name}: <span style="color: ${colors.fill}; font-size: 13px;">${units.toLocaleString('es-ES')} un.</span>
                </div>
            `, {
                direction: 'top',
                offset: [0, -radius],
                className: 'bubble-tooltip'
            });

            // Popup detail
            const pctOfCp = node.total > 0 ? Math.round((units / node.total) * 100) : 0;
            let filterNotice = '';
            if (brand) {
                filterNotice = `
                    <div class="popup-stat-row">
                        <span style="color: #64748b;">Marca ${brand}:</span>
                        <strong style="color: ${colors.stroke};">${units.toLocaleString('es-ES')} un. (${pctOfCp}% del CP)</strong>
                    </div>
                `;
            } else if (fuel) {
                filterNotice = `
                    <div class="popup-stat-row">
                        <span style="color: #64748b;">Motor ${fuel}:</span>
                        <strong style="color: ${colors.stroke};">${units.toLocaleString('es-ES')} un. (${pctOfCp}% del CP)</strong>
                    </div>
                `;
            }

            let topModelsHtml = '';
            if (node.top_models && node.top_models.length > 0) {
                topModelsHtml = `
                    <div class="popup-top-models">
                        <div class="popup-models-title">Top Modelos en CP ${node.cp} (2026)</div>
                        ${node.top_models.map(m => `
                            <div class="popup-model-line">
                                <span><strong>${m.modelo}</strong></span>
                                <span style="font-weight: 700; color: #0f172a;">${m.total.toLocaleString('es-ES')} un.</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const popupContent = `
                <div class="popup-header">
                    <span class="popup-title">CP ${node.cp}</span>
                    <span class="popup-ccaa">${node.name}</span>
                </div>
                <div class="popup-stat-row">
                    <span style="color: #64748b;">Total Turismos (2026):</span>
                    <strong style="font-size: 14px; color: #0f172a;">${node.total.toLocaleString('es-ES')} un.</strong>
                </div>
                ${filterNotice}
                ${topModelsHtml}
            `;

            circle.bindPopup(popupContent);

            circle.on('mouseover', function () {
                this.setStyle({ fillOpacity: 0.95, weight: 3 });
            });
            circle.on('mouseout', function () {
                this.setStyle({ fillOpacity: fillOpacity, weight: weight });
            });

            circle.addTo(this.postalLayer);
        });
    }

    bindEvents() {
        const brandSelect = document.getElementById('filter-brand');
        const fuelSelect = document.getElementById('filter-fuel');
        const periodSelect = document.getElementById('filter-period');

        [brandSelect, fuelSelect, periodSelect].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.fetchAndRender());
            }
        });
    }

    async loadBrandsCatalog() {
        try {
            const res = await fetch(`${API_BASE}/api/models/catalog`);
            if (res.ok) {
                this.brandsCatalog = await res.json();
                const brandSelect = document.getElementById('filter-brand');
                if (brandSelect) {
                    const brands = Object.keys(this.brandsCatalog).sort();
                    let html = '<option value="">Todas las marcas</option>';
                    brands.forEach(b => {
                        html += `<option value="${b}">${b}</option>`;
                    });
                    brandSelect.innerHTML = html;
                }
            }
        } catch (err) {
            console.error('Failed to load brands catalog for map:', err);
        }
    }

    getBubbleColors(brand, fuel) {
        const fUp = (fuel || '').toUpperCase();
        const bUp = (brand || '').toUpperCase();

        if (fUp.includes('ELECTRICO') || fUp.includes('BEV')) {
            return { stroke: '#059669', fill: '#10b981' }; // Emerald green
        }
        if (fUp.includes('PHEV') || fUp.includes('ENCHUFABLE')) {
            return { stroke: '#0891b2', fill: '#06b6d4' }; // Cyan
        }
        if (bUp === 'TESLA') {
            return { stroke: '#be123c', fill: '#e11d48' }; // Tesla Rose Red
        }
        if (bUp === 'DACIA') {
            return { stroke: '#b45309', fill: '#f59e0b' }; // Amber
        }
        if (bUp === 'TOYOTA') {
            return { stroke: '#b91c1c', fill: '#ef4444' }; // Red
        }
        return { stroke: '#1d4ed8', fill: '#2563eb' }; // Royal Blue
    }

    async fetchAndRender() {
        const loader = document.getElementById('map-loader');
        if (loader) loader.style.display = 'flex';

        const brandSelect = document.getElementById('filter-brand');
        const fuelSelect = document.getElementById('filter-fuel');
        const periodSelect = document.getElementById('filter-period');

        const brand = brandSelect ? brandSelect.value : '';
        const fuel = fuelSelect ? fuelSelect.value : '';
        const periodVal = periodSelect ? periodSelect.value : '2026';

        let q = '';
        if (periodVal.includes('-')) {
            q = `month=${periodVal}&year=${periodVal.split('-')[0]}`;
        } else {
            q = `year=${periodVal}`;
        }
        if (brand) q += `&brand=${encodeURIComponent(brand)}`;
        if (fuel) q += `&fuel=${encodeURIComponent(fuel)}`;

        try {
            const res = await fetch(`${API_BASE}/api/analytics/geo-provincias?${q}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            this.currentData = data;

            this.renderBubbles(data, brand, fuel);
            this.renderSidebar(data, brand, fuel);
            this.handleZoomOrMove();
        } catch (err) {
            console.error('Error fetching geo-provincias data:', err);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    renderBubbles(data, brand, fuel) {
        this.markersLayer.clearLayers();
        this.provinceMarkersMap = {};

        if (!data || !data.provinces || data.provinces.length === 0) return;

        const maxTotal = Math.max(...data.provinces.map(p => p.total), 1);
        const colors = this.getBubbleColors(brand, fuel);

        data.provinces.forEach(p => {
            const norm = normalizeName(p.provincia);
            let coords = COORDS_NORMALIZED[norm];

            // Fallback for special accents or partial names
            if (!coords) {
                const match = Object.keys(COORDS_NORMALIZED).find(k => k.includes(norm) || norm.includes(k));
                if (match) coords = COORDS_NORMALIZED[match];
            }

            if (!coords || p.total <= 0) return;

            // Compute proportional radius (min 8px, max 46px)
            const radius = Math.max(8, Math.min(46, Math.sqrt(p.total / maxTotal) * 38));

            const circle = L.circleMarker(coords, {
                radius: radius,
                fillColor: colors.fill,
                fillOpacity: 0.55,
                color: colors.stroke,
                weight: 2,
                className: 'interactive-bubble'
            });

            // Hover tooltip
            circle.bindTooltip(`
                <div style="font-family: inherit; font-size: 12px; font-weight: 700;">
                    ${p.provincia}: <span style="color: ${colors.fill}; font-size: 13px;">${p.total.toLocaleString('es-ES')} un.</span>
                </div>
            `, {
                direction: 'top',
                offset: [0, -radius],
                className: 'bubble-tooltip'
            });

            // Popup content with Top Models
            let topModelsHtml = '';
            if (p.top_models && p.top_models.length > 0) {
                topModelsHtml = `
                    <div class="popup-top-models">
                        <div class="popup-models-title">Top Modelos en ${p.provincia}</div>
                        ${p.top_models.map(m => `
                            <div class="popup-model-line">
                                <span><strong>${m.modelo}</strong></span>
                                <span style="font-weight: 700; color: #0f172a;">${m.total.toLocaleString('es-ES')} un.</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const popupContent = `
                <div class="popup-header">
                    <span class="popup-title">${p.provincia}</span>
                    <span class="popup-ccaa">${p.ccaa}</span>
                </div>
                <div class="popup-stat-row">
                    <span style="color: #64748b;">Matriculaciones:</span>
                    <strong style="font-size: 15px; color: ${colors.stroke};">${p.total.toLocaleString('es-ES')} un.</strong>
                </div>
                <div class="popup-stat-row">
                    <span style="color: #64748b;">Cuota nacional:</span>
                    <strong>${p.share}%</strong>
                </div>
                ${topModelsHtml}
                <div style="margin-top: 10px; padding: 7px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11px; color: #166534; font-weight: 700; text-align: center; cursor: pointer;" onclick="window.TerritorialMap && window.TerritorialMap.zoomToProvince('${p.provincia}')">
                    🔍 Ver desglose por Códigos Postales
                </div>
            `;

            circle.bindPopup(popupContent);

            // Hover styling feedback
            circle.on('mouseover', function () {
                this.setStyle({ fillOpacity: 0.85, weight: 3 });
            });
            circle.on('mouseout', function () {
                this.setStyle({ fillOpacity: 0.55, weight: 2 });
            });

            this.provinceMarkersMap[norm] = circle;

            // Do not add provincial marker if postal view is currently active for this province
            if (this.hiddenProvinceMarkers.has(norm)) {
                return;
            }

            circle.addTo(this.markersLayer);
        });
    }

    renderSidebar(data, brand, fuel) {
        const kpiVal = document.getElementById('sidebar-nat-total');
        const kpiSub = document.getElementById('sidebar-filter-desc');
        const rankingContainer = document.getElementById('sidebar-ranking-list');

        if (kpiVal) {
            kpiVal.textContent = (data.national_total || 0).toLocaleString('es-ES');
        }

        if (kpiSub) {
            const bTxt = brand ? brand : 'Todas las marcas';
            const fTxt = fuel ? fuel : 'Todos los carburantes';
            const pTxt = data.month || `Año ${data.year || '2026'}`;
            kpiSub.textContent = `${bTxt} • ${fTxt} • ${pTxt}`;
        }

        if (!rankingContainer || !data.provinces) return;

        const maxTotal = Math.max(...data.provinces.map(p => p.total), 1);
        const top15 = data.provinces.slice(0, 15);

        let html = '';
        top15.forEach((p, idx) => {
            const pctBar = Math.max(5, (p.total / maxTotal) * 100);
            const norm = normalizeName(p.provincia);
            html += `
                <div class="ranking-item" data-norm="${norm}">
                    <div class="ranking-item-top">
                        <span><strong>#${idx + 1}</strong> ${p.provincia}</span>
                        <span>${p.total.toLocaleString('es-ES')} <small style="color: #64748b; font-weight: 500;">(${p.share}%)</small></span>
                    </div>
                    <div class="ranking-bar-bg">
                        <div class="ranking-bar-fill" style="width: ${pctBar}%;"></div>
                    </div>
                </div>
            `;
        });

        rankingContainer.innerHTML = html;

        // Click on ranking item to fly to province
        rankingContainer.querySelectorAll('.ranking-item').forEach(item => {
            item.addEventListener('click', () => {
                const norm = item.dataset.norm;
                const marker = this.provinceMarkersMap[norm];
                if (marker) {
                    const latlng = marker.getLatLng();
                    this.map.flyTo(latlng, 9, { duration: 1 });
                }
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.TerritorialMap = new TerritorialMapApp();
    if (window.lucide) lucide.createIcons();
});
