// app.js - Main Application Logic with Separated Independent Year & Month Selectors, Full Historical Month Picker & CCAA Filtering

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : 'https://car-sales-api-jafd.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const app = new DashboardApp();
    app.init();
});

class DashboardApp {
    constructor() {
        this.currentPage = 1;
        this.limit = 50;
        this.currentPeriod = 'month';
        this.selectedMonth = '2026-08'; // Default Current Month = Agosto 2026
        this.selectedYear = '2026';
        this.selectedCcaa = '';
        this.currentCountry = 'es';
        this.currentMode = 'live';

        this.matrixLimit = 20; // Default Top 20 for Monthly Matrix
        this.modelsLimit = 10;
        this.evLimit = 10;
        this.brandsLimit = 10;
        this.evBrandsLimit = 10;
        this.matrixSortBy = 'ago';
        this.matrixSortDir = 'desc';
        this.tableLoaded = false; // Deferred DGT individual table loading

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

        // Deferred DGT Individual Table Elements
        this.btnLoadDgtTable = document.getElementById('btn-load-dgt-table');
        this.dgtTableContainer = document.getElementById('dgt-table-container');
    }

    async init() {
        try {
            this.populateQuickMonthDropdown();
            this.populateHistoricalCompareDropdowns();
            this.bindPeriodEvents();
            this.bindEvents();
            this.bindCompareEvents();
            this.bindMatrixEvents();

            // 1. Trigger main dashboard load FIRST (Lightning fast 0.5s)
            const refreshPromise = this.refreshAll();

            // 2. Load background dropdowns concurrently without blocking main render
            this.loadInitialDropdowns();

            await refreshPromise; // Main KPIs and Top 10 Charts are now visible on screen!

            // 3. Defer heavy secondary matrix and comparison queries to background idle time
            setTimeout(() => {
                this.loadMonthComparison();
                this.loadMonthlyMatrix('', this.matrixLimit);
            }, 400);

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
        const years = [2026, 2025, 2024];

        let html = '<option value="" disabled style="font-weight:700; color:#94a3b8;">-- Seleccionar Mes --</option>';

        years.forEach(yr => {
            const maxM = yr === 2026 ? 8 : 12;
            for (let m = maxM; m >= 1; m--) {
                const mCode = `${yr}-${m.toString().padStart(2, '0')}`;
                const isCurrent = mCode === '2026-08';
                const mLabel = isCurrent ? `${monthsName[m - 1]} ${yr} (Mes Actual)` : `${monthsName[m - 1]} ${yr}`;
                const sel = isCurrent ? 'selected' : '';
                html += `<option value="${mCode}" ${sel}>${mLabel}</option>`;
            }
        });

        this.quickMonthSelect.innerHTML = html;
    }

    populateHistoricalCompareDropdowns() {
        if (!this.compareMonthA || !this.compareMonthB) return;

        const monthsName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const years = [2026, 2025, 2024];

        let optionsHtmlA = '';
        let optionsHtmlB = '';

        years.forEach(yr => {
            const maxM = yr === 2026 ? 8 : 12;
            for (let m = maxM; m >= 1; m--) {
                const mCode = `${yr}-${m.toString().padStart(2, '0')}`;
                const mLabel = `${monthsName[m - 1]} ${yr}`;
                
                const selA = mCode === '2026-08' ? 'selected' : '';
                const selB = mCode === '2025-07' ? 'selected' : '';

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
            const res = await fetch(`${API_BASE}/api/registrations/summary?period=today`).catch(() => null);
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
        this.filters.date_from = this.dateFromFilter ? this.dateFromFilter.value : '';
        this.filters.date_to = this.dateToFilter ? this.dateToFilter.value : '';
    }

    getFullQueryParams() {
        this.readFiltersFromDOM();
        const params = {
            country: this.currentCountry,
            period: this.currentPeriod,
            mode: this.currentMode
        };

        if (this.currentPeriod === 'month' || this.currentPeriod === 'custom_month') {
            params.month = this.selectedMonth;
        } else if (this.currentPeriod === 'year') {
            params.year = this.selectedYear;
        }

        if (this.filters.ccaa) params.ccaa = this.filters.ccaa;
        if (this.filters.brand) params.brand = this.filters.brand;
        if (this.filters.model) params.model = this.filters.model;
        if (this.filters.fuel) params.fuel = this.filters.fuel;
        if (this.filters.province) params.province = this.filters.province;
        if (this.filters.date_from) params.date_from = this.filters.date_from;
        if (this.filters.date_to) params.date_to = this.filters.date_to;

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
            this.singleDatePicker.addEventListener('change', (e) => {
                const dateVal = e.target.value;
                if (dateVal) {
                    this.currentPeriod = 'custom_date';
                    if (this.dateFromFilter) this.dateFromFilter.value = dateVal;
                    if (this.dateToFilter) this.dateToFilter.value = dateVal;
                    this.updatePeriodTag();
                    this.refreshAll();
                }
            });
        }

        const containerMonth = document.getElementById('container-month-select');
        const containerYear = document.getElementById('container-year-select');

        const activateYearMode = (val = null) => {
            const targetYear = val || (this.quickYearSelect && this.quickYearSelect.value) || this.selectedYear || '2026';
            this.currentPeriod = 'year';
            this.selectedYear = targetYear;

            if (this.quickYearSelect) this.quickYearSelect.value = targetYear;
            if (this.quickMonthSelect) this.quickMonthSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
            if (this.dateFromFilter) this.dateFromFilter.value = '';
            if (this.dateToFilter) this.dateToFilter.value = '';

            this.updatePeriodTag();
            this.refreshAll();
            this.loadMonthlyMatrix('', this.matrixLimit);
        };

        const activateMonthMode = (val = null) => {
            const targetMonth = val || (this.quickMonthSelect && this.quickMonthSelect.value) || this.selectedMonth || '2026-08';
            this.currentPeriod = 'month';
            this.selectedMonth = targetMonth;
            this.selectedYear = targetMonth.split('-')[0];

            if (this.quickMonthSelect) this.quickMonthSelect.value = targetMonth;
            if (this.quickYearSelect) this.quickYearSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
            if (this.dateFromFilter) this.dateFromFilter.value = '';
            if (this.dateToFilter) this.dateToFilter.value = '';

            this.updatePeriodTag();
            this.refreshAll();
        };

        if (containerYear) {
            containerYear.addEventListener('click', (e) => {
                if (e.target !== this.quickYearSelect) {
                    activateYearMode();
                }
            });
        }

        if (containerMonth) {
            containerMonth.addEventListener('click', (e) => {
                if (e.target !== this.quickMonthSelect) {
                    activateMonthMode();
                }
            });
        }

        if (this.quickYearSelect) {
            this.quickYearSelect.addEventListener('change', (e) => {
                if (e.target.value) activateYearMode(e.target.value);
            });
        }

        if (this.quickMonthSelect) {
            this.quickMonthSelect.addEventListener('change', (e) => {
                if (e.target.value) activateMonthMode(e.target.value);
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

        const parts = (this.selectedMonth || '2026-08').split('-');
        const monthTxt = monthsName[parts[1]] || parts[1];
        const monthFormatted = `${monthTxt} ${parts[0]}`;

        let periodStr = `📆 Mes Concreto: ${monthFormatted}`;
        if (this.selectedMonth === '2026-08') {
            periodStr = `📆 Agosto 2026 (Mes Actual en Curso)`;
        }

        if (this.currentPeriod === 'year') {
            periodStr = `📊 Año ${this.selectedYear} Completo (Ene - Dic)`;
        } else if (this.singleDatePicker && this.singleDatePicker.value) {
            const dParts = this.singleDatePicker.value.split('-');
            const dFormatted = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : this.singleDatePicker.value;
            periodStr = `📅 Día Concreto: ${dFormatted}`;
        } else if (this.dateFromFilter && this.dateFromFilter.value) {
            periodStr = `📅 Rango: ${this.dateFromFilter.value} ${this.dateToFilter.value ? 'a ' + this.dateToFilter.value : ''}`;
        }

        if (this.selectedCcaa) {
            periodStr += ` | 🗺️ CCAA: ${this.selectedCcaa}`;
        }

        if (this.fuelFilter && this.fuelFilter.value) {
            periodStr += ` | ⚡ ${this.fuelFilter.value}`;
        }

        this.activePeriodTag.innerHTML = `✨ Visualizando en este momento: <strong>${periodStr}</strong>`;

        let badgeLabel = this.selectedMonth;
        if (this.singleDatePicker && this.singleDatePicker.value) {
            const dParts = this.singleDatePicker.value.split('-');
            badgeLabel = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : this.singleDatePicker.value;
        } else if (this.dateFromFilter && this.dateFromFilter.value) {
            const dParts1 = this.dateFromFilter.value.split('-');
            const d1 = dParts1.length === 3 ? `${dParts1[2]}/${dParts1[1]}/${dParts1[0]}` : this.dateFromFilter.value;
            if (this.dateToFilter && this.dateToFilter.value && this.dateToFilter.value !== this.dateFromFilter.value) {
                const dParts2 = this.dateToFilter.value.split('-');
                const d2 = dParts2.length === 3 ? `${dParts2[2]}/${dParts2[1]}/${dParts2[0]}` : this.dateToFilter.value;
                badgeLabel = `${d1} - ${d2}`;
            } else {
                badgeLabel = d1;
            }
        } else if (this.currentPeriod === 'today') badgeLabel = '⚡ Hoy (Día)';
        else if (this.currentPeriod === 'yesterday') badgeLabel = '⏮️ Ayer (Día)';
        else if (this.currentPeriod === 'year') badgeLabel = `Año ${this.selectedYear}`;

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

        if (isMonthActive) {
            if (this.quickYearSelect) this.quickYearSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
        } else if (isYearActive) {
            if (this.quickMonthSelect) this.quickMonthSelect.value = '';
            if (this.singleDatePicker) this.singleDatePicker.value = '';
        } else if (isDateActive) {
            if (this.quickMonthSelect) this.quickMonthSelect.value = '';
            if (this.quickYearSelect) this.quickYearSelect.value = '';
        }

        const inactiveStyle = "border: 1px solid #cbd5e1; box-shadow: none; background: #ffffff;";
        const activeStyle = "border: 2px solid #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); background: #ffffff;";

        cMonth.style.cssText = "display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; transition: all 0.2s ease; " + (isMonthActive ? activeStyle : inactiveStyle);
        cYear.style.cssText = "display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; transition: all 0.2s ease; " + (isYearActive ? activeStyle : inactiveStyle);
        cDate.style.cssText = "display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; transition: all 0.2s ease; " + (isDateActive ? activeStyle : inactiveStyle);
    }

    async refreshAll() {
        this.currentPage = 1;
        this.updatePeriodTag();
        await Promise.all([
            this.loadMetrics(),
            this.loadCharts()
        ]);

        if (this.tableLoaded) {
            await this.loadTableData();
        }

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

        if (this.btnLoadDgtTable) {
            this.btnLoadDgtTable.addEventListener('click', async () => {
                if (this.dgtTableContainer) {
                    this.dgtTableContainer.style.display = 'block';
                }
                this.tableLoaded = true;
                this.btnLoadDgtTable.style.display = 'none';
                await this.loadTableData();
            });
        }

        if (this.prevPageBtn) {
            this.prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadTableData();
                }
            });
        }

        if (this.nextPageBtn) {
            this.nextPageBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadTableData();
            });
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
                this.modelsLimit += 10;
                const container = document.getElementById('container-models-ranking');
                if (container) container.style.height = `${320 + (this.modelsLimit - 10) * 22}px`;
                const title = document.getElementById('title-models-ranking');
                if (title) title.textContent = `Top ${this.modelsLimit} Modelos`;
                this.loadCharts();
            });
        }

