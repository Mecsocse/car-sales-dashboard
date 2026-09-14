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

class TerritorialMapApp {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.postalLayer = null;
        this.currentData = null;
        this.brandsCatalog = null;
        this.barcelonaPostalData = null;
        this.provinceMarkersMap = {};
        this.isPostalViewActive = false;

        this.init();
    }

    async init() {
        this.initLeaflet();
        this.bindEvents();
        await Promise.all([
            this.loadBrandsCatalog(),
            this.loadPostalData()
        ]);
        await this.fetchAndRender();
    }

    initLeaflet() {
        // Initialize Map centered on Spain
        this.map = L.map('map', {
            center: [40.0, -3.7],
            zoom: 6,
            minZoom: 5,
            maxZoom: 15,
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

    async loadPostalData() {
        try {
            const res = await fetch('/data/geo_barcelona_cp_2026.json');
            if (res.ok) {
                this.barcelonaPostalData = await res.json();
            } else {
                const res2 = await fetch('data/geo_barcelona_cp_2026.json');
                if (res2.ok) {
                    this.barcelonaPostalData = await res2.json();
                }
            }
        } catch (err) {
            console.error('Failed to load Barcelona postal data:', err);
        }
    }

    zoomToBarcelona() {
        this.map.flyTo([41.3879, 2.1699], 9, { duration: 1 });
    }

    handleZoomOrMove() {
        if (!this.barcelonaPostalData) return;

        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();
        // Barcelona bounding box: [lat: 41.1 to 42.3, lng: 1.3 to 2.85]
        const bcnBounds = L.latLngBounds([41.1, 1.3], [42.3, 2.85]);
        const intersectsBcn = bounds.intersects(bcnBounds);

        if (zoom >= 9 && intersectsBcn) {
            // Hide Barcelona province bubble
            const bcnMarker = this.provinceMarkersMap['BARCELONA'];
            if (bcnMarker && this.markersLayer.hasLayer(bcnMarker)) {
                this.markersLayer.removeLayer(bcnMarker);
            }

            this.renderBarcelonaPostals();
            this.showDrilldownBadge(true);
            this.isPostalViewActive = true;
        } else {
            if (this.isPostalViewActive) {
                this.postalLayer.clearLayers();
                const bcnMarker = this.provinceMarkersMap['BARCELONA'];
                if (bcnMarker && !this.markersLayer.hasLayer(bcnMarker)) {
                    bcnMarker.addTo(this.markersLayer);
                }
                this.showDrilldownBadge(false);
                this.isPostalViewActive = false;
            }
        }
    }

    showDrilldownBadge(visible) {
        let badge = document.getElementById('bcn-drilldown-badge');
        if (visible) {
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'bcn-drilldown-badge';
                badge.className = 'bcn-drilldown-badge';
                badge.innerHTML = '<span class="badge-dot"></span><span>Desglose Códigos Postales: Barcelona</span>';
                const wrapper = document.getElementById('map-wrapper');
                if (wrapper) wrapper.appendChild(badge);
            }
            badge.style.display = 'flex';
        } else {
            if (badge) badge.style.display = 'none';
        }
    }

    renderBarcelonaPostals() {
        this.postalLayer.clearLayers();
        if (!this.barcelonaPostalData || this.barcelonaPostalData.length === 0) return;

        const brandSelect = document.getElementById('filter-brand');
        const fuelSelect = document.getElementById('filter-fuel');
        const brand = brandSelect ? brandSelect.value : '';
        const fuel = fuelSelect ? fuelSelect.value : '';

        const activeItems = [];
        let maxUnits = 1;

        this.barcelonaPostalData.forEach(node => {
            let units = 0;
            if (brand) {
                units = node.brands[brand] || 0;
            } else if (fuel) {
                units = node.fuels[fuel] || 0;
            } else {
                units = node.total;
            }

            if (units > 0) {
                if (units > maxUnits) maxUnits = units;
                activeItems.push({ node, units });
            }
        });

        if (activeItems.length === 0) return;

        const colors = this.getBubbleColors(brand, fuel);

        activeItems.forEach(({ node, units }) => {
            const radius = Math.max(4.5, Math.min(26, Math.sqrt(units / maxUnits) * 22));

            const circle = L.circleMarker([node.lat, node.lng], {
                radius: radius,
                fillColor: colors.fill,
                fillOpacity: 0.65,
                color: colors.stroke,
                weight: 1.5,
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
                this.setStyle({ fillOpacity: 0.9, weight: 2.5 });
            });
            circle.on('mouseout', function () {
                this.setStyle({ fillOpacity: 0.65, weight: 1.5 });
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
                ${norm === 'BARCELONA' ? `
                    <div style="margin-top: 10px; padding: 7px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11px; color: #166534; font-weight: 700; text-align: center; cursor: pointer;" onclick="window.TerritorialMap && window.TerritorialMap.zoomToBarcelona()">
                        🔍 Haz zoom para ver el desglose por Códigos Postales
                    </div>
                ` : ''}
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

            // Do not add Barcelona provincial marker if postal view is currently active
            if (this.isPostalViewActive && norm === 'BARCELONA') {
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
                    const targetZoom = norm === 'BARCELONA' ? 9 : 8;
                    this.map.flyTo(latlng, targetZoom, { duration: 1 });
                    if (norm !== 'BARCELONA') {
                        setTimeout(() => marker.openPopup(), 1000);
                    }
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
