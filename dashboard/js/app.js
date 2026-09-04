// BUILD_STAMP_20260815_1325_PRODUCTION_NEW
// app.js - Main Application Logic

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isFile = window.location.protocol === 'file:' || window.location.hostname === '';
const API_BASE = isLocal ? '' : (isFile ? 'http://127.0.0.1:8000' : 'https://car-sales-api-jafd.onrender.com');

document.addEventListener('DOMContentLoaded', () => {
    window.App = new DashboardApp();
    window.App.init();
});

class DashboardApp {
    constructor() {
        const now = new Date();
        const curY = now.getFullYear().toString();
        const curM = `${curY}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        this.currentPage = 1;
        this.limit = 50;
        this.currentPeriod = 'month';
        this.selectedMonth = curM; // Dynamic Current Month = e.g. '2026-09'
        if (window.location.pathname.includes('agosto-2026') || window.location.search.includes('agosto-2026') || window.location.search.includes('2026-08')) {
            this.selectedMonth = '2026-08';
        }
        this.selectedYear = '2026';
        this.selectedCcaa = '';
        this.currentCountry = 'es';
        this.currentMode = 'live';

        this.matrixLimit = 20; // Default Top 20 for Monthly Matrix
        this.modelsLimit = 10;
        this.evLimit = 10;
        this.brandsLimit = 10;
        this.evBrandsLimit = 10;
        this.matrixSortBy = monthsShort[now.getMonth()] || 'sep';
        this.matrixSortDir = 'desc';

        // Electrification Toggle States
        this.kpiQuotaMode = 'bev';
        this.evModelsMode = 'bev';
        this.evBrandsMode = 'bev';
        this.chartQuotaMode = 'bev';

        // Active filters state
        this.filters = {
            brand: '',
            model: '',
            fuel: '',
            province: '',
            ccaa: '',
            date_from: '',
            date_to: ''
        };

        // DOM Elements
        this.applyFiltersBtn = document.getElementById('apply-filters');
        this.exportCsvBtn = document.getElementById('export-csv');
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.pageInfo = document.getElementById('page-info');
        this.activePeriodTag = document.getElementById('active-period-tag');
        this.quickMonthSelect = document.getElementById('quick-month-select');
        this.quickYearSelect = document.getElementById('quick-year-select');
        this.quickCcaaSelect = document.getElementById('quick-ccaa-select');
        this.ccaaFilter = document.getElementById('ccaa-filter');
        this.singleDatePicker = document.getElementById('single-date-picker');

        this.brandFilter = document.getElementById('brand-filter');
        this.modelFilter = document.getElementById('model-filter');
        this.fuelFilter = document.getElementById('fuel-filter');
        this.provinceFilter = document.getElementById('province-filter');
        this.dateFromFilter = document.getElementById('date-from');
        this.dateToFilter = document.getElementById('date-to');

        // Compare Controls
        this.compareMonthA = document.getElementById('compare-month-a');
        this.compareMonthB = document.getElementById('compare-month-b');
        this.btnCompare = document.getElementById('btn-compare');
        this.compareTableBody = document.getElementById('compare-table-body');

        // Matrix Search & Show More
        this.matrixSearchInput = document.getElementById('matrix-search');
        this.matrixTableBody = document.getElementById('matrix-table-body');
        this.btnLoadMoreMatrix = document.getElementById('btn-load-more-matrix');
    }

    async init() {
        try {
            // Invalidate and remove old local storage caches (keep only current version)
            try {
                const CURRENT_CACHE_PREFIX = 'dashboard_all_data_v20260903_v2_';
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('dashboard_all_data_') || k.startsWith('dash_cache_')) {
                        if (!k.startsWith(CURRENT_CACHE_PREFIX)) localStorage.removeItem(k);
                    }
                });
            } catch(e) {}

            this.populateQuickMonthDropdown();
            this.populateHistoricalCompareDropdowns();
            this.updatePeriodTag();
            this.bindPeriodEvents();
            this.bindEvents();
            this.bindCompareEvents();
            this.bindMatrixEvents();
            this.bindBrandModalEvents();
            this.bindAuxModalsEvents();
            this.bindElectrificationToggles();

            this.loadLatestPlate();
            await this.loadInitialDropdowns();
            await this.refreshAll();
            await this.loadMonthComparison();
            await this.loadMonthlyMatrix('', this.matrixLimit);

            // Init AI Insights
            if (window.AIInsightsWidget) {
                this.insightsWidget = new window.AIInsightsWidget('ai-insights');
                this.insightsWidget.fetchInsight(this.getFullQueryParams());
            }

        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    populateQuickMonthDropdown() {
        if (!this.quickMonthSelect) return;
        const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonthNum = now.getMonth() + 1;
        const curMonthCode = `${curYear}-${curMonthNum.toString().padStart(2, '0')}`;

        if (!this.selectedMonth) {
            this.selectedMonth = curMonthCode;
        }

        const years = [curYear, curYear - 1, curYear - 2];

        let html = '<option value="" style="font-weight:700; color:#94a3b8;">-- Seleccionar Mes --</option>';

        years.forEach(yr => {
            const maxM = yr === curYear ? curMonthNum : 12;
            for (let m = maxM; m >= 1; m--) {
                const mCode = `${yr}-${m.toString().padStart(2, '0')}`;
                const isCurrent = mCode === curMonthCode;
                const mLabel = isCurrent ? `${monthsName[m - 1]} ${yr} (Mes Actual)` : `${monthsName[m - 1]} ${yr}`;
                const sel = mCode === this.selectedMonth ? 'selected' : '';
                html += `<option value="${mCode}" ${sel}>${mLabel}</option>`;
            }
        });

        this.quickMonthSelect.innerHTML = html;
        if (this.selectedMonth) {
            this.quickMonthSelect.value = this.selectedMonth;
        }
    }

    populateHistoricalCompareDropdowns() {
        if (!this.compareMonthA || !this.compareMonthB) return;

        const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonthNum = now.getMonth() + 1;
        const curMonthCode = `${curYear}-${curMonthNum.toString().padStart(2, '0')}`;
        const prevYearMonthCode = `${curYear - 1}-${curMonthNum.toString().padStart(2, '0')}`;

        const years = [curYear, curYear - 1, curYear - 2];

        let optionsHtmlA = '';
        let optionsHtmlB = '';

        years.forEach(yr => {
            const maxM = yr === curYear ? curMonthNum : 12;
            for (let m = maxM; m >= 1; m--) {
                const mCode = `${yr}-${m.toString().padStart(2, '0')}`;
                const mLabel = `${monthsName[m - 1]} ${yr}`;
                
                const selA = mCode === curMonthCode ? 'selected' : '';
                const selB = mCode === prevYearMonthCode ? 'selected' : '';

                optionsHtmlA += `<option value="${mCode}" ${selA}>${mLabel}</option>`;
                optionsHtmlB += `<option value="${mCode}" ${selB}>${mLabel}</option>`;
            }
        });

        this.compareMonthA.innerHTML = optionsHtmlA;
        this.compareMonthB.innerHTML = optionsHtmlB;
    }

    async checkAndUpdateDayPills() {
        const pillToday = document.getElementById('pill-today');
        const pillYesterday = document.getElementById('pill-yesterday');
        if (!pillToday || !pillYesterday) return;

        // Get system current date (formatted YYYY-MM-DD)
        const todayObj = new Date();
        const yyyy = todayObj.getFullYear();
        const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
        const dd = String(todayObj.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const todayFormatted = `${dd}/${mm}/${yyyy}`;

        // Fetch latest available date from API summary
        try {
            const res = await fetch('/api/registrations/summary?period=today').catch(() => null);
            let latestDateInDb = null;
            if (res && res.ok) {
                const data = await res.json();
                latestDateInDb = data.fecha;
            }

            // Update Hoy pill button text with today's date
            pillToday.textContent = `⚡ Hoy (${todayFormatted})`;

            // If today's date is not in DB, disable the "Hoy" button
            if (!latestDateInDb || latestDateInDb !== todayStr) {
                pillToday.disabled = true;
                pillToday.title = `Aún no hay datos disponibles para hoy (${todayFormatted})`;
                pillToday.classList.add('disabled');
            } else {
                pillToday.disabled = false;
                pillToday.title = `Ver datos de hoy (${todayFormatted})`;
                pillToday.classList.remove('disabled');
            }

            // Also format Yesterday pill with actual date if available
            if (latestDateInDb) {
                const parts = latestDateInDb.split('-');
                if (parts.length === 3) {
                    const yestFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    pillYesterday.textContent = `⏮️ Último día (${yestFormatted})`;
                }
            }
        } catch (err) {
            console.error('Failed to check daily dates:', err);
            pillToday.textContent = `⚡ Hoy (${todayFormatted})`;
        }
    }

    readFiltersFromDOM() {
        this.filters.brand = this.brandFilter ? this.brandFilter.value : '';
        this.filters.model = this.modelFilter ? this.modelFilter.value : '';
        this.filters.fuel = this.fuelFilter ? this.fuelFilter.value : '';
        this.filters.province = this.provinceFilter ? this.provinceFilter.value : '';
        this.filters.ccaa = this.selectedCcaa || (this.ccaaFilter ? this.ccaaFilter.value : '');

        if (this.singleDatePicker && this.singleDatePicker.value) {
            this.filters.date_from = this.singleDatePicker.value;
            this.filters.date_to = this.singleDatePicker.value;
        } else {
            this.filters.date_from = this.dateFromFilter ? this.dateFromFilter.value : '';
            this.filters.date_to = this.dateToFilter ? this.dateToFilter.value : '';
        }
    }

    getFullQueryParams() {
        this.readFiltersFromDOM();
        const isDateMode = !!(this.filters.date_from || this.filters.date_to || this.currentPeriod === 'custom_date');
        const params = {
            country: this.currentCountry,
            period: isDateMode ? 'date' : this.currentPeriod,
            mode: this.currentMode
        };

        if (isDateMode) {
            if (this.filters.date_from) params.date_from = this.filters.date_from;
            if (this.filters.date_to) params.date_to = this.filters.date_to;
        } else if (this.currentPeriod === 'month' || this.currentPeriod === 'custom_month') {
            params.month = this.selectedMonth;
        } else if (this.currentPeriod === 'year') {
            params.year = this.selectedYear;
        }

        if (this.filters.ccaa) params.ccaa = this.filters.ccaa;
        if (this.filters.brand) params.brand = this.filters.brand;
        if (this.filters.model) params.model = this.filters.model;
        if (this.filters.fuel) params.fuel = this.filters.fuel;
        if (this.filters.province) params.province = this.filters.province;

        return new URLSearchParams(params).toString();
    }

    bindPeriodEvents() {
        if (this.quickCcaaSelect) {
            this.quickCcaaSelect.addEventListener('change', async (e) => {
                this.selectedCcaa = e.target.value;
                if (this.ccaaFilter) this.ccaaFilter.value = this.selectedCcaa;
                await this.loadProvincesForCcaa(this.selectedCcaa);
                this.updatePeriodTag();
                this.refreshAll();
                this.loadMonthlyMatrix('', this.matrixLimit);
                this.loadMonthComparison();
            });
        }

        if (this.ccaaFilter) {
            this.ccaaFilter.addEventListener('change', async (e) => {
                this.selectedCcaa = e.target.value;
                if (this.quickCcaaSelect) this.quickCcaaSelect.value = this.selectedCcaa;
                await this.loadProvincesForCcaa(this.selectedCcaa);
                this.updatePeriodTag();
                this.refreshAll();
                this.loadMonthlyMatrix('', this.matrixLimit);
                this.loadMonthComparison();
            });
        }

        if (this.singleDatePicker) {
            const triggerDatePicker = () => {
                if (typeof this.singleDatePicker.showPicker === 'function') {
                    try { this.singleDatePicker.showPicker(); } catch(err) { this.singleDatePicker.focus(); }
                } else {
                    this.singleDatePicker.focus();
                }
            };

            const containerDate = document.getElementById('container-date-select');
            if (containerDate) {
                containerDate.style.cursor = 'pointer';
                containerDate.addEventListener('click', (e) => {
                    triggerDatePicker();
                });
            }

            this.singleDatePicker.addEventListener('click', (e) => {
                triggerDatePicker();
            });

            this.singleDatePicker.addEventListener('change', (e) => {
                const dateVal = e.target.value;
                if (dateVal) {
                    this.currentPeriod = 'custom_date';
                    if (this.dateFromFilter) this.dateFromFilter.value = dateVal;
                    if (this.dateToFilter) this.dateToFilter.value = dateVal;
                    if (this.quickMonthSelect) this.quickMonthSelect.value = '';
                    if (this.quickYearSelect) this.quickYearSelect.value = '';
                    this.updatePeriodTag();
                    this.refreshAll();
                }
            });
        }

        // Independent Year Select Event
        if (this.quickYearSelect) {
            this.quickYearSelect.addEventListener('change', (e) => {
                const yrVal = e.target.value;
                if (!yrVal) return;
                this.selectedYear = yrVal;
                this.currentPeriod = 'year';
                if (this.dateFromFilter) this.dateFromFilter.value = '';
                if (this.dateToFilter) this.dateToFilter.value = '';
                if (this.singleDatePicker) this.singleDatePicker.value = '';
                if (this.quickMonthSelect) this.quickMonthSelect.value = '';

                this.updatePeriodTag();
                this.refreshAll();
                this.loadMonthlyMatrix('', this.matrixLimit);
            });
        }

        // Independent Month Select Event
        if (this.quickMonthSelect) {
            this.quickMonthSelect.addEventListener('change', (e) => {
                const monthVal = e.target.value;
                if (!monthVal) return;

                const yearPart = monthVal.split('-')[0];
                this.selectedMonth = monthVal;
                this.selectedYear = yearPart;
                this.currentPeriod = 'month';

                if (this.dateFromFilter) this.dateFromFilter.value = '';
                if (this.dateToFilter) this.dateToFilter.value = '';
                if (this.singleDatePicker) this.singleDatePicker.value = '';
                if (this.quickYearSelect) this.quickYearSelect.value = '';

                this.updatePeriodTag();
                this.refreshAll();
            });
        }
    }

    updatePeriodTag() {
        if (!this.activePeriodTag) return;

        const monthsName = {
            '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
            '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
            '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
        };

        const now = new Date();
        const curMonthCode = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        let periodStr = `📆 Mes Concreto: ${this.selectedMonth || curMonthCode}`;
        if (this.currentPeriod === 'year') {
            periodStr = `📊 Año ${this.selectedYear} Completo (Ene - Dic)`;
        } else if (this.singleDatePicker && this.singleDatePicker.value) {
            const dParts = this.singleDatePicker.value.split('-');
            const dFormatted = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : this.singleDatePicker.value;
            periodStr = `📅 Día Concreto: ${dFormatted}`;
        } else if (this.dateFromFilter && this.dateFromFilter.value) {
            periodStr = `📅 Rango: ${this.dateFromFilter.value} ${this.dateToFilter.value ? 'a ' + this.dateToFilter.value : ''}`;
        } else {
            const parts = (this.selectedMonth || curMonthCode).split('-');
            const monthTxt = monthsName[parts[1]] || parts[1];
            periodStr = (this.selectedMonth === curMonthCode) 
                ? `📆 ${monthTxt} ${parts[0]} (Mes Actual en Curso)` 
                : `📆 Mes Concreto: ${monthTxt} ${parts[0]}`;
        }

        if (this.selectedCcaa) {
            periodStr += ` | 🗺️ CCAA: ${this.selectedCcaa}`;
        }

        if (this.fuelFilter && this.fuelFilter.value) {
            periodStr += ` | ⚡ ${this.fuelFilter.value}`;
        }

        this.activePeriodTag.innerHTML = `✨ Visualizando en este momento: <strong>${periodStr}</strong>`;

        let badgeLabel = this.selectedMonth;
        if (this.currentPeriod === 'today') badgeLabel = '⚡ Hoy (Día)';
        else if (this.currentPeriod === 'yesterday') badgeLabel = '⏮️ Ayer (Día)';
        else if (this.currentPeriod === 'year') badgeLabel = `Año ${this.selectedYear} Completo`;
        else if (this.singleDatePicker && this.singleDatePicker.value) {
            const dp = this.singleDatePicker.value.split('-');
            badgeLabel = dp.length === 3 ? `${dp[2]}/${dp[1]}/${dp[0]}` : this.singleDatePicker.value;
        }

        if (this.selectedCcaa) badgeLabel += ` (${this.selectedCcaa})`;

        ['badge-top-models', 'badge-top-ev', 'badge-top-brands', 'badge-top-ev-brands'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = badgeLabel;
        });

        this.updateSelectorHighlights();
    }

    updateSelectorHighlights() {
        const cMonth = document.getElementById('container-month-select');
        const cYear = document.getElementById('container-year-select');
        const cDate = document.getElementById('container-date-select');

        if (!cMonth || !cYear || !cDate) return;

        const isDateActive = (this.singleDatePicker && this.singleDatePicker.value) || (this.dateFromFilter && this.dateFromFilter.value) || (this.currentPeriod === 'custom_date');
        const isYearActive = !isDateActive && (this.currentPeriod === 'year');
        const isMonthActive = !isDateActive && !isYearActive;

        const inactiveStyle = "display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; transition: all 0.2s ease; border: 1px solid #cbd5e1; box-shadow: none; background: #ffffff;";
        const activeStyle = "display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; transition: all 0.2s ease; border: 2px solid #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); background: #ffffff;";

        cMonth.style.cssText = isMonthActive ? activeStyle : inactiveStyle;
        cYear.style.cssText = isYearActive ? activeStyle : inactiveStyle;
        cDate.style.cssText = isDateActive ? activeStyle : inactiveStyle;

        // Synchronize selector dropdown values so prompt options show for inactive selectors
        if (isDateActive) {
            if (this.quickMonthSelect) this.quickMonthSelect.value = '';
            if (this.quickYearSelect) this.quickYearSelect.value = '';
        } else if (isYearActive) {
            if (this.quickMonthSelect) this.quickMonthSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
            if (this.quickYearSelect) this.quickYearSelect.value = this.selectedYear;
        } else if (isMonthActive) {
            if (this.quickYearSelect) this.quickYearSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
            if (this.quickMonthSelect) this.quickMonthSelect.value = this.selectedMonth;
        }
    }

    async fetchCached(url) {
        if (!this.cacheMap) this.cacheMap = new Map();
        const now = Date.now();
        if (this.cacheMap.has(url)) {
            const { data, timestamp } = this.cacheMap.get(url);
            if (now - timestamp < 10000 && data && data.summary && data.summary.total_month > 0) {
                return data;
            }
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && (!data.summary || data.summary.total_month > 0)) {
                this.cacheMap.set(url, { data, timestamp: now });
            }
            return data;
        } catch (e) {
            console.error('Fetch error for', url, e);
            return null;
        }
    }

    async refreshAll() {
        this.currentPage = 1;
        this.updatePeriodTag();
        await Promise.all([
            this.loadMetricsAndChartsConsolidated(),
            this.loadSecondaryCharts()
        ]);

        if (this.insightsWidget) {
            this.insightsWidget.fetchInsight(this.getFullQueryParams());
        }
    }

    bindEvents() {
        if (this.applyFiltersBtn) {
            this.applyFiltersBtn.addEventListener('click', () => {
                this.refreshAll();
            });
        }

        if (this.brandFilter) {
            this.brandFilter.addEventListener('change', async () => {
                await this.loadModelsForBrand(this.brandFilter.value);
                this.refreshAll();
            });
        }

        [this.modelFilter, this.fuelFilter, this.provinceFilter, this.dateFromFilter, this.dateToFilter].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.refreshAll());
            }
        });

        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }
    }

    bindCompareEvents() {
        if (this.btnCompare) {
            this.btnCompare.addEventListener('click', () => {
                this.loadMonthComparison();
            });
        }
    }

    bindMatrixEvents() {
        if (this.matrixSearchInput) {
            let timeout = null;
            this.matrixSearchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.loadMonthlyMatrix(e.target.value, this.matrixLimit);
                }, 300);
            });
        }

        if (this.btnLoadMoreMatrix) {
            this.btnLoadMoreMatrix.addEventListener('click', () => {
                this.matrixLimit = 50;
                this.loadMonthlyMatrix(this.matrixSearchInput ? this.matrixSearchInput.value : '', 50);
                this.btnLoadMoreMatrix.style.display = 'none';
            });
        }

        const btnExtendModels = document.getElementById('btn-extend-models');
        if (btnExtendModels) {
            btnExtendModels.addEventListener('click', () => {
                if (this.modelsLimit >= 30) {
                    this.modelsLimit = 10;
                    btnExtendModels.innerHTML = '<span>Ver 10 más</span>';
                } else {
                    this.modelsLimit += 10;
                    btnExtendModels.innerHTML = this.modelsLimit >= 30 ? '<span>Ver menos</span>' : '<span>Ver 10 más</span>';
                }
                const title = document.getElementById('title-models-ranking');
                if (title) title.textContent = `Top ${this.modelsLimit} Modelos`;
                if (this.lastAllData) {
                    this.renderAllDataPayload(this.lastAllData);
                } else {
                    this.loadMetricsAndChartsConsolidated();
                }
            });
        }

        const btnExtendEv = document.getElementById('btn-extend-ev');
        if (btnExtendEv) {
            btnExtendEv.addEventListener('click', () => {
                if (this.evLimit >= 30) {
                    this.evLimit = 10;
                    btnExtendEv.innerHTML = '<span>Ver 10 más</span>';
                } else {
                    this.evLimit += 10;
                    btnExtendEv.innerHTML = this.evLimit >= 30 ? '<span>Ver menos</span>' : '<span>Ver 10 más</span>';
                }
                const title = document.getElementById('title-ev-ranking');
                if (title) title.textContent = `Top ${this.evLimit} Eléctricos (BEV)`;
                if (this.lastAllData) {
                    this.renderAllDataPayload(this.lastAllData);
                } else {
                    this.loadMetricsAndChartsConsolidated();
                }
            });
        }

        const btnExtendBrands = document.getElementById('btn-extend-brands');
        if (btnExtendBrands) {
            btnExtendBrands.addEventListener('click', () => {
                if (this.brandsLimit >= 30) {
                    this.brandsLimit = 10;
                    btnExtendBrands.innerHTML = '<span>Ver 10 más</span>';
                } else {
                    this.brandsLimit += 10;
                    btnExtendBrands.innerHTML = this.brandsLimit >= 30 ? '<span>Ver menos</span>' : '<span>Ver 10 más</span>';
                }
                const title = document.getElementById('title-brands-ranking');
                if (title) title.textContent = `Top ${this.brandsLimit} Marcas`;
                if (this.lastAllData) {
                    this.renderAllDataPayload(this.lastAllData);
                } else {
                    this.loadMetricsAndChartsConsolidated();
                }
            });
        }

        const btnExtendEvBrands = document.getElementById('btn-extend-ev-brands');
        if (btnExtendEvBrands) {
            btnExtendEvBrands.addEventListener('click', () => {
                if (this.evBrandsLimit >= 30) {
                    this.evBrandsLimit = 10;
                    btnExtendEvBrands.innerHTML = '<span>Ver 10 más</span>';
                } else {
                    this.evBrandsLimit += 10;
                    btnExtendEvBrands.innerHTML = this.evBrandsLimit >= 30 ? '<span>Ver menos</span>' : '<span>Ver 10 más</span>';
                }
                const title = document.getElementById('title-ev-brands-ranking');
                if (title) title.textContent = `Top ${this.evBrandsLimit} Marcas BEV`;
                if (this.lastAllData) {
                    this.renderAllDataPayload(this.lastAllData);
                } else {
                    this.loadMetricsAndChartsConsolidated();
                }
            });
        }

        const headers = document.querySelectorAll('.sort-header');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const sortField = th.dataset.sort;
                if (!sortField) return;

                if (this.matrixSortBy === sortField) {
                    this.matrixSortDir = this.matrixSortDir === 'desc' ? 'asc' : 'desc';
                } else {
                    this.matrixSortBy = sortField;
                    this.matrixSortDir = 'desc';
                }

                headers.forEach(h => {
                    const icon = h.querySelector('.sort-icon');
                    if (icon) icon.textContent = '↕';
                });
                const activeIcon = th.querySelector('.sort-icon');
                if (activeIcon) {
                    activeIcon.textContent = this.matrixSortDir === 'desc' ? '⯆' : '⯅';
                }

                this.loadMonthlyMatrix(this.matrixSearchInput ? this.matrixSearchInput.value : '', this.matrixLimit);
            });
        });
    }

    async loadMonthlyMatrix(search = '', limit = 20) {
        if (!this.matrixTableBody) return;

        // Dynamic Header & Title Year Update
        const matrixTitleEl = document.getElementById('matrix-year-title');
        if (matrixTitleEl) matrixTitleEl.textContent = this.selectedYear;

        const matrixHeaderEl = document.getElementById('matrix-total-header');
        if (matrixHeaderEl) matrixHeaderEl.textContent = `TOTAL ${this.selectedYear}`;

        // Update "Evolución Mensual" chart title with selected year
        const evolTitleEl = document.getElementById('monthly-evolution-title');
        if (evolTitleEl) {
            const isCurrentYear = this.selectedYear === '2026';
            const rangeStr = isCurrentYear ? 'Ene - Jun' : 'Ene - Dic';
            evolTitleEl.textContent = `Evolución Mensual (${rangeStr} ${this.selectedYear})`;
        }

        this.showLoading('Cargando matriz...');
        try {
            const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';
            const url = `${API_BASE}/api/analytics/monthly-matrix?year=${this.selectedYear}&limit=${limit}&sort_by=${this.matrixSortBy}&sort_dir=${this.matrixSortDir}${ccaaParam}${search ? '&search=' + encodeURIComponent(search) : ''}`;
            const data = await this.fetchCached(url);
            if (!data) return;

            // Show/hide SEP-DIC columns: only visible for completed years (2024, 2025)
            const isFullYear = this.selectedYear !== '2026';
            document.querySelectorAll('.matrix-col-full').forEach(el => {
                el.style.display = isFullYear ? '' : 'none';
            });

            let html = '';
            data.forEach(r => {
                const sepOctNovDic = isFullYear ? `
                        <td style="padding: 10px; color: #334155;">${(r.sep||0).toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${(r.oct||0).toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${(r.nov||0).toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${(r.dic||0).toLocaleString('es-ES')}</td>
                ` : '';
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <td style="padding: 10px; font-weight: 700; color: #7c3aed; text-align: left;">${r.rank}</td>
                        <td style="padding: 10px; font-weight: 700; color: #0f172a; text-align: left;">${r.modelo_full}</td>
                        <td style="padding: 10px; color: #334155;">${r.ene.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.feb.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.mar.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.abr.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.may.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; font-weight: 700; background: #e0f2fe; color: #0369a1;">${r.jun.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.jul.toLocaleString('es-ES')}</td>
                        <td style="padding: 10px; color: #334155;">${r.ago.toLocaleString('es-ES')}</td>
                        ${sepOctNovDic}
                        <td style="padding: 10px; font-weight: 700; color: #7c3aed;">${r.total_2026.toLocaleString('es-ES')}</td>
                    </tr>
                `;
            });
            this.matrixTableBody.innerHTML = html || '<tr><td colspan="15" class="text-center">No se encontraron modelos.</td></tr>';
        } catch (e) {
            console.error('Error loading monthly matrix table:', e);
        } finally {
            this.hideLoading();
        }
    }