        const btnExtendEv = document.getElementById('btn-extend-ev');
        if (btnExtendEv) {
            btnExtendEv.addEventListener('click', () => {
                this.evLimit += 10;
                const container = document.getElementById('container-ev-ranking');
                if (container) container.style.height = `${320 + (this.evLimit - 10) * 22}px`;
                const title = document.getElementById('title-ev-ranking');
                if (title) title.textContent = `Top ${this.evLimit} Eléctricos (BEV)`;
                this.loadCharts();
            });
        }

        const btnExtendBrands = document.getElementById('btn-extend-brands');
        if (btnExtendBrands) {
            btnExtendBrands.addEventListener('click', () => {
                this.brandsLimit += 10;
                const container = document.getElementById('container-brands-ranking');
                if (container) container.style.height = `${320 + (this.brandsLimit - 10) * 22}px`;
                const title = document.getElementById('title-brands-ranking');
                if (title) title.textContent = `Top ${this.brandsLimit} Marcas`;
                this.loadCharts();
            });
        }

        const btnExtendEvBrands = document.getElementById('btn-extend-ev-brands');
        if (btnExtendEvBrands) {
            btnExtendEvBrands.addEventListener('click', () => {
                this.evBrandsLimit += 10;
                const container = document.getElementById('container-ev-brands-ranking');
                if (container) container.style.height = `${320 + (this.evBrandsLimit - 10) * 22}px`;
                const title = document.getElementById('title-ev-brands-ranking');
                if (title) title.textContent = `Top ${this.evBrandsLimit} Marcas BEV`;
                this.loadCharts();
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

        try {
            const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';
            const url = `${API_BASE}/api/analytics/monthly-matrix?year=${this.selectedYear}&limit=${limit}&sort_by=${this.matrixSortBy}&sort_dir=${this.matrixSortDir}${ccaaParam}${search ? '&search=' + encodeURIComponent(search) : ''}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();

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
        }
    }

    async loadMonthComparison() {
        if (!this.compareMonthA || !this.compareMonthB) return;
        const monthA = this.compareMonthA.value;
        const monthB = this.compareMonthB.value;
        const brand = this.brandFilter ? this.brandFilter.value : '';
        const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';

        try {
            const res = await fetch(`${API_BASE}/api/analytics/compare-months?month_a=${monthA}&month_b=${monthB}&brand=${encodeURIComponent(brand)}${ccaaParam}`);
            if (!res.ok) return;
            const compData = await res.json();

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

            const fallbackCcaa = [
                "Andalucía", "Aragón", "Asturias", "Canarias", "Cantabria",
                "Castilla-La Mancha", "Castilla y León", "Cataluña", "Ceuta",
                "Comunidad de Madrid", "Comunidad Valenciana", "Extremadura",
                "Galicia", "Illes Balears", "La Rioja", "Melilla", "Navarra", "País Vasco"
            ];
            const finalCcaa = (ccaaList && ccaaList.length) ? ccaaList : fallbackCcaa;

            if (this.quickCcaaSelect) {
                let html = '<option value="">🇪🇸 Toda España</option>';
                finalCcaa.forEach(c => html += `<option value="${c}">${c}</option>`);
                this.quickCcaaSelect.innerHTML = html;
            }
            if (this.ccaaFilter) {
                window.Components.populateSelect('ccaa-filter', finalCcaa, 'Todas las CCAA');
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

    async fetchCached(url) {
        if (!this.cacheMap) this.cacheMap = new Map();
        if (this.cacheMap.has(url)) {
            return this.cacheMap.get(url);
        }
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            this.cacheMap.set(url, data);
            return data;
        } catch (e) {
            console.error('Fetch error for', url, e);
            return null;
        }
    }

    renderAllDataPayload(allData) {
        if (!allData || !allData.summary) return;
        window.Components.renderMetrics(allData.summary);
        if (allData.brands) window.DashboardCharts.initBrandsRankingChart('brandsRankingChart', allData.brands);
        if (allData.models) window.DashboardCharts.initModelsRankingChart('modelsRankingChart', allData.models);
        if (allData.ev_models) window.DashboardCharts.initEVRankingChart('evRankingChart', allData.ev_models);
        if (allData.ev_brands) window.DashboardCharts.initEVBrandsRankingChart('evBrandsRankingChart', allData.ev_brands);
        if (allData.fuel_mix) {
            window.DashboardCharts.initFuelMixChart('fuelMixChart', allData.fuel_mix, (clickedFuel) => {
                if (this.fuelFilter) {
                    let targetOption = '';
                    for (let opt of this.fuelFilter.options) {
                        if (opt.value && (opt.value.includes(clickedFuel) || clickedFuel.includes(opt.value))) {
                            targetOption = opt.value;
                            break;
                        }
                    }
                    if (!targetOption && clickedFuel === 'ELECTRICO') targetOption = 'Eléctrico (BEV)';
                    if (!targetOption && clickedFuel === 'HIBRIDO') targetOption = 'Híbrido (HEV)';

                    if (this.fuelFilter.value === targetOption) {
                        this.fuelFilter.value = '';
                    } else {
                        this.fuelFilter.value = targetOption || clickedFuel;
                    }
                    this.refreshAll();
                }
            });
        }
    }

    async loadMetrics() {
        try {
            const q = this.getFullQueryParams();
            const cacheKey = `dash_cache_${q}`;

            // 1. Instant 0ms Pre-Render from Browser LocalStorage Cache
            const localCached = localStorage.getItem(cacheKey);
            if (localCached) {
                try {
                    const parsed = JSON.parse(localCached);
                    this.renderAllDataPayload(parsed);
                } catch(e) {}
            }

            // 2. Fetch fresh data from API and update UI + cache
            const allData = await this.fetchCached(`${API_BASE}/api/dashboard/all-data?${q}`);
            if (allData && allData.summary) {
                this.renderAllDataPayload(allData);
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(allData));
                } catch(e) {}
            } else {
                // Seamless fallback to individual calls
                const [summaryData, brandsData, modelsData, evData, evBrandsData, fuelData] = await Promise.all([
                    this.fetchCached(`${API_BASE}/api/summary?${q}`),
                    this.fetchCached(`${API_BASE}/api/brands/ranking?${q}&limit=${this.brandsLimit}`),
                    this.fetchCached(`${API_BASE}/api/models/ranking?${q}&limit=${this.modelsLimit}`),
                    this.fetchCached(`${API_BASE}/api/models/ranking?${q}&fuel=ELECTRICO&limit=${this.evLimit}`),
                    this.fetchCached(`${API_BASE}/api/brands/ranking?${q}&fuel=ELECTRICO&limit=${this.evBrandsLimit}`),
                    this.fetchCached(`${API_BASE}/api/fuel/mix?${q}`)
                ]);

                if (summaryData) window.Components.renderMetrics(summaryData);
                if (brandsData) window.DashboardCharts.initBrandsRankingChart('brandsRankingChart', brandsData);
                if (modelsData) window.DashboardCharts.initModelsRankingChart('modelsRankingChart', modelsData);
                if (evData) window.DashboardCharts.initEVRankingChart('evRankingChart', evData);
                if (evBrandsData) window.DashboardCharts.initEVBrandsRankingChart('evBrandsRankingChart', evBrandsData);
                if (fuelData) {
                    window.DashboardCharts.initFuelMixChart('fuelMixChart', fuelData, (clickedFuel) => {
                        if (this.fuelFilter) {
                            let targetOption = '';
                            for (let opt of this.fuelFilter.options) {
                                if (opt.value && (opt.value.includes(clickedFuel) || clickedFuel.includes(opt.value))) {
                                    targetOption = opt.value;
                                    break;
                                }
                            }
                            if (!targetOption && clickedFuel === 'ELECTRICO') targetOption = 'Eléctrico (BEV)';
                            if (!targetOption && clickedFuel === 'HIBRIDO') targetOption = 'Híbrido (HEV)';

                            if (this.fuelFilter.value === targetOption) {
                                this.fuelFilter.value = '';
                            } else {
                                this.fuelFilter.value = targetOption || clickedFuel;
                            }
                            this.refreshAll();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load metrics and all-data:', error);
        }
    }

    async loadCharts() {
        try {
            const q = this.getFullQueryParams();
            const ccaaParam = this.selectedCcaa ? `&ccaa=${encodeURIComponent(this.selectedCcaa)}` : '';

            // Execute secondary trend queries in parallel with fetchCached
            const [
                dailyData,
                monthlyEvolData,
                evQuotaData,
                evCumData,
                techQuotaData
            ] = await Promise.all([
                this.fetchCached(`${API_BASE}/api/registrations/daily?${q}&days=30`),
                this.fetchCached(`${API_BASE}/api/analytics/monthly-evolution?year=${this.selectedYear}${ccaaParam}`),
                this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-quota?${ccaaParam}`),
                this.fetchCached(`${API_BASE}/api/analytics/multiyear-ev-cumulative?${ccaaParam}`),
                this.fetchCached(`${API_BASE}/api/analytics/monthly-tech-quota?year=${this.selectedYear}${ccaaParam}`)
            ]);

            if (dailyData) {
                window.DashboardCharts.initDailyEvolutionChart('dailyEvolutionChart', dailyData, (clickedDate) => {
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

            if (monthlyEvolData) {
                window.DashboardCharts.initMonthlyEvolutionChart('monthlyEvolutionChart', monthlyEvolData);
            }

            if (evQuotaData) {
                window.DashboardCharts.initEVQuotaTrendChart('evQuotaTrendChart', evQuotaData);
            }

            if (evCumData) {
                window.DashboardCharts.initEVCumulativeTrendChart('evCumulativeTrendChart', evCumData);
            }

            const allTechTitleEl = document.getElementById('all-tech-quota-title');
            if (allTechTitleEl) allTechTitleEl.textContent = `Cuota por Tecnología Mes a Mes (${this.selectedYear})`;

            if (techQuotaData) {
                window.DashboardCharts.initAllTechQuotaChart('allTechQuotaChart', techQuotaData);
            }
        } catch (error) {
            console.error('Failed to load charts:', error);
        }
    }

    async loadTableData() {
        const tbody = document.getElementById('table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando datos...</td></tr>';

        try {
            const q = this.getFullQueryParams();
            const url = `${API_BASE}/api/registrations/table?${q}&page=${this.currentPage}&limit=${this.limit}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            window.Components.renderTable(data.data, 'table-body');

            if (this.pageInfo) this.pageInfo.textContent = `Página ${data.page} de ${data.pages || 1}`;
            if (this.prevPageBtn) this.prevPageBtn.disabled = data.page <= 1;
            if (this.nextPageBtn) this.nextPageBtn.disabled = data.page >= data.pages;

        } catch (error) {
            console.error('Failed to load table data:', error);
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red">Error al cargar datos. Backend no disponible.</td></tr>';
        }
    }

    exportCSV() {
        alert('Esta es una función Premium. Actualiza tu plan para exportar los datos en CSV.');
    }
}
