/**
 * CarDataSales - Multi-language (i18n) Engine
 * Supports Spanish (es) and English (en) with zero dependencies.
 * Default is 'es' to guarantee 100% backwards-compatibility.
 */

(function () {
    const STORAGE_KEY = 'cardatasales_lang';

    const TRANSLATIONS = {
        es: {
            // Header
            header_title: "Coches más vendidos en España",
            header_subtitle: "Datos oficiales de matriculaciones de turismos procesados de la DGT",
            btn_brand_analysis: "Análisis de Marca",
            btn_model_analysis: "Comparar Modelos",
            btn_mapa: "Mapa por CPs",
            btn_top_sales: "Coche más vendido (Top 20)",
            btn_about: "Sobre el proyecto",
            plate_title: "Última Matrícula DGT",

            // Quick navigation / breadcrumbs
            home: "Inicio",
            all_spain: "ES Toda España",

            // Filters
            filter_ccaa: "Comunidad Autónoma",
            filter_period: "Período",
            filter_brand: "Marca",
            filter_model: "Modelo",
            filter_fuel: "Carburante",
            all_brands: "Todas las marcas",
            all_models: "Todos los modelos",
            all_fuels: "Todos los motores",
            all_fuels_short: "Todos",
            fuel_bev: "⚡ 100% Eléctrico (BEV)",
            fuel_phev: "🔌 Enchufable (PHEV)",
            fuel_hev: "🌿 Híbrido (HEV/MHEV)",
            fuel_gasolina: "⛽ Gasolina",
            fuel_diesel: "🛢️ Diésel",
            fuel_glp: "💨 Gas (GLP/GNC)",
            btn_apply_filters: "Filtrar",
            btn_reset_filters: "Limpiar",
            btn_export_csv: "Descargar CSV",

            // Periods
            period_month: "Mes",
            period_year: "Año",
            period_custom: "Personalizado",
            year_label: "Año",

            // KPI Cards
            kpi_total_registrations: "Matriculaciones Totales",
            kpi_comp_previous: "vs período anterior",
            kpi_bev_share: "Cuota Eléctrico Puro (BEV)",
            kpi_zero_share: "Cuota Electrificada (Etiqueta 0)",
            kpi_bev_sub: "sobre total vehículo",
            kpi_zero_sub: "BEV + PHEV enchufables",
            kpi_winning_brand: "Marca Ganadora",
            kpi_brand_hint: "👆 Clic para análisis completo",
            kpi_winning_model: "Modelo Ganador",
            kpi_model_sub: "Modelo más vendido",

            // Tabs
            tab_top_models: "Top Modelos",
            tab_top_brands: "Top Marcas",
            tab_ev_models: "Top Eléctricos (Coches)",
            tab_ev_brands: "Top Marcas Eléctricas",
            tab_monthly_matrix: "Matriz Mensual 2026",

            // Charts
            chart_fuel_mix: "Mix de Carburantes y Tecnologías",
            chart_trend: "Evolución de Matriculaciones",
            chart_market_share: "Cuota de Mercado (%)",
            chart_units: "Unidades",
            chart_registrations: "Matriculaciones",

            // Units and common
            units_suffix: "un.",
            units_text: "unidades",
            share_text: "Cuota",
            pos_text: "Pos.",
            brand_col: "Marca",
            model_col: "Modelo",
            volume_col: "Volumen",
            share_col: "Cuota (%)",
            change_col: "Var. %",

            // Map specific
            map_title: "Mapa Territorial de Ventas",
            map_subtitle: "Matriculaciones oficiales por Códigos Postales y Provincias",
            map_search_label: "Buscar CP / Pueblo",
            map_search_placeholder: "Ej: 08770, Palau, Arganda...",
            map_mode_prov: "Provincias",
            map_mode_cp: "Todos los CPs",
            map_popup_registrations: "Matriculaciones:",
            map_popup_nat_share: "Cuota nacional:",
            map_popup_total_cars: "Total Turismos",
            map_popup_top_models: "Top Modelos en",
            map_popup_view_cp_breakdown: "🔍 Ver desglose por Códigos Postales",
            map_sidebar_rank_title: "Dónde se venden más",

            // Modals & About
            modal_close: "Cerrar",
            about_title: "Sobre CarDataSales",
            updating_data: "Actualizando datos...",
            plate_widget_tooltip: "Haz clic para ver el histórico de letras de la DGT",
            last_dgt_plate: "Última Matrícula DGT",
            btn_mapa_tooltip: "Explorar mapa territorial de matriculaciones por Códigos Postales y Provincias",
            btn_follow_x: "Seguir en X",
            featured_badge: "🏆 Datos Oficiales DGT 2026",
            featured_btn: "Ver Informe y Ranking Top 20",
            temporal_controls_title: "Control Temporal y Período",
            region_ccaa_label: "🗺️ Región / CCAA:",
            opt_all_spain: "🇪🇸 Toda España",
            btn_view_map_cps: "Ver Mapa CPs",
            lbl_select_month: "📆 Mes Concreto:",
            lbl_select_year: "📊 Año Completo:",
            opt_select_year: "-- Seleccionar Año --",
            lbl_select_day: "📅 Día Concreto:",
            btn_show_more: "Ver 10 más",
            btn_show_less: "Ver menos",
            sub_monthly_evolution: "Unidades turismos por mes",
            title_fuel_mix: "Mix por Carburante",
            fuel_mix_pct: "% del total",
            title_ev_quota: "Cuota 100% Eléctricos Mes a Mes",
            sub_ev_quota: "% BEV sobre total turismos",
            title_ev_cumulative: "Acumulado 100% Eléctricos Mes a Mes",
            sub_ev_cumulative: "Unidades BEV acumuladas por año",
            title_tech_quota: "Cuota por Tecnología Mes a Mes (2026)",
            sub_tech_quota: "Evolución del % de cuota de mercado de cada propulsión",
            title_matrix_table: "Ventas Mes a Mes por Modelo",
            sub_matrix_table: "Haz clic en la flechita de cualquier columna para ordenar las ventas por ese mes o por el Total",
            search_model_or_brand: "Buscar modelo o marca...",
            btn_load_more_matrix: "Ver más modelos (Top 50)",
            title_comparator: "Comparador Intermensual e Interanual",
            sub_comparator: "Analiza la evolución del MIX de carburantes y volumen entre dos meses o años distintos",
            btn_compare: "Comparar",
            th_fuel: "Carburante",
            th_period_a: "Período A",
            th_period_b: "Período B",
            th_diff_pp: "Dif. (pp)",
            total_sales: "Ventas Totales",
            market_share: "Cuota de Mercado",
            main_technology: "Tecnología Principal",
            over_spain_total: "Sobre total España",
            of_its_sales: "de sus ventas",
            national_share: "Cuota nacional:",
            top_models_in: "Top Modelos en",
            btn_view_cp_breakdown: "🔍 Ver desglose por Códigos Postales",
            total_registrations: "Total Matriculaciones",
            top_provinces: "Top Provincias",
            click_to_focus: "(Clic para enfocar)",
            legend_vol_title: "Volumen de matriculaciones",
            legend_vol_lower: "Menor",
            legend_vol_higher: "Mayor volumen",
            btn_dashboard: "Dashboard"
        },
        en: {
            // Header
            header_title: "Best-Selling Cars in Spain",
            header_subtitle: "Official passenger car registration data processed from DGT",
            btn_brand_analysis: "Brand Analysis",
            btn_model_analysis: "Compare Models",
            btn_mapa: "Postal Codes Map",
            btn_top_sales: "Top 20 Best-Sellers",
            btn_about: "About Project",
            plate_title: "Latest DGT Plate",

            // Quick navigation / breadcrumbs
            home: "Home",
            all_spain: "All Spain",

            // Filters
            filter_ccaa: "Autonomous Region",
            filter_period: "Period",
            filter_brand: "Brand",
            filter_model: "Model",
            filter_fuel: "Powertrain",
            all_brands: "All brands",
            all_models: "All models",
            all_fuels: "All powertrains",
            all_fuels_short: "All",
            fuel_bev: "⚡ 100% Electric (BEV)",
            fuel_phev: "🔌 Plug-in Hybrid (PHEV)",
            fuel_hev: "🌿 Hybrid (HEV/MHEV)",
            fuel_gasolina: "⛽ Petrol",
            fuel_diesel: "🛢️ Diesel",
            fuel_glp: "💨 Gas (LPG/CNG)",
            btn_apply_filters: "Apply",
            btn_reset_filters: "Reset",
            btn_export_csv: "Export CSV",

            // Periods
            period_month: "Month",
            period_year: "Year",
            period_custom: "Custom",
            year_label: "Year",

            // KPI Cards
            kpi_total_registrations: "Total Registrations",
            kpi_comp_previous: "vs previous period",
            kpi_bev_share: "Pure Electric Share (BEV)",
            kpi_zero_share: "Electrified Share (Zero Label)",
            kpi_bev_sub: "of total vehicles",
            kpi_zero_sub: "BEV + PHEV plug-ins",
            kpi_winning_brand: "Winning Brand",
            kpi_brand_hint: "👆 Click for full analysis",
            kpi_winning_model: "Winning Model",
            kpi_model_sub: "Best-selling model",

            // Tabs
            tab_top_models: "Top Models",
            tab_top_brands: "Top Brands",
            tab_ev_models: "Top Electric (Cars)",
            tab_ev_brands: "Top Electric Brands",
            tab_monthly_matrix: "2026 Monthly Matrix",

            // Charts
            chart_fuel_mix: "Powertrain & Fuel Mix",
            chart_trend: "Registration Trend",
            chart_market_share: "Market Share (%)",
            chart_units: "Units",
            chart_registrations: "Registrations",

            // Units and common
            units_suffix: "units",
            units_text: "units",
            share_text: "Share",
            pos_text: "Rank",
            brand_col: "Brand",
            model_col: "Model",
            volume_col: "Volume",
            share_col: "Share (%)",
            change_col: "YoY %",

            // Map specific
            map_title: "Territorial Sales Map",
            map_subtitle: "Official registrations by Postal Codes and Provinces",
            map_search_label: "Search Postal Code / Town",
            map_search_placeholder: "e.g. 08770, Palau, Arganda...",
            map_mode_prov: "Provinces",
            map_mode_cp: "All Postal Codes",
            map_popup_registrations: "Registrations:",
            map_popup_nat_share: "National share:",
            map_popup_total_cars: "Total Passenger Cars",
            map_popup_top_models: "Top Models in",
            map_popup_view_cp_breakdown: "🔍 View Postal Codes breakdown",
            map_sidebar_rank_title: "Where it sells most",

            // Modals & About
            modal_close: "Close",
            about_title: "About CarDataSales",
            updating_data: "Updating data...",
            plate_widget_tooltip: "Click to view historical DGT license plate letters",
            last_dgt_plate: "Latest DGT Plate",
            btn_mapa_tooltip: "Explore territorial car registration map by Postal Codes and Provinces",
            btn_follow_x: "Follow on X",
            featured_badge: "🏆 Official DGT Data 2026",
            featured_btn: "View Report & Top 20 Ranking",
            temporal_controls_title: "Time Control & Period",
            region_ccaa_label: "🗺️ Region / Autonomous Comm.:",
            opt_all_spain: "🇪🇸 All Spain",
            btn_view_map_cps: "View PC Map",
            lbl_select_month: "📆 Specific Month:",
            lbl_select_year: "📊 Full Year:",
            opt_select_year: "-- Select Year --",
            lbl_select_day: "📅 Specific Day:",
            btn_show_more: "Show 10 more",
            btn_show_less: "Show less",
            sub_monthly_evolution: "Passenger car units per month",
            title_fuel_mix: "Fuel & Powertrain Mix",
            fuel_mix_pct: "% of total",
            title_ev_quota: "100% Electric Share Month by Month",
            sub_ev_quota: "% BEV out of total passenger cars",
            title_ev_cumulative: "Cumulative 100% Electric Month by Month",
            sub_ev_cumulative: "Cumulative BEV units by year",
            title_tech_quota: "Share by Powertrain Month by Month (2026)",
            sub_tech_quota: "Evolution of market share % for each powertrain",
            title_matrix_table: "Month-by-Month Sales by Model",
            sub_matrix_table: "Click the arrow on any column to sort sales by that month or by Total",
            search_model_or_brand: "Search model or brand...",
            btn_load_more_matrix: "Show more models (Top 50)",
            title_comparator: "Monthly & Annual Comparator",
            sub_comparator: "Analyze the evolution of fuel MIX and volume between two different months or years",
            btn_compare: "Compare",
            th_fuel: "Powertrain",
            th_period_a: "Period A",
            th_period_b: "Period B",
            th_diff_pp: "Diff. (pp)",
            total_sales: "Total Sales",
            market_share: "Market Share",
            main_technology: "Main Technology",
            over_spain_total: "Of total Spain",
            of_its_sales: "of its sales",
            national_share: "National share:",
            top_models_in: "Top Models in",
            btn_view_cp_breakdown: "🔍 View Postal Codes breakdown",
            total_registrations: "Total Registrations",
            top_provinces: "Top Provinces",
            click_to_focus: "(Click to focus)",
            legend_vol_title: "Registration volume",
            legend_vol_lower: "Lower",
            legend_vol_higher: "Higher volume",
            btn_dashboard: "Dashboard"
        }
    };

    class I18nManager {
        constructor() {
            // Default to 'es' to ensure 100% backward-compatibility
            let saved = 'es';
            try {
                saved = localStorage.getItem(STORAGE_KEY) || 'es';
            } catch (e) {}
            this.currentLang = (saved === 'en') ? 'en' : 'es';
        }

        getLang() {
            return this.currentLang;
        }

        getMonthName(code) {
            if (!code) return '';
            const monthIndex = (typeof code === 'string' && code.includes('-')) 
                ? parseInt(code.split('-')[1], 10) 
                : parseInt(code, 10);
            const monthsEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            if (isNaN(monthIndex) || monthIndex < 1 || monthIndex > 12) return code;
            return this.currentLang === 'en' ? monthsEn[monthIndex - 1] : monthsEs[monthIndex - 1];
        }

        t(key, fallback) {
            const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['es'];
            if (dict && dict[key]) {
                return dict[key];
            }
            if (TRANSLATIONS['es'][key]) {
                return TRANSLATIONS['es'][key];
            }
            return fallback !== undefined ? fallback : key;
        }

        setLang(lang) {
            if (lang !== 'es' && lang !== 'en') return;
            this.currentLang = lang;
            try {
                localStorage.setItem(STORAGE_KEY, lang);
            } catch (e) {}

            document.documentElement.lang = lang;
            this.updateSwitcherUI();
            this.applyStaticTranslations();

            // Notify dynamic modules (App, Charts, Mapa, Components)
            const event = new CustomEvent('languageChanged', { detail: { lang: lang } });
            window.dispatchEvent(event);
        }

        updateSwitcherUI() {
            document.querySelectorAll('.lang-btn').forEach(btn => {
                const targetLang = btn.getAttribute('data-lang');
                btn.classList.toggle('active', targetLang === this.currentLang);
            });
        }

        applyStaticTranslations() {
            // Text elements
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const trans = this.t(key);
                if (trans) {
                    el.textContent = trans;
                }
            });

            // HTML elements
            document.querySelectorAll('[data-i18n-html]').forEach(el => {
                const key = el.getAttribute('data-i18n-html');
                const trans = this.t(key);
                if (trans) {
                    el.innerHTML = trans;
                }
            });

            // Placeholder attributes
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                const trans = this.t(key);
                if (trans) {
                    el.placeholder = trans;
                }
            });

            // Title attributes
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                const trans = this.t(key);
                if (trans) {
                    el.title = trans;
                }
            });
        }

        init() {
            document.documentElement.lang = this.currentLang;
            this.updateSwitcherUI();
            this.applyStaticTranslations();

            // Attach click listeners to language switchers
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const lang = btn.getAttribute('data-lang');
                    if (lang && lang !== this.currentLang) {
                        this.setLang(lang);
                    }
                });
            });
        }
    }

    window.I18N = new I18nManager();

    // Auto-init once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.I18N.init());
    } else {
        window.I18N.init();
    }
})();