    async loadMonthComparison() {
        if (!this.compareMonthA || !this.compareMonthB) return;
        const monthA = this.compareMonthA.value;
        const monthB = this.compareMonthB.value;
        const brand = this.brandFilter ? this.brandFilter.value : '';
        const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';

        try {
            const compData = await this.fetchCached(`${API_BASE}/api/analytics/compare-months?month_a=${monthA}&month_b=${monthB}&brand=${encodeURIComponent(brand)}${ccaaParam}`);
            if (!compData) return;

            if (window.DashboardCharts && window.DashboardCharts.initCompareFuelMixChart) {
                window.DashboardCharts.initCompareFuelMixChart('compareFuelMixChart', compData);
            }

            if (this.compareTableBody) {
                let html = '';
                compData.fuel_comparison.forEach(item => {
                    const diffColor = item.diff_pp > 0 ? '#16a34a' : item.diff_pp < 0 ? '#dc2626' : '#64748b';
                    const diffSign = item.diff_pp > 0 ? '+' : '';
                    html += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px; font-weight: 600; color: ${item.color}">${item.carburante}</td>
                            <td style="padding: 8px; color: #0f172a;"><strong>${item.pct_a}%</strong> <span style="font-size: 11px; color: #64748b;">(${item.units_a.toLocaleString('es-ES')} un)</span></td>
                            <td style="padding: 8px; color: #0f172a;"><strong>${item.pct_b}%</strong> <span style="font-size: 11px; color: #64748b;">(${item.units_b.toLocaleString('es-ES')} un)</span></td>
                            <td style="padding: 8px; font-weight: 700; color: ${diffColor};">${diffSign}${item.diff_pp} pp</td>
                        </tr>
                    `;
                });
                this.compareTableBody.innerHTML = html;
            }

        } catch (e) {
            console.error('Error loading month comparison:', e);
        }
    }

    async loadInitialDropdowns() {
        try {
            const [brands, fuels, ccaaList, provinces, models] = await Promise.all([
                fetch(`${API_BASE}/api/brands/list`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/api/fuel/list`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/api/ccaa/list`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/api/provinces/list`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/api/models/list`).then(r => r.ok ? r.json() : [])
            ]).catch(() => [[], [], [], [], []]);

            if (brands.length) window.Components.populateSelect('brand-filter', brands, 'Todas las Marcas');
            if (fuels.length) window.Components.populateSelect('fuel-filter', fuels, 'Todos los Carburantes');
            if (provinces.length) window.Components.populateSelect('province-filter', provinces, 'Todas las Provincias');
            if (models.length) window.Components.populateSelect('model-filter', models, 'Todos los Modelos');

            if (ccaaList.length) {
                if (this.quickCcaaSelect) {
                    let html = '<option value="">🇪🇸 Toda España</option>';
                    ccaaList.forEach(c => html += `<option value="${c}">${c}</option>`);
                    this.quickCcaaSelect.innerHTML = html;
                }
                if (this.ccaaFilter) {
                    window.Components.populateSelect('ccaa-filter', ccaaList, 'Todas las CCAA');
                }
            }
        } catch (error) {
            console.error('Failed to load initial dropdowns:', error);
        }
    }

    async loadProvincesForCcaa(ccaa) {
        try {
            const url = ccaa ? `${API_BASE}/api/provinces/list?ccaa=${encodeURIComponent(ccaa)}` : `${API_BASE}/api/provinces/list`;
            const res = await fetch(url);
            if (res.ok) {
                const provinces = await res.json();
                window.Components.populateSelect('province-filter', provinces, 'Todas las Provincias');
            }
        } catch (e) {
            console.error('Error fetching provinces for CCAA:', e);
        }
    }

    async loadModelsForBrand(brand) {
        try {
            const url = brand ? `${API_BASE}/api/models/list?brand=${encodeURIComponent(brand)}` : `${API_BASE}/api/models/list`;
            const res = await fetch(url);
            if (res.ok) {
                const models = await res.json();
                window.Components.populateSelect('model-filter', models, 'Todos los Modelos');
            }
        } catch (e) {
            console.error('Error fetching models for brand:', e);
        }
    }

    showLoading(text = 'Actualizando datos...') {
        const spinner = document.getElementById('global-loading-spinner');
        if (spinner) {
            const span = spinner.querySelector('span');
            if (span) span.textContent = text;
            spinner.classList.add('active');
        }
        const containers = document.querySelectorAll('.metric-card, .chart-card, .table-card');
        containers.forEach(c => c.classList.add('content-loading'));

        // In-chart loading overlays
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            let overlay = container.querySelector('.chart-loading-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'chart-loading-overlay';
                overlay.innerHTML = `
                    <div class="chart-spinner-ring"></div>
                    <span class="chart-loading-label">Cargando datos...</span>
                `;
                container.appendChild(overlay);
            }
            overlay.classList.add('active');
        });
    }

    hideLoading() {
        const spinner = document.getElementById('global-loading-spinner');
        if (spinner) {
            spinner.classList.remove('active');
        }
        const containers = document.querySelectorAll('.metric-card, .chart-card, .table-card');
        containers.forEach(c => c.classList.remove('content-loading'));

        const overlays = document.querySelectorAll('.chart-loading-overlay');
        overlays.forEach(overlay => overlay.classList.remove('active'));
    }

    async loadMetricsAndChartsConsolidated() {
        const q = this.getFullQueryParams();
        const cacheKey = `dashboard_all_data_v20260901_v1_${q}`;

        // 1. Instant cache load from localStorage or memory (0ms) - only if valid and populated
        if (!this.memoryCache) this.memoryCache = new Map();
        const memCached = this.memoryCache.get(cacheKey);
        if (memCached && memCached.summary && memCached.summary.total_month > 0 && memCached.summary.top_brand !== 'N/A') {
            this.renderAllDataPayload(memCached);
        } else {
            const localCached = localStorage.getItem(cacheKey);
            if (localCached) {
                try {
                    const parsed = JSON.parse(localCached);
                    if (parsed && parsed.summary && parsed.summary.total_month > 0 && parsed.summary.top_brand !== 'N/A') {
                        this.renderAllDataPayload(parsed);
                    } else {
                        localStorage.removeItem(cacheKey);
                    }
                } catch(e) {
                    localStorage.removeItem(cacheKey);
                }
            }
        }

        this.showLoading('Actualizando datos...');

        // 2. Fetch fresh consolidated data with automatic retry for mobile reliability
        const fetchUrl = `${API_BASE}/api/dashboard/all-data?${q}`;
        let allData = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            allData = await this.fetchCached(fetchUrl);
            if (allData && allData.summary && allData.summary.total_month > 0) break;
            if (attempt === 0) {
                // Clear stale in-memory cache and retry
                if (this.cacheMap) this.cacheMap.delete(fetchUrl);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        try {
            if (allData && allData.summary && allData.summary.total_month > 0) {
                this.memoryCache.set(cacheKey, allData);
                try { localStorage.setItem(cacheKey, JSON.stringify(allData)); } catch(e) {}
                this.renderAllDataPayload(allData);
            } else if (allData) {
                this.renderAllDataPayload(allData);
            }
        } catch (e) {
            console.error('Error rendering consolidated all-data:', e);
        } finally {
            this.hideLoading();
        }
    }

    renderAllDataPayload(allData) {
        if (!allData) return;
        this.lastAllData = allData;

        // Clean model full names
        const cleanModelName = (marca, modeloFull, modeloRaw) => {
            let name = String(modeloFull || modeloRaw || '').trim();
            let m = String(marca || '').trim().toUpperCase();

            // Normalize accents (LEÓN -> LEON, etc.)
            name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (m && name.toUpperCase().startsWith(m + ' ' + m + ' ')) {
                name = name.substring(m.length + 1).trim();
            } else if (m && name.toUpperCase().startsWith(m + ' ' + m)) {
                name = name.substring(m.length).trim();
            }
            // Strip trailing homologation technical codes like 1LS6CMEO, 3JDAANB (contains letters and digits and length >= 6)
            // NEVER strip purely numeric models like 2008, 3008, 5008, 208, 308, 508, 500, 600, 320, 911
            const parts = name.split(/\s+/);
            if (parts.length > 1) {
                const last = parts[parts.length - 1];
                if (!/^\d{2,4}$/.test(last) && /[a-zA-Z]/.test(last) && /\d/.test(last) && last.length >= 6) {
                    name = parts.slice(0, -1).join(' ').trim();
                }
            }

            const uName = name.toUpperCase();
            if (uName === 'DACIA' || uName === 'DACIA DACIA') name = 'DACIA SANDERO';
            else if (uName === 'TOYOTA' || uName === 'TOYOTA TOYOTA') name = 'TOYOTA COROLLA';
            else if (uName === 'SEAT' || uName === 'SEAT SEAT') name = 'SEAT ARONA';
            else if (uName === 'VOLKSWAGEN' || uName === 'VOLKSWAGEN VOLKSWAGEN') name = 'VOLKSWAGEN GOLF';
            else if (uName === 'RENAULT' || uName === 'RENAULT RENAULT') name = 'RENAULT TWINGO';
            else if (uName === 'AL S05' || uName === 'S05' || uName === 'DEEPAL') name = 'DEEPAL S05';

            return name || `${marca} ${modeloRaw}`;
        };

        if (allData.summary) {
            window.Components.renderMetrics(allData.summary, this.kpiQuotaMode, allData.fuel_mix || []);
            this.bindKpiQuotaToggle();
        }

        const cleanBrands = (allData.brands || [])
            .filter(b => b && b.marca && !String(b.marca).toUpperCase().includes('DESCONOCIDO') && !String(b.marca).startsWith('202'))
            .map(b => {
                const brandUpper = String(b.marca).trim().toUpperCase();
                let rawList = (b.modelos && b.modelos.length > 0) ? b.modelos : (allData.models || [])
                    .filter(m => {
                        const name = String(m.modelo_full || m.modelo || '').toUpperCase();
                        return name.startsWith(brandUpper + ' ') || name === brandUpper;
                    })
                    .map(m => ({ modelo: m.modelo_full || m.modelo, total: m.total }));

                const merged = {};
                rawList.forEach(m => {
                    let mName = cleanModelName(b.marca, m.modelo, m.modelo);
                    if (mName.toUpperCase().startsWith(brandUpper + ' ')) {
                        mName = mName.substring(brandUpper.length + 1).trim();
                    }
                    if (!mName || mName.toUpperCase().includes('DESCONOCIDO')) return;

                    // Reclassify CUPRA dedicated models if they appear under SEAT
                    if (brandUpper === 'SEAT' && (mName.toUpperCase().includes('FORMENTOR') || mName.toUpperCase().includes('TERRAMAR') || mName.toUpperCase().includes('TAVASCAN') || mName.toUpperCase().includes('BORN') || mName.toUpperCase().includes('RAVAL'))) {
                        return;
                    }

                    // Canonical model mergers
                    if (mName.toUpperCase() === 'LEON SP' || mName.toUpperCase() === 'LEON SPORTSTOURER' || mName.toUpperCase() === 'LEON SPORTS TOURER') {
                        mName = 'LEON';
                    }

                    merged[mName] = (merged[mName] || 0) + m.total;
                });

                const sortedModels = Object.entries(merged)
                    .map(([modelo, total]) => ({ modelo, total }))
                    .filter(x => x.total > 0 && !x.modelo.startsWith('202') && x.modelo !== '-' && x.modelo !== '--' && x.modelo !== '----')
                    .sort((x, y) => y.total - x.total);

                return {
                    ...b,
                    modelos: sortedModels
                };
            })
            .slice(0, this.brandsLimit);
        window.DashboardCharts.initBrandsRankingChart('brandsRankingChart', cleanBrands);

        const cleanModels = (allData.models || [])
            .filter(m => {
                const name = String(m.modelo_full || m.modelo || '');
                const marca = String(m.marca || '');
                return !name.toUpperCase().includes('DESCONOCIDO') && !marca.toUpperCase().includes('DESCONOCIDO') && !name.startsWith('202');
            })
            .map(m => ({
                ...m,
                modelo_full: cleanModelName(m.marca, m.modelo_full, m.modelo)
            }))
            .slice(0, this.modelsLimit);
        window.DashboardCharts.initModelsRankingChart('modelsRankingChart', cleanModels);

        // 3. Top 10 Eléctricos (BEV) Models Ranking
        const cleanEvModels = (allData.ev_models || [])
            .filter(m => {
                const name = String(m.modelo_full || m.modelo || '');
                const marca = String(m.marca || '');
                return !name.toUpperCase().includes('DESCONOCIDO') && !marca.toUpperCase().includes('DESCONOCIDO') && !name.startsWith('202');
            })
            .map(m => ({
                ...m,
                modelo_full: cleanModelName(m.marca, m.modelo_full, m.modelo)
            }))
            .slice(0, this.evLimit);

        const titleEvModels = document.getElementById('title-ev-ranking');
        if (titleEvModels) {
            titleEvModels.textContent = `Top ${this.evLimit} Eléctricos (BEV)`;
        }
        window.DashboardCharts.initEVRankingChart('evRankingChart', cleanEvModels);

        // 4. Top 10 Marcas BEV Ranking
        const cleanEvBrands = (allData.ev_brands || [])
            .filter(b => b && b.marca && !String(b.marca).toUpperCase().includes('DESCONOCIDO') && !String(b.marca).startsWith('202'))
            .map(b => {
                const brandUpper = String(b.marca).trim().toUpperCase();
                let rawList = (b.modelos && b.modelos.length > 0) ? b.modelos : (allData.ev_models || [])
                    .filter(m => {
                        const name = String(m.modelo_full || m.modelo || '').toUpperCase();
                        return name.startsWith(brandUpper + ' ') || name === brandUpper;
                    })
                    .map(m => ({ modelo: m.modelo_full || m.modelo, total: m.total }));

                const merged = {};
                rawList.forEach(m => {
                    let mName = cleanModelName(b.marca, m.modelo, m.modelo);
                    if (mName.toUpperCase().startsWith(brandUpper + ' ')) {
                        mName = mName.substring(brandUpper.length + 1).trim();
                    }
                    if (!mName || mName.toUpperCase().includes('DESCONOCIDO')) return;
                    merged[mName] = (merged[mName] || 0) + m.total;
                });

                const sortedModels = Object.entries(merged)
                    .map(([modelo, total]) => ({ modelo, total }))
                    .sort((x, y) => y.total - x.total);

                return {
                    ...b,
                    modelos: sortedModels
                };
            })
            .slice(0, this.evBrandsLimit);

        const titleEvBrands = document.getElementById('title-ev-brands-ranking');
        if (titleEvBrands) {
            titleEvBrands.textContent = `Top ${this.evBrandsLimit} Marcas BEV`;
        }
        window.DashboardCharts.initEVBrandsRankingChart('evBrandsRankingChart', cleanEvBrands);

        window.DashboardCharts.initFuelMixChart('fuelMixChart', allData.fuel_mix || [], (clickedFuel) => {
            if (this.fuelFilter) {
                let targetOption = '';
                for (let opt of this.fuelFilter.options) {
                    if (opt.value && (opt.value.includes(clickedFuel) || clickedFuel.includes(opt.value))) {
                        targetOption = opt.value;
                        break;
                    }
                }
                if (!targetOption && clickedFuel.includes('ELECTRICO')) targetOption = 'Eléctrico (BEV)';
                if (!targetOption && clickedFuel.includes('HIBRIDO')) targetOption = 'Híbrido (HEV)';

                if (this.fuelFilter.value === targetOption) {
                    this.fuelFilter.value = '';
                } else {
                    this.fuelFilter.value = targetOption || clickedFuel;
                }
                this.refreshAll();
            }
        });

        if (cleanBrands.length > 0 || cleanModels.length > 0) {
            window.Components.patchMetricCardsIfMissing(cleanBrands, cleanModels);
        }
    }

    async loadSecondaryCharts() {
        const q = this.getFullQueryParams();
        const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';

        // 1. Monthly Evolution Chart
        this.fetchCached(`${API_BASE}/api/analytics/monthly-evolution?year=${this.selectedYear}${ccaaParam}`)
            .then(data => {
                if (data) window.DashboardCharts.initMonthlyEvolutionChart('monthlyEvolutionChart', data);
            })
            .catch(e => console.warn('Monthly evolution load notice:', e));

        // 2. Multi-year EV / ZERO Quota Trend Chart
        this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-quota?mode=${this.chartQuotaMode}${ccaaParam}`)
            .then(data => {
                if (data) window.DashboardCharts.initEVQuotaTrendChart('evQuotaTrendChart', data);
            })
            .catch(e => console.warn('EV quota trend load notice:', e));

        // 3. Multi-year EV Cumulative Trend Chart
        this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-cumulative?${ccaaParam}`)
            .then(data => {
                if (data) window.DashboardCharts.initEVCumulativeTrendChart('evCumulativeTrendChart', data);
            })
            .catch(e => console.warn('EV cumulative trend load notice:', e));

        // 4. All Technologies Monthly Quota Trend Chart
        const allTechTitleEl = document.getElementById('all-tech-quota-title');
        if (allTechTitleEl) allTechTitleEl.textContent = `Cuota por Tecnología Mes a Mes (${this.selectedYear})`;

        this.fetchCached(`${API_BASE}/api/analytics/monthly-tech-quota?year=${this.selectedYear}${ccaaParam}`)
            .then(data => {
                if (data) window.DashboardCharts.initAllTechQuotaChart('allTechQuotaChart', data);
            })
            .catch(e => console.warn('All tech quota load notice:', e));

        // 5. Daily Evolution (if applicable)
        this.fetchCached(`${API_BASE}/api/registrations/daily?${q}&days=30`)
            .then(data => {
                if (data && Array.isArray(data) && data.length > 0) {
                    window.DashboardCharts.initDailyEvolutionChart('dailyEvolutionChart', data, (clickedDate) => {
                        if (this.dateFromFilter && this.dateToFilter) {
                            if (this.dateFromFilter.value === clickedDate) {
                                this.dateFromFilter.value = '';
                                this.dateToFilter.value = '';
                                if (this.singleDatePicker) this.singleDatePicker.value = '';
                            } else {
                                this.dateFromFilter.value = clickedDate;
                                this.dateToFilter.value = clickedDate;
                                if (this.singleDatePicker) this.singleDatePicker.value = clickedDate;
                            }
                            this.refreshAll();
                        }
                    });
                }
            })
            .catch(e => console.warn('Daily evolution load notice:', e));
    }

    exportCSV() {
        alert('Esta es una función Premium. Actualiza tu plan para exportar los datos en CSV.');
    }

    // -------------------------------------------------------------
    // BRAND DEEP DIVE & COMPARATOR MODAL LOGIC
    // -------------------------------------------------------------
    bindBrandModalEvents() {
        const modal = document.getElementById('brand-deepdive-modal');
        const closeBtn = document.getElementById('close-brand-modal');
        const compareSelect = document.getElementById('modal-compare-brand-select');
        const yearSelect = document.getElementById('modal-brand-year-select');
        const tabBtns = document.querySelectorAll('.brand-tab-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeBrandModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeBrandModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
                this.closeBrandModal();
            }
        });

        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentModalYear = e.target.value;
                if (this.currentBrandA) {
                    this.openBrandModal(this.currentBrandA, this.currentBrandB, this.currentModalYear);
                }
            });
        }

        if (compareSelect) {
            compareSelect.addEventListener('change', (e) => {
                const targetBrandB = e.target.value;
                if (this.currentBrandA) {
                    this.openBrandModal(this.currentBrandA, targetBrandB, this.currentModalYear);
                }
            });
        }

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab) this.renderBrandModalTab(tab);
            });
        });
    }

    async openBrandModal(brandA, brandB = '', customYear = null) {
        const modal = document.getElementById('brand-deepdive-modal');
        if (!modal) return;

        const loader = document.getElementById('brand-modal-loader');
        if (loader) loader.style.display = 'flex';

        this.currentBrandA = brandA;
        this.currentBrandB = brandB;
        this.currentBrandTab = this.currentBrandTab || 'monthly';
        this.currentModalYear = customYear || this.currentModalYear || this.selectedYear || (this.selectedMonth ? this.selectedMonth.split('-')[0] : '2026');

        const yearSelect = document.getElementById('modal-brand-year-select');
        if (yearSelect) yearSelect.value = this.currentModalYear;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Clear stale KPI cards and show clean skeleton placeholders while fetching
        const kpiContainer = document.getElementById('modal-brand-kpis');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div class="brand-kpi-item" style="opacity: 0.6;"><span class="kpi-lbl">Ventas Totales</span><span class="kpi-val" style="color: #94a3b8;">...</span><span class="kpi-sub">Cargando...</span></div>
                <div class="brand-kpi-item" style="opacity: 0.6;"><span class="kpi-lbl">Cuota de Mercado</span><span class="kpi-val" style="color: #94a3b8;">...</span><span class="kpi-sub">Cargando...</span></div>
                <div class="brand-kpi-item" style="opacity: 0.6;"><span class="kpi-lbl">Top Modelo (${brandA})</span><span class="kpi-val" style="color: #94a3b8;">...</span><span class="kpi-sub">Cargando...</span></div>
                <div class="brand-kpi-item" style="opacity: 0.6;"><span class="kpi-lbl">Tecnología Principal</span><span class="kpi-val" style="color: #94a3b8;">...</span><span class="kpi-sub">Cargando...</span></div>
            `;
        }

        // Populate Comparator Dropdown with Top 100 brands
        const compareSelect = document.getElementById('modal-compare-brand-select');
        if (compareSelect) {
            try {
                const res = await fetch(`${API_BASE}/api/brands/list?limit=100`);
                if (res.ok) {
                    const brands = await res.json();
                    let html = '<option value="">➕ Comparar con otra marca...</option>';
                    brands.filter(b => b && b !== brandA && !b.startsWith('202')).forEach(b => {
                        const sel = b === brandB ? 'selected' : '';
                        html += `<option value="${b}" ${sel}>${b}</option>`;
                    });
                    compareSelect.innerHTML = html;
                }
            } catch (err) {
                console.error('Failed to load brands for comparison dropdown:', err);
            }
            compareSelect.value = brandB || '';
        }

        // Set Header Title & Badges
        const badgeA = document.getElementById('modal-brand-badge-a');
        if (badgeA) badgeA.textContent = brandA;

        const title = document.getElementById('modal-brand-title');
        if (title) {
            title.textContent = brandB ? `${brandA} (Azul) vs ${brandB} (Rojo)` : `Análisis Integral: ${brandA}`;
        }

        // Fetch brand deepdive data for the chosen year
        const yearParam = this.currentModalYear;
        const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';
        const compParam = brandB ? `&brand_b=${encodeURIComponent(brandB)}` : '';
        const url = `${API_BASE}/api/analytics/brand-deepdive?brand_a=${encodeURIComponent(brandA)}${compParam}&year=${yearParam}${ccaaParam}`;

        const subtitle = document.getElementById('modal-period-subtitle');
        if (subtitle) {
            const cText = this.selectedCcaa || 'Toda España';
            subtitle.textContent = `Año ${yearParam} Completo (Ene - Dic) • ${cText}`;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            this.brandDeepDiveData = data;

            // Render KPI Strip
            this.renderBrandModalKPIs(data);

            // Render Active Tab Chart
            this.renderBrandModalTab(this.currentBrandTab);

            if (window.lucide) lucide.createIcons();
        } catch (err) {
            console.error('Error fetching brand deepdive:', err);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    closeBrandModal() {
        const modal = document.getElementById('brand-deepdive-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentBrandB = '';
        const compareSelect = document.getElementById('modal-compare-brand-select');
        if (compareSelect) compareSelect.value = '';
    }

    renderBrandModalKPIs(data) {
        const kpiContainer = document.getElementById('modal-brand-kpis');
        if (!kpiContainer || !data.brand_a) return;

        const ba = data.brand_a;
        const bb = data.brand_b;
        const yr = data.year || '2026';

        let html = `
            <div class="brand-kpi-item">
                <span class="kpi-lbl">Ventas Totales (${yr})</span>
                <span class="kpi-val" style="color: #2563eb;">${ba.total_units.toLocaleString('es-ES')} un.</span>
                ${bb ? `<span class="kpi-sub" style="color: #dc2626; font-weight:700;">vs ${bb.marca}: ${bb.total_units.toLocaleString('es-ES')} un.</span>` : `<span class="kpi-sub">Total acumulado año ${yr}</span>`}
            </div>
            <div class="brand-kpi-item">
                <span class="kpi-lbl">Cuota de Mercado (${yr})</span>
                <span class="kpi-val" style="color: #2563eb;">${ba.market_share}%</span>
                ${bb ? `<span class="kpi-sub" style="color: #dc2626; font-weight:700;">vs ${bb.marca}: ${bb.market_share}%</span>` : `<span class="kpi-sub">Sobre total España</span>`}
            </div>
            <div class="brand-kpi-item">
                <span class="kpi-lbl">Top Modelo (${ba.marca})</span>
                <span class="kpi-val" style="font-size: 16px; color: #2563eb;">${ba.models && ba.models[0] ? ba.models[0].modelo : 'N/A'}</span>
                <span class="kpi-sub">${ba.models && ba.models[0] ? `${ba.models[0].total.toLocaleString('es-ES')} un. (${ba.models[0].pct}%)` : ''}</span>
            </div>
            <div class="brand-kpi-item">
                <span class="kpi-lbl">Tecnología Principal</span>
                <span class="kpi-val" style="font-size: 16px; color: #2563eb;">${ba.fuel_mix && ba.fuel_mix[0] ? ba.fuel_mix[0].carburante : 'N/A'}</span>
                <span class="kpi-sub">${ba.fuel_mix && ba.fuel_mix[0] ? `${ba.fuel_mix[0].pct}% de sus ventas` : ''}</span>
            </div>
        `;
        kpiContainer.innerHTML = html;
    }

    renderBrandModalTab(tabId) {
        if (!this.brandDeepDiveData) return;
        const data = this.brandDeepDiveData;
        const ba = data.brand_a;
        const bb = data.brand_b;
        const yr = data.year || '2026';

        // Show/hide tab panes
        const panes = document.querySelectorAll('.brand-tab-pane');
        panes.forEach(p => {
            p.style.display = p.id === `brand-tab-${tabId}` ? 'block' : 'none';
        });

        // Update active tab buttons and tab titles with year
        const tabBtns = document.querySelectorAll('.brand-tab-btn');
        tabBtns.forEach(btn => {
            const isTarget = btn.dataset.tab === tabId;
            btn.classList.toggle('active', isTarget);
            if (btn.dataset.tab === 'monthly') {
                btn.querySelector('span').textContent = `Mes a Mes (${yr})`;
            }
        });

        this.currentBrandTab = tabId;

        // Render appropriate chart with explicit year in legend/tooltips
        const labelA = `${ba.marca} (${yr})`;
        const labelB = bb ? `${bb.marca} (${yr})` : null;

        if (tabId === 'monthly') {
            window.DashboardCharts.initBrandMonthlyChart('brandMonthlyChart', ba.monthly, bb ? bb.monthly : null, labelA, labelB);
        } else if (tabId === 'yearly') {
            window.DashboardCharts.initBrandYearlyChart('brandYearlyChart', ba.yearly, bb ? bb.yearly : null, ba.marca, bb ? bb.marca : null);
        } else if (tabId === 'models') {
            window.DashboardCharts.initBrandModelsChart('brandModelsChart', ba.models, bb ? bb.models : null, labelA, labelB);
        } else if (tabId === 'fuels') {
            window.DashboardCharts.initBrandFuelMixChart('brandFuelMixChart', ba.fuel_mix, bb ? bb.fuel_mix : null, labelA, labelB);
        }
    }

    // -------------------------------------------------------------
    // DGT License Plate & About Project Modals
    // -------------------------------------------------------------
    bindAuxModalsEvents() {
        // 1. Plate Modal
        const plateModal = document.getElementById('modal-plate-info');
        const openPlateBtn = document.getElementById('btn-open-plate-modal');
        const closePlateBtn = document.getElementById('modal-plate-close');
        const plateBackdrop = document.getElementById('modal-plate-backdrop');
        const footerPlateLink = document.getElementById('footer-link-plate');

        const openPlate = (e) => {
            if (e) e.preventDefault();
            if (plateModal) {
                plateModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        };

        const closePlate = () => {
            if (plateModal) {
                plateModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        };

        if (openPlateBtn) openPlateBtn.addEventListener('click', openPlate);
        if (footerPlateLink) footerPlateLink.addEventListener('click', openPlate);
        if (closePlateBtn) closePlateBtn.addEventListener('click', closePlate);
        if (plateBackdrop) plateBackdrop.addEventListener('click', closePlate);

        // 2. About Modal
        const aboutModal = document.getElementById('modal-about-project');
        const openAboutBtn = document.getElementById('btn-open-about-modal');
        const closeAboutBtn = document.getElementById('modal-about-close');
        const aboutBackdrop = document.getElementById('modal-about-backdrop');
        const footerAboutLink = document.getElementById('footer-link-about');

        const openAbout = (e) => {
            if (e) e.preventDefault();
            if (aboutModal) {
                aboutModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        };

        const closeAbout = () => {
            if (aboutModal) {
                aboutModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        };

        if (openAboutBtn) openAboutBtn.addEventListener('click', openAbout);
        if (footerAboutLink) footerAboutLink.addEventListener('click', openAbout);
        if (closeAboutBtn) closeAboutBtn.addEventListener('click', closeAbout);
        if (aboutBackdrop) aboutBackdrop.addEventListener('click', closeAbout);

        // 3. Privacy & Cookies Modal
        const privacyModal = document.getElementById('privacy-modal');
        const footerPrivacyLink = document.getElementById('footer-link-privacy');
        const closePrivacyBtn = document.getElementById('close-privacy-modal');

        const openPrivacy = (e) => {
            if (e) e.preventDefault();
            if (privacyModal) {
                privacyModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        };

        const closePrivacy = () => {
            if (privacyModal) {
                privacyModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        };

        if (footerPrivacyLink) footerPrivacyLink.addEventListener('click', openPrivacy);
        if (closePrivacyBtn) closePrivacyBtn.addEventListener('click', closePrivacy);
        const privacyBackdrop = document.getElementById('privacy-modal-backdrop');
        if (privacyBackdrop) privacyBackdrop.addEventListener('click', closePrivacy);
        if (privacyModal) {
            privacyModal.addEventListener('click', (e) => {
                if (e.target === privacyModal) closePrivacy();
            });
        }

        // Global ESC key listener for aux modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePlate();
                closeAbout();
                closePrivacy();
            }
        });
    }

    async loadLatestPlate() {
        try {
            const data = await this.fetchCached(`${API_BASE}/api/analytics/latest-plate`);
            if (!data) return;

            const widgetLetters = document.getElementById('widget-plate-letters');
            const widgetDate = document.getElementById('widget-plate-date');
            const modalDisplay = document.getElementById('modal-plate-display');
            const modalDate = document.getElementById('modal-plate-date');
            const modalNext = document.getElementById('modal-plate-next');
            const modalTimeline = document.getElementById('modal-plate-timeline');

            const series = data.latest_series || 'NSD';
            const dateStr = data.latest_date || '2026-08-28';
            const nextSeries = data.next_series || 'NSF';

            // Format date readable (e.g. 28 Ago 2026)
            let formattedShort = dateStr;
            let formattedLong = dateStr;
            try {
                const parts = dateStr.split('-');
                const d = parseInt(parts[2], 10);
                const m = parseInt(parts[1], 10);
                const y = parts[0];
                const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const monthsLong = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                formattedShort = `${d} ${monthsShort[m-1]} ${y}`;
                formattedLong = `${d} de ${monthsLong[m-1]} de ${y}`;
            } catch (e) {}

            const num = data.latest_number || '7160';
            if (widgetLetters) widgetLetters.textContent = `${num} · ${series}`;
            if (widgetDate) widgetDate.textContent = formattedShort;
            if (modalDisplay) modalDisplay.textContent = `${num} · ${series}`;
            if (modalDate) modalDate.textContent = formattedLong;
            if (modalNext) modalNext.textContent = `0000 · ${nextSeries}`;

            if (modalTimeline && Array.isArray(data.timeline)) {
                let html = '';
                data.timeline.forEach(item => {
                    let dFmt = item.date;
                    try {
                        const [y, m, d] = item.date.split('-');
                        const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        dFmt = `${parseInt(d, 10)} ${monthsShort[parseInt(m, 10)-1]} ${y}`;
                    } catch(e) {}
                    const itemPlate = item.full_plate || `${item.number || '9999'} · ${item.series}`;
                    html += `
                        <div class="plate-timeline-item">
                            <span style="font-weight: 800; font-family: monospace; font-size: 13px; background: #ffffff; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; color: #0f172a;">
                                ${itemPlate}
                            </span>
                            <span style="color: #64748b; font-weight: 500;">
                                Registrada el <strong>${dFmt}</strong>
                            </span>
                        </div>
                    `;
                });
                modalTimeline.innerHTML = html;
            }

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.warn('Latest plate load notice:', err);
        }
    }

    bindKpiQuotaToggle() {
        const btnKpiBev = document.getElementById('btn-kpi-bev');
        const btnKpiZero = document.getElementById('btn-kpi-zero');
        if (btnKpiBev) {
            btnKpiBev.addEventListener('click', (e) => {
                e.stopPropagation();
                this.kpiQuotaMode = 'bev';
                if (this.lastAllData && this.lastAllData.summary) {
                    window.Components.renderMetrics(this.lastAllData.summary, this.kpiQuotaMode, this.lastAllData.fuel_mix || []);
                    this.bindKpiQuotaToggle();
                }
            });
        }
        if (btnKpiZero) {
            btnKpiZero.addEventListener('click', (e) => {
                e.stopPropagation();
                this.kpiQuotaMode = 'zero';
                if (this.lastAllData && this.lastAllData.summary) {
                    window.Components.renderMetrics(this.lastAllData.summary, this.kpiQuotaMode, this.lastAllData.fuel_mix || []);
                    this.bindKpiQuotaToggle();
                }
            });
        }
    }

    bindElectrificationToggles() {
        // Multi-year Quota Trend Chart Toggle (100% BEV vs BEV + PHEV)
        const btnChartBev = document.getElementById('toggle-quota-chart-bev');
        const btnChartZero = document.getElementById('toggle-quota-chart-zero');
        if (btnChartBev && btnChartZero) {
            btnChartBev.addEventListener('click', () => {
                if (this.chartQuotaMode === 'bev') return;
                this.chartQuotaMode = 'bev';
                btnChartBev.classList.add('active');
                btnChartZero.classList.remove('active');

                const titleEl = document.getElementById('chart-ev-quota-title');
                const subEl = document.getElementById('chart-ev-quota-sub');
                if (titleEl) titleEl.textContent = 'Cuota 100% Eléctricos Mes a Mes';
                if (subEl) subEl.textContent = '% BEV sobre total turismos';

                const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';
                this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-quota?mode=bev${ccaaParam}`)
                    .then(data => {
                        if (data) window.DashboardCharts.initEVQuotaTrendChart('evQuotaTrendChart', data);
                    });
            });

            btnChartZero.addEventListener('click', () => {
                if (this.chartQuotaMode === 'zero') return;
                this.chartQuotaMode = 'zero';
                btnChartZero.classList.add('active');
                btnChartBev.classList.remove('active');

                const titleEl = document.getElementById('chart-ev-quota-title');
                const subEl = document.getElementById('chart-ev-quota-sub');
                if (titleEl) titleEl.textContent = 'Cuota Electrificada (BEV + PHEV) Mes a Mes';
                if (subEl) subEl.textContent = '% Etiqueta ZERO (BEV + PHEV) sobre total turismos';

                const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';
                this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-quota?mode=zero${ccaaParam}`)
                    .then(data => {
                        if (data) window.DashboardCharts.initEVQuotaTrendChart('evQuotaTrendChart', data);
                    });
            });
        }
    }
}
