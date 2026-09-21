/**
 * CarDataSales - Mapa Territorial de Matriculaciones
 * Leaflet.js interactive bubble map visualization for 52 Spanish provinces
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : (window.location.hostname.includes('cardatasales.com') ? '' : 'https://car-sales-api-jafd.onrender.com');

const DATA_VERSION = '20260918_v3';

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
        this.modelsCatalog = null;
        this.provinceMarkersMap = {};
        this.hiddenProvinceMarkers = new Set();
        this.loadedPostalData = {}; // prefix -> array of postal nodes
        this.activePostalPrefixes = new Set();
        this.isPostalViewActive = false;
        this.viewMode = 'prov'; // 'prov' or 'all_cp'
        this.allSpainDataLoaded = false;
        this.loadingAllSpainPromise = null;
        this.activeAbortController = null;
        this.fetchSequence = 0;
        this.searchIndex = [];

        this.init();
    }

    async init() {
        this.initLeaflet();
        this.bindEvents();
        this.initSearch();
        if (window.lucide) lucide.createIcons();
        await this.loadBrandsCatalog();
        await this.loadModelsCatalog();
        await this.loadSearchIndex();
        await this.fetchAndRender();
    }

    initLeaflet() {
        // Initialize Map centered on Spain with hardware-accelerated canvas for 60fps
        this.map = L.map('map', {
            center: [40.0, -3.7],
            zoom: 6,
            minZoom: 5,
            maxZoom: 17,
            zoomControl: false,
            preferCanvas: true
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

    async setViewMode(mode) {
        if (this.viewMode === mode) return;
        this.viewMode = mode;

        const btnProv = document.getElementById('btn-mode-prov');
        const btnCp = document.getElementById('btn-mode-cp');
        if (btnProv && btnCp) {
            if (mode === 'all_cp') {
                btnProv.classList.remove('active');
                btnCp.classList.add('active');
            } else {
                btnCp.classList.remove('active');
                btnProv.classList.add('active');
            }
        }

        if (mode === 'all_cp') {
            await this.enableAllCpMode();
        } else {
            this.disableAllCpMode();
        }
    }

    async loadAllSpainPostalData() {
        if (this.allSpainDataLoaded) return;
        if (this.loadingAllSpainPromise) return this.loadingAllSpainPromise;

        const loader = document.getElementById('map-loader');
        const loaderSpan = loader ? loader.querySelector('span') : null;
        const originalText = loaderSpan ? loaderSpan.innerText : '';
        if (loader) {
            if (loaderSpan) loaderSpan.innerText = 'Cargando códigos postales de toda España...';
            loader.style.display = 'flex';
        }

        this.loadingAllSpainPromise = (async () => {
            try {
                const res = await fetch(`/data/cp/all_spain_cp.json?v=${DATA_VERSION}`);
                if (res.ok) {
                    const allData = await res.json();
                    Object.entries(allData).forEach(([prefix, items]) => {
                        this.loadedPostalData[prefix] = items;
                    });
                    this.allSpainDataLoaded = true;
                } else {
                    const prefixes = Object.keys(PROVINCIA_BOUNDS);
                    await Promise.all(prefixes.map(async p => {
                        if (!this.loadedPostalData[p]) {
                            try {
                                const r = await fetch(`/data/cp/cp_${p}.json?v=${DATA_VERSION}`);
                                if (r.ok) this.loadedPostalData[p] = await r.json();
                            } catch (e) {}
                        }
                    }));
                    this.allSpainDataLoaded = true;
                }
            } catch (err) {
                console.error('Error loading all_spain_cp.json:', err);
            } finally {
                if (loader) {
                    loader.style.display = 'none';
                    if (loaderSpan) loaderSpan.innerText = originalText;
                }
            }
        })();

        await this.loadingAllSpainPromise;
    }

    async enableAllCpMode() {
        await this.loadAllSpainPostalData();

        // Hide all provincial markers
        this.markersLayer.clearLayers();
        this.hiddenProvinceMarkers.clear();

        // Activate all loaded postal prefixes
        this.activePostalPrefixes = new Set(Object.keys(this.loadedPostalData));
        this.isPostalViewActive = true;

        this.renderActivePostals();
        this.showDrilldownBadge(true, 'Toda España (9.442 CPs)');
    }

    disableAllCpMode() {
        this.postalLayer.clearLayers();
        this.isPostalViewActive = false;

        // Restore provincial bubbles
        if (this.currentData) {
            const brandSelect = document.getElementById('filter-brand');
            const fuelSelect = document.getElementById('filter-fuel');
            const brand = brandSelect ? brandSelect.value : '';
            const fuel = fuelSelect ? fuelSelect.value : '';
            this.renderBubbles(this.currentData, brand, fuel);
        }

        this.handleZoomOrMove();
    }

    async handleZoomOrMove() {
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();

        if (this.viewMode === 'all_cp') {
            // In all_cp mode, postal bubbles are always active regardless of zoom
            if (this.allSpainDataLoaded) {
                this.renderActivePostals();
                this.showDrilldownBadge(true, 'Toda España (9.442 CPs)');
            }
            return;
        }

        // Standard provincial view mode
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
                            const res = await fetch(`/data/cp/cp_${v.prefix}.json?v=${DATA_VERSION}`);
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

        // When zoom < 9 or no provinces visible in standard mode
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
            const prefix = this.viewMode === 'all_cp' ? 'Modo:' : 'Desglose Códigos Postales:';
            badge.innerHTML = `<span class="badge-dot"></span><span>${prefix} ${label || 'España'}</span>`;
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
        const modelSelect = document.getElementById('filter-model');
        const fuelSelect = document.getElementById('filter-fuel');
        const brand = brandSelect ? brandSelect.value : '';
        const model = modelSelect ? modelSelect.value : '';
        const fuel = fuelSelect ? fuelSelect.value : '';

        const bounds = this.map.getBounds();
        const bPad = bounds.pad(0.12);
        const bSouth = bPad.getSouth();
        const bNorth = bPad.getNorth();
        const bWest = bPad.getWest();
        const bEast = bPad.getEast();

        const activeItems = [];
        let maxUnits = 1;

        this.activePostalPrefixes.forEach(prefix => {
            const list = this.loadedPostalData[prefix];
            if (!list) return;

            list.forEach(node => {
                // Viewport bounding check
                if (node.lat < bSouth || node.lat > bNorth || node.lng < bWest || node.lng > bEast) {
                    return;
                }

                let units = 0;
                if (model) {
                    units = (node.models && node.models[model]) || 0;
                } else if (brand) {
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
        const zoom = this.map.getZoom();

        let zoomFactor = 1.0;
        let baseMin = 3.5;
        let weight = 1.5;

        if (zoom <= 6) {
            zoomFactor = 0.42;
            baseMin = 1.8;
            weight = 0.8;
        } else if (zoom === 7) {
            zoomFactor = 0.58;
            baseMin = 2.4;
            weight = 1.0;
        } else if (zoom === 8) {
            zoomFactor = 0.78;
            baseMin = 3.0;
            weight = 1.2;
        } else {
            zoomFactor = 1.0;
            baseMin = 3.5;
            weight = 1.5;
        }

        activeItems.forEach(({ node, units }) => {
            const rawRadius = this.computePostalRadius(units, maxUnits);
            const radius = Math.max(baseMin, rawRadius * zoomFactor);

            // Dynamic opacity & weight based on volume
            let fillOpacity = 0.60;
            if (zoom <= 6) {
                fillOpacity = units >= 10 ? 0.75 : 0.60;
            } else {
                if (units >= 10) {
                    fillOpacity = 0.75;
                    weight = Math.max(weight, 2.0);
                }
                if (units >= 40) {
                    fillOpacity = 0.88;
                    weight = Math.max(weight, 2.5);
                }
            }

            const circle = L.circleMarker([node.lat, node.lng], {
                radius: radius,
                fillColor: colors.fill,
                fillOpacity: fillOpacity,
                color: colors.stroke,
                weight: weight
            });

            // Hover tooltip
            const nodeDisplayName = node.name || 'Municipio';
            const filterLabel = model ? ` (${model})` : (brand ? ` (${brand})` : '');
            circle.bindTooltip(`
                <div style="font-family: inherit; font-size: 12px; font-weight: 700;">
                    CP ${node.cp} - ${nodeDisplayName}: <span style="color: ${colors.fill}; font-size: 13px;">${units.toLocaleString('es-ES')} un.${filterLabel}</span>
                </div>
            `, {
                direction: 'top',
                offset: [0, -radius],
                className: 'bubble-tooltip'
            });

            // Popup detail
            const pctOfCp = node.total > 0 ? Math.round((units / node.total) * 100) : 0;
            let filterNotice = '';
            if (model) {
                filterNotice = `
                    <div class="popup-stat-row">
                        <span style="color: #64748b;">Modelo ${model}:</span>
                        <strong style="color: ${colors.stroke};">${units.toLocaleString('es-ES')} un. (${pctOfCp}% del CP)</strong>
                    </div>
                `;
            } else if (brand) {
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
                        ${node.top_models.map((m, idx) => `
                            <div class="popup-model-line">
                                <span><span class="popup-model-badge">#${idx+1}</span><strong>${m.modelo}</strong></span>
                                <span style="font-weight: 700; color: #0f172a;">${m.total.toLocaleString('es-ES')} un.</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const popupContent = `
                <div class="popup-header">
                    <span class="popup-title">CP ${node.cp}</span>
                    <span class="popup-ccaa">${nodeDisplayName}</span>
                </div>
                <div class="popup-stat-row">
                    <span style="color: #64748b;">Total Turismos (2026):</span>
                    <strong style="font-size: 14px; color: #0f172a;">${(node.total || 0).toLocaleString('es-ES')} un.</strong>
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
        const modelSelect = document.getElementById('filter-model');
        const fuelSelect = document.getElementById('filter-fuel');
        const periodSelect = document.getElementById('filter-period');

        if (brandSelect) {
            brandSelect.addEventListener('change', () => {
                const b = brandSelect.value;
                this.populateModelsDropdown(b);
                this.fetchAndRender();
            });
        }

        if (modelSelect) {
            modelSelect.addEventListener('change', () => this.fetchAndRender());
        }

        [fuelSelect, periodSelect].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.fetchAndRender());
            }
        });

        // View Mode toggle: Provincias vs Todos los CPs
        const btnProv = document.getElementById('btn-mode-prov');
        const btnCp = document.getElementById('btn-mode-cp');
        if (btnProv) {
            btnProv.addEventListener('click', () => this.setViewMode('prov'));
        }
        if (btnCp) {
            btnCp.addEventListener('click', () => this.setViewMode('all_cp'));
        }
    }

    async loadSearchIndex() {
        try {
            const res = await fetch(`/data/cp/cp_search_index.json?v=${DATA_VERSION}`);
            if (res.ok) {
                this.searchIndex = await res.json();
            }
        } catch (err) {
            console.warn('Could not load cp_search_index:', err);
        }
    }

    initSearch() {
        const input = document.getElementById('search-cp-input');
        const clearBtn = document.getElementById('search-cp-clear');
        const resultsEl = document.getElementById('search-cp-results');
        if (!input || !resultsEl) return;

        let debounceTimer = null;
        let selectedIndex = -1;
        let currentMatches = [];

        const renderResults = (matches) => {
            currentMatches = matches;
            selectedIndex = -1;
            if (matches.length === 0) {
                resultsEl.innerHTML = '<div class="search-cp-no-results">No se encontró ningún código postal o municipio</div>';
                resultsEl.style.display = 'block';
                return;
            }
            resultsEl.innerHTML = matches.map((m, idx) => `
                <div class="search-cp-item" data-idx="${idx}">
                    <span class="search-cp-badge">${m.cp}</span>
                    <span class="search-cp-name">${m.name}</span>
                    <span class="search-cp-units">${(m.total || 0).toLocaleString('es-ES')} uds</span>
                </div>
            `).join('');
            resultsEl.style.display = 'block';

            resultsEl.querySelectorAll('.search-cp-item').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.dataset.idx, 10);
                    if (currentMatches[idx]) {
                        this.flyToCp(currentMatches[idx]);
                        resultsEl.style.display = 'none';
                    }
                });
            });
        };

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = input.value.trim();
            if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

            if (val.length < 2) {
                resultsEl.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(() => {
                if (!this.searchIndex || this.searchIndex.length === 0) return;
                const qNorm = normalizeName(val);
                const isNumeric = /^\d+$/.test(val);
                const matches = [];

                for (let i = 0; i < this.searchIndex.length; i++) {
                    const node = this.searchIndex[i];
                    if (isNumeric) {
                        if (node.cp.startsWith(val)) matches.push(node);
                    } else {
                        if (normalizeName(node.name).includes(qNorm) || node.cp.startsWith(val)) {
                            matches.push(node);
                        }
                    }
                    if (matches.length >= 10) break;
                }
                renderResults(matches);
            }, 120);
        });

        input.addEventListener('keydown', (e) => {
            if (resultsEl.style.display === 'none' || currentMatches.length === 0) return;

            const items = resultsEl.querySelectorAll('.search-cp-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentMatches.length - 1);
                items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
                if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                items.forEach((it, i) => it.classList.toggle('selected', i === selectedIndex));
                if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const target = selectedIndex >= 0 ? currentMatches[selectedIndex] : currentMatches[0];
                if (target) {
                    this.flyToCp(target);
                    resultsEl.style.display = 'none';
                }
            } else if (e.key === 'Escape') {
                resultsEl.style.display = 'none';
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                clearBtn.style.display = 'none';
                resultsEl.style.display = 'none';
                input.focus();
            });
        }

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsEl.contains(e.target)) {
                resultsEl.style.display = 'none';
            }
        });
    }

    async flyToCp(node) {
        const input = document.getElementById('search-cp-input');
        if (input) {
            input.value = `${node.cp} - ${node.name}`;
        }
        const clearBtn = document.getElementById('search-cp-clear');
        if (clearBtn) clearBtn.style.display = 'block';

        // 1. Ensure province postal data is loaded
        const prefix = node.prov || node.cp.substring(0, 2);
        if (!this.loadedPostalData[prefix]) {
            try {
                const res = await fetch(`/data/cp/cp_${prefix}.json?v=${DATA_VERSION}`);
                if (res.ok) {
                    this.loadedPostalData[prefix] = await res.json();
                }
            } catch (err) {
                console.warn(`Error loading cp_${prefix}.json:`, err);
            }
        }

        // 2. Smoothly fly map to coordinates at zoom 13
        this.map.flyTo([node.lat, node.lng], 13, { duration: 1.2 });

        // 3. Highlight bubble and trigger popup once arrived
        setTimeout(() => {
            let targetMarker = null;
            this.postalLayer.eachLayer(layer => {
                if (layer.getLatLng) {
                    const ll = layer.getLatLng();
                    const dist = Math.hypot(ll.lat - node.lat, ll.lng - node.lng);
                    if (dist < 0.015) {
                        targetMarker = layer;
                    }
                }
            });

            if (targetMarker) {
                targetMarker.openPopup();
                const el = targetMarker.getElement();
                if (el) {
                    el.classList.add('marker-highlight-pulse');
                    setTimeout(() => el.classList.remove('marker-highlight-pulse'), 4500);
                }
            }
        }, 1350);
    }

    async loadModelsCatalog() {
        try {
            const res = await fetch('/data/cp/models_catalog.json');
            if (res.ok) {
                this.modelsCatalog = await res.json();
                this.populateModelsDropdown();
            }
        } catch (err) {
            console.error('Failed to load models catalog for map:', err);
        }
    }

    populateModelsDropdown(brand = '') {
        const modelSelect = document.getElementById('filter-model');
        if (!modelSelect) return;

        const currentVal = modelSelect.value;
        let html = '<option value="">Todos los modelos</option>';

        if (brand && this.modelsCatalog && this.modelsCatalog.brand_models && this.modelsCatalog.brand_models[brand]) {
            const bModels = this.modelsCatalog.brand_models[brand];
            html = `<option value="">Todos los modelos de ${brand}</option>`;
            bModels.forEach(m => {
                const isSel = (currentVal === m.full_model) ? 'selected' : '';
                html += `<option value="${m.full_model}" ${isSel}>${m.model}</option>`;
            });
        } else if (this.modelsCatalog && this.modelsCatalog.top_models_spain) {
            html += '<optgroup label="Top 50 Modelos más vendidos">';
            this.modelsCatalog.top_models_spain.forEach(m => {
                const isSel = (currentVal === m.full_model) ? 'selected' : '';
                html += `<option value="${m.full_model}" ${isSel}>${m.full_model}</option>`;
            });
            html += '</optgroup>';
        }

        modelSelect.innerHTML = html;
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
        if (fUp.includes('HEV') || fUp.includes('HIBRIDO')) {
            return { stroke: '#15803d', fill: '#22c55e' }; // Fresh green
        }
        if (fUp.includes('DIESEL')) {
            return { stroke: '#334155', fill: '#64748b' }; // Slate
        }
        if (fUp.includes('GLP') || fUp.includes('GAS')) {
            return { stroke: '#0284c7', fill: '#38bdf8' }; // Sky
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
        const brandSelect = document.getElementById('filter-brand');
        const modelSelect = document.getElementById('filter-model');
        const fuelSelect = document.getElementById('filter-fuel');
        const periodSelect = document.getElementById('filter-period');

        const brand = brandSelect ? brandSelect.value : '';
        const model = modelSelect ? modelSelect.value : '';
        const fuel = fuelSelect ? fuelSelect.value : '';
        const periodVal = periodSelect ? periodSelect.value : '2026';

        // Auto-load postal data if model is selected to compute CP ranking
        if (model && !this.allSpainDataLoaded) {
            this.loadAllSpainPostalData().then(() => {
                if (this.viewMode === 'all_cp' || this.isPostalViewActive) {
                    this.renderActivePostals();
                }
                if (this.currentData) {
                    this.renderSidebar(this.currentData, brand, model, fuel);
                }
            });
        }

        // 1. Instant local update for active postal bubbles (0ms latency)
        if (this.viewMode === 'all_cp' || this.isPostalViewActive) {
            this.renderActivePostals();
        }

        // 2. Abort previous in-flight requests to eliminate race conditions
        if (this.activeAbortController) {
            this.activeAbortController.abort();
        }
        this.activeAbortController = new AbortController();
        const signal = this.activeAbortController.signal;
        const currentSeq = ++this.fetchSequence;

        const loader = document.getElementById('map-loader');
        if (loader && this.viewMode !== 'all_cp') {
            loader.style.display = 'flex';
        }

        let q = '';
        if (periodVal.includes('-')) {
            q = `month=${periodVal}&year=${periodVal.split('-')[0]}`;
        } else {
            q = `year=${periodVal}`;
        }
        if (brand) q += `&brand=${encodeURIComponent(brand)}`;
        if (model) q += `&model=${encodeURIComponent(model)}`;
        if (fuel) q += `&fuel=${encodeURIComponent(fuel)}`;

        try {
            const res = await fetch(`${API_BASE}/api/analytics/geo-provincias?${q}`, { signal });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            // Discard if user made a newer filter selection while this was in flight
            if (currentSeq !== this.fetchSequence) {
                return;
            }

            this.currentData = data;
            this.renderSidebar(data, brand, model, fuel);

            if (this.viewMode === 'all_cp') {
                this.markersLayer.clearLayers();
                this.renderActivePostals();
            } else {
                this.renderBubbles(data, brand, fuel);
                this.handleZoomOrMove();
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                return; // Cleanly ignore cancelled request
            }
            console.error('Error fetching geo-provincias data:', err);
        } finally {
            if (currentSeq === this.fetchSequence && loader) {
                loader.style.display = 'none';
            }
        }
    }

    renderBubbles(data, brand, fuel) {
        this.markersLayer.clearLayers();
        this.provinceMarkersMap = {};

        if (this.viewMode === 'all_cp') return;

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
                        ${p.top_models.map((m, idx) => `
                            <div class="popup-model-line">
                                <span><span class="popup-model-badge">#${idx+1}</span><strong>${m.modelo}</strong></span>
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

    renderSidebar(data, brand, model, fuel) {
        const kpiVal = document.getElementById('sidebar-nat-total');
        const kpiSub = document.getElementById('sidebar-filter-desc');
        const rankingContainer = document.getElementById('sidebar-ranking-list');
        const rankingTitle = document.querySelector('.ranking-title');

        if (kpiVal) {
            kpiVal.textContent = (data.national_total || 0).toLocaleString('es-ES');
        }

        if (kpiSub) {
            const mTxt = model ? model : (brand ? brand : 'Todas las marcas');
            const fTxt = fuel ? fuel : 'Todos los carburantes';
            const pTxt = data.month || `Año ${data.year || '2026'}`;
            kpiSub.textContent = `${mTxt} • ${fTxt} • ${pTxt}`;
        }

        if (!rankingContainer) return;

        // If a specific model is selected AND we have postal data, show the CP ranking for that model!
        if (model) {
            if (rankingTitle) {
                rankingTitle.innerHTML = `🏆 Dónde se venden más <strong>${model}</strong>`;
            }

            // Aggregate all CPs that have sales of this model
            const cpMatches = [];
            Object.values(this.loadedPostalData).forEach(nodes => {
                nodes.forEach(n => {
                    const u = (n.models && n.models[model]) || 0;
                    if (u > 0) {
                        cpMatches.push({
                            cp: n.cp,
                            name: n.name,
                            lat: n.lat,
                            lng: n.lng,
                            total: u
                        });
                    }
                });
            });

            if (cpMatches.length > 0) {
                cpMatches.sort((a, b) => b.total - a.total);
                const maxU = cpMatches[0].total;
                const top25 = cpMatches.slice(0, 25);

                let html = '';
                top25.forEach((item, idx) => {
                    const pctBar = Math.max(5, (item.total / maxU) * 100);
                    html += `
                        <div class="ranking-item" data-lat="${item.lat}" data-lng="${item.lng}" data-cp="${item.cp}" style="cursor: pointer;" title="Hacer clic para ver en el mapa">
                            <div class="ranking-item-top">
                                <span><strong>#${idx + 1}</strong> CP ${item.cp} <small style="color: #64748b;">(${item.name})</small></span>
                                <span style="font-weight: 800; color: #0f172a;">${item.total.toLocaleString('es-ES')} un.</span>
                            </div>
                            <div class="ranking-bar-bg">
                                <div class="ranking-bar-fill" style="width: ${pctBar}%; background: linear-gradient(90deg, #2563eb, #3b82f6);"></div>
                            </div>
                        </div>
                    `;
                });

                rankingContainer.innerHTML = html;

                rankingContainer.querySelectorAll('.ranking-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = parseFloat(item.dataset.lat);
                        const lng = parseFloat(item.dataset.lng);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            this.map.flyTo([lat, lng], 13, { duration: 1.2 });
                        }
                    });
                });
                return;
            }
        }

        // Default: Provincial ranking
        if (rankingTitle) {
            rankingTitle.textContent = 'Top Provincias por Volumen';
        }

        if (!data || !data.provinces) return;

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
                } else if (COORDS_NORMALIZED[norm]) {
                    this.map.flyTo(COORDS_NORMALIZED[norm], 9, { duration: 1 });
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
