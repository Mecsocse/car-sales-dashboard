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
            btn_brand_analysis_short: "Marcas",
            btn_model_analysis: "Comparar Modelos",
            btn_model_analysis_short: "Modelos",
            btn_mapa: "Mapa CPs",
            btn_top_sales: "Coche más vendido (Top 20)",
            btn_top_20: "Top 20",
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
            map_brand_subtitle: "Mapa Territorial de Ventas",
            lbl_search_cp: "Buscar CP / Pueblo",
            map_search_label: "Buscar CP / Pueblo",
            map_search_placeholder: "Ej: 08770, Palau, Arganda...",
            lbl_filter_brand: "Marca",
            opt_all_brands: "Todas las marcas",
            lbl_filter_model: "Modelo",
            opt_all_models: "Todos los modelos",
            lbl_filter_fuel: "Motor",
            opt_all_fuels: "Todos los motores",
            lbl_filter_period: "Período",
            btn_mode_prov: "Provincias",
            btn_mode_cp: "Todos los CPs",
            btn_top_sales: "Top Ventas",
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
            btn_dashboard: "Dashboard",

            // Featured Snippet
            featured_snippet_h2: "¿Cuál es el coche más vendido en España en 2026? El <strong>Dacia Sandero</strong> con <strong>24.693 unidades</strong>",
            featured_snippet_p: "A fecha de septiembre de 2026, el <strong>Dacia Sandero</strong> encabeza las matriculaciones oficiales en España, seguido del <strong>SEAT Ibiza</strong> (20.719 un.) y el <strong>Toyota C-HR</strong> (19.486 un.). El <strong>Tesla Model 3</strong> es el coche 100% eléctrico más vendido (8.166 un.) y <strong>Toyota</strong> la marca líder (77.172 un.).",

            // Ranking Cards Titles
            ranking_top_models: "Top 10 Modelos",
            ranking_top_brands: "Top 10 Marcas",
            ranking_top_ev: "Top 10 Eléctricos (BEV)",
            ranking_top_ev_brands: "Top 10 Marcas BEV",

            // Year selector
            opt_year_2026: "Año 2026 Completo",
            opt_year_2025: "Año 2025 Completo",
            opt_year_2024: "Año 2024 Completo",

            // DGT License Plate Section
            plate_section_badge: "🚗 DGT Oficial · Actualización Diaria",
            plate_section_title: "Última Matrícula DGT Hoy y Previsión de Próximas Letras (2026)",
            plate_section_sub: "Consulta la serie de letras más alta observada en España, el ritmo de avance de las matriculaciones y el calendario estimado para saber qué matrícula le corresponderá a tu vehículo nuevo.",
            plate_section_btn: "Ver Histórico Completo de Series",
            plate_confirmed_label: "Última matrícula confirmada por DGT:",
            plate_date_label: "Fecha DGT:",
            plate_next_label: "Siguiente serie:",
            plate_pace_title: "¿A qué ritmo cambian las letras en España?",
            plate_pace_p: "En España se matriculan de media entre <strong>3.500 y 5.000 turismos y furgonetas cada día laborable</strong> (~80.000 al mes). Cada serie agrupa 10.000 números (del 0000 al 9999) con tres consonantes.",
            plate_bullet_duration: "<strong>Duración por serie:</strong> Una combinación de tres letras (ej: NSH) dura entre <strong>2 y 4 días laborables</strong>.",
            plate_bullet_excluded: "<strong>Letras excluidas:</strong> No existen las vocales (A, E, I, O, U) ni las letras Ñ o Q.",
            plate_bullet_milestone: "<strong>Próximo salto de letra clave:</strong> Se prevé que la serie <strong>NTB</strong> llegue en el último trimestre de 2026.",
            plate_calendar_title: "Calendario Estimado de Matrículas DGT (Septiembre - Diciembre 2026)",
            plate_th_series: "Serie de Letras",
            plate_th_range: "Rango de Matrículas",
            plate_th_status: "Estado / Fecha Estimada",
            plate_th_term: "Plazo Estimado",
            plate_active_today: "ACTIVA HOY",
            plate_r1_status: "Septiembre 2026 (En emisión)",
            plate_r1_term: "En matriculación actual",
            plate_r2_status: "Primera quincena Septiembre 2026",
            plate_r3_status: "Segunda semana Septiembre 2026",
            plate_r4_status: "Mediados Septiembre 2026",
            plate_r5_status: "Tercera semana Septiembre 2026",
            plate_r6_status: "Finales Septiembre 2026",
            plate_r7_status: "Principios Octubre 2026",
            plate_days_2_4: "~2 a 4 días",
            plate_days_5_7: "~5 a 7 días",
            plate_days_8_11: "~8 a 11 días",
            plate_days_12_15: "~12 a 15 días",
            plate_days_16_19: "~16 a 19 días",
            plate_days_20_24: "~20 a 24 días",
            plate_seo_ranking_title: "🏆 Ranking Oficial: Los Coches Más Vendidos en España (2026)",
            plate_seo_ranking_toggle: "Ver lista destacada ▼",
            plate_seo_ranking_intro: "Según las estadísticas acumuladas de la <strong>Dirección General de Tráfico (DGT)</strong> en 2026, los 15 modelos líderes de ventas en el mercado español son:",
            plate_seo_ranking_grid: `
                <div>1. <strong>Dacia Sandero</strong> (Líder absoluto de ventas)</div>
                <div>2. <strong>Toyota Corolla</strong> (Líder en tecnología híbrida)</div>
                <div>3. <strong>Seat Ibiza</strong> (Líder utilitarios)</div>
                <div>4. <strong>Seat Arona</strong> (Líder SUV urbano)</div>
                <div>5. <strong>MG ZS</strong> (Top ventas precio/calidad)</div>
                <div>6. <strong>Hyundai Tucson</strong> (Líder SUV compacto)</div>
                <div>7. <strong>Toyota Yaris Cross</strong> (SUV híbrido eficiente)</div>
                <div>8. <strong>Peugeot 2008</strong></div>
                <div>9. <strong>Renault Clio</strong></div>
                <div>10. <strong>Kia Sportage</strong></div>
                <div>11. <strong>Volkswagen T-Roc</strong></div>
                <div>12. <strong>Nissan Qashqai</strong></div>
                <div>13. <strong>Toyota C-HR</strong></div>
                <div>14. <strong>Tesla Model Y</strong> (Líder 100% eléctrico BEV)</div>
                <div>15. <strong>Tesla Model 3</strong> (Top berlina eléctrica)</div>
            `,
            plate_seo_ranking_note: "* Utiliza los selectores superiores del dashboard interactivo para filtrar por Comunidad Autónoma, tecnología (Eléctrico BEV, PHEV, HEV, Gasolina, Diésel) y consultar la matriz mensual completa.",

            // FAQ Section
            faq_title: "Preguntas Frecuentes y Análisis del Mercado Automotor en España",
            faq_subtitle: "Información oficial actualizada sobre ventas, coches más vendidos, cuota de electrificación y matrículas de la DGT",
            faq_q1: "🚘 ¿Cuál es la última matrícula asignada por la DGT hoy?",
            faq_a1: "La última matrícula oficial observada en España por la DGT corresponde a la serie <strong>NSH</strong> (ejemplo: <code>7160 · NSH</code>) a fecha de septiembre de 2026, con la serie <strong>NSJ</strong> como próxima asignación prevista. En CarDataSales monitorizamos a diario los microdatos de la Dirección General de Tráfico para ofrecer la serie de letras y numeración en tiempo real.",
            faq_q2: "🏆 ¿Cuáles son los coches más vendidos en España en 2026?",
            faq_a2: "Los turismos líderes en matriculaciones en el mercado español en 2026 son el <strong>Dacia Sandero</strong>, <strong>Toyota Corolla</strong>, <strong>Seat Arona</strong>, <strong>Seat Ibiza</strong>, <strong>Toyota Yaris Cross</strong> y <strong>Hyundai Tucson</strong>.",
            faq_q3: "⚡ ¿Qué cuota de mercado tienen los coches eléctricos en España?",
            faq_a3: "La cuota de turismos 100% eléctricos (BEV) se sitúa en torno al <strong>11% - 13%</strong> del total nacional. Sumando los híbridos enchufables (PHEV), los vehículos con distintivo ambiental <strong>CERO emisiones de la DGT</strong> alcanzan cerca del <strong>27% - 28%</strong> del mercado de turismos nuevos.",
            faq_q4: "📊 ¿De dónde proceden los datos de CarDataSales?",
            faq_a4: "Todas las estadísticas provienen de los <strong>microdatos oficiales diarios y mensuales de matriculaciones</strong> publicados por la Dirección General de Tráfico (DGT) a través del portal de datos abiertos del Gobierno de España (datos.gob.es).",
            faq_q5: "🔮 ¿Cómo funciona la previsión de matrículas y qué letra me tocará?",
            faq_a5: "En España se matriculan de media entre 3.000 y 5.000 vehículos diarios. Cada bloque de tres letras (como <strong>NSD, NSF, NSG</strong>) agrupa 10.000 números (del 0000 al 9999) y suele completarse en 2 a 4 días laborables. Se excluyen las vocales (A, E, I, O, U) y consonantes como Ñ y Q para evitar equívocos. Puedes <a href=\"#matricula\" id=\"faq-link-open-plate\" style=\"color: #2563eb; font-weight: 700; text-decoration: underline;\">abrir el visor de matrículas</a> para consultar la serie actual y la fecha de registro.",
            faq_q6: "📑 Matrícula más alta observada y cómo consultar el histórico DGT",
            faq_a6: "La matrícula más alta observada en España se actualiza a diario en nuestro widget superior con fecha y serie oficial de la DGT. Además, disponemos de la cronología completa de cuándo se estrenó cada serie de letras desde la primera matrícula del sistema actual (0000 BBB) en septiembre del año 2000.",

            // Community & Media Section
            community_badge: "⭐ Comunidad y Medios",
            community_title: "Recomendado por Divulgadores y Comunidades del Sector",
            community_subtitle: "Descubre cómo analistas y aficionados al automóvil utilizan los datos oficiales de CarDataSales",
            community_view_all: "Ver todas las menciones",
            comm_c1_role: "Analista del sector y divulgador de movilidad eléctrica",
            comm_c1_title: "\"Camino del millón de coches este año, ¿eléctricos? - Datos Reales DGT\"",
            comm_c1_desc: "Javier Cervera explica en YouTube cómo seguir la evolución del mercado del automóvil en España y la cuenta atrás hacia los primeros 100.000 turismos 100% eléctricos de 2026 a través de CarDataSales.",
            comm_c1_btn: "Ver análisis en YouTube",
            comm_c2_role: "Comunidad oficial de propietarios y seguidores en España",
            comm_c2_forum: "💬 Foro Club Tesla",
            comm_c2_topic: "Debate de entregas y matriculaciones",
            comm_c2_quote: "\"Los datos diarios de CarDataSales permiten ver al minuto el ritmo de matriculación de los Model 3 y Model Y entregados cada día en España por la DGT.\"",
            comm_c2_title: "Seguimiento diario de entregas y cuota de mercado",
            comm_c2_desc: "Foros especializados y comunidades de conductores confían en nuestros algoritmos de normalización para seguir la evolución de la cuota eléctrica y el pulso real de matriculaciones.",
            comm_c2_btn: "Seguir novedades en @CarDataSales",

            // Footer
            footer_brand: "CarDataSales",
            footer_tagline: "Inteligencia del mercado automotor con microdatos oficiales de la DGT.",
            footer_top_sales: "Coches más vendidos España (Ranking 2026)",
            footer_map: "Mapa Territorial",
            footer_plate: "Última matrícula",
            footer_forecast: "Previsión",
            footer_methodology: "Metodología",
            footer_about: "Sobre nosotros",
            footer_contact: "Contacto",
            footer_privacy: "Privacidad",
            footer_legal: "Aviso legal",
            footer_cookies: "Cookies",
            footer_source: "Fuente: datos.gob.es",

            // Modals
            modal_brand_title: "Análisis Integral de Marca",
            modal_model_title: "Comparador de Modelos"
        },
        en: {
            // Header
            header_title: "Best-Selling Cars in Spain",
            header_subtitle: "Official passenger car registration data processed from DGT",
            btn_brand_analysis: "Brand Analysis",
            btn_brand_analysis_short: "Brands",
            btn_model_analysis: "Compare Models",
            btn_model_analysis_short: "Models",
            btn_mapa: "Postal Codes Map",
            btn_top_sales: "Top 20 Best-Sellers",
            btn_top_20: "Top 20",
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
            map_brand_subtitle: "Territorial Sales Map",
            lbl_search_cp: "Search PC / Town",
            map_search_label: "Search Postal Code / Town",
            map_search_placeholder: "e.g. 08770, Palau, Arganda...",
            lbl_filter_brand: "Brand",
            opt_all_brands: "All brands",
            lbl_filter_model: "Model",
            opt_all_models: "All models",
            lbl_filter_fuel: "Powertrain",
            opt_all_fuels: "All powertrains",
            lbl_filter_period: "Period",
            btn_mode_prov: "Provinces",
            btn_mode_cp: "All Postal Codes",
            btn_top_sales: "Top Best-Sellers",
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
            btn_dashboard: "Dashboard",

            // Featured Snippet
            featured_snippet_h2: "What is the best-selling car in Spain in 2026? The <strong>Dacia Sandero</strong> with <strong>24,693 units</strong>",
            featured_snippet_p: "As of September 2026, the <strong>Dacia Sandero</strong> leads official passenger car registrations in Spain, followed by the <strong>SEAT Ibiza</strong> (20,719 units) and the <strong>Toyota C-HR</strong> (19,486 units). The <strong>Tesla Model 3</strong> is the best-selling 100% electric car (8,166 units) and <strong>Toyota</strong> is the leading brand (77,172 units).",

            // Ranking Cards Titles
            ranking_top_models: "Top 10 Models",
            ranking_top_brands: "Top 10 Brands",
            ranking_top_ev: "Top 10 Electric (BEV)",
            ranking_top_ev_brands: "Top 10 BEV Brands",

            // Year selector
            opt_year_2026: "Full Year 2026",
            opt_year_2025: "Full Year 2025",
            opt_year_2024: "Full Year 2024",

            // DGT License Plate Section
            plate_section_badge: "🚗 Official DGT · Daily Update",
            plate_section_title: "Latest DGT Plate Today & Upcoming Letters Forecast (2026)",
            plate_section_sub: "Check the highest letter series observed in Spain, registration speed, and estimated calendar to find out which license plate your new vehicle will receive.",
            plate_section_btn: "View Full Series History",
            plate_confirmed_label: "Latest plate confirmed by DGT:",
            plate_date_label: "DGT Date:",
            plate_next_label: "Next series:",
            plate_pace_title: "How fast do license plates change in Spain?",
            plate_pace_p: "In Spain, an average of <strong>3,500 to 5,000 passenger cars and vans are registered each business day</strong> (~80,000 per month). Each series groups 10,000 numbers (from 0000 to 9999) with three consonants.",
            plate_bullet_duration: "<strong>Duration per series:</strong> A three-letter combination (e.g. NSH) lasts between <strong>2 and 4 business days</strong>.",
            plate_bullet_excluded: "<strong>Excluded letters:</strong> Vowels (A, E, I, O, U) and consonants Ñ and Q are not used.",
            plate_bullet_milestone: "<strong>Next key letter milestone:</strong> The <strong>NTB</strong> series is expected to arrive in the fourth quarter of 2026.",
            plate_calendar_title: "Estimated DGT License Plates Calendar (September - December 2026)",
            plate_th_series: "Letter Series",
            plate_th_range: "Plate Range",
            plate_th_status: "Status / Estimated Date",
            plate_th_term: "Estimated Timeframe",
            plate_active_today: "ACTIVE TODAY",
            plate_r1_status: "September 2026 (Currently issuing)",
            plate_r1_term: "Currently being registered",
            plate_r2_status: "First half of September 2026",
            plate_r3_status: "Second week of September 2026",
            plate_r4_status: "Mid-September 2026",
            plate_r5_status: "Third week of September 2026",
            plate_r6_status: "Late September 2026",
            plate_r7_status: "Early October 2026",
            plate_days_2_4: "~2 to 4 days",
            plate_days_5_7: "~5 to 7 days",
            plate_days_8_11: "~8 to 11 days",
            plate_days_12_15: "~12 to 15 days",
            plate_days_16_19: "~16 to 19 days",
            plate_days_20_24: "~20 to 24 days",
            plate_seo_ranking_title: "🏆 Official Ranking: Best-Selling Cars in Spain (2026)",
            plate_seo_ranking_toggle: "View featured list ▼",
            plate_seo_ranking_intro: "According to cumulative statistics from the <strong>Directorate-General for Traffic (DGT)</strong> in 2026, the 15 leading sales models in the Spanish market are:",
            plate_seo_ranking_grid: `
                <div>1. <strong>Dacia Sandero</strong> (Overall best-seller)</div>
                <div>2. <strong>Toyota Corolla</strong> (Hybrid leader)</div>
                <div>3. <strong>Seat Ibiza</strong> (Supermini leader)</div>
                <div>4. <strong>Seat Arona</strong> (Urban SUV leader)</div>
                <div>5. <strong>MG ZS</strong> (Best value SUV)</div>
                <div>6. <strong>Hyundai Tucson</strong> (Compact SUV leader)</div>
                <div>7. <strong>Toyota Yaris Cross</strong> (Efficient hybrid SUV)</div>
                <div>8. <strong>Peugeot 2008</strong></div>
                <div>9. <strong>Renault Clio</strong></div>
                <div>10. <strong>Kia Sportage</strong></div>
                <div>11. <strong>Volkswagen T-Roc</strong></div>
                <div>12. <strong>Nissan Qashqai</strong></div>
                <div>13. <strong>Toyota C-HR</strong></div>
                <div>14. <strong>Tesla Model Y</strong> (100% electric BEV leader)</div>
                <div>15. <strong>Tesla Model 3</strong> (Top electric saloon)</div>
            `,
            plate_seo_ranking_note: "* Use the top selectors in the interactive dashboard to filter by Autonomous Community, technology (Electric BEV, PHEV, HEV, Petrol, Diesel) and explore the full monthly matrix.",

            // FAQ Section
            faq_title: "Frequently Asked Questions & Spanish Automotive Market Analysis",
            faq_subtitle: "Official up-to-date data on sales, best-selling cars, electrification market share and DGT license plates",
            faq_q1: "🚘 What is the latest license plate issued by the DGT today?",
            faq_a1: "The latest official license plate observed in Spain by the DGT corresponds to the <strong>NSH</strong> series (e.g. <code>7160 · NSH</code>) as of September 2026, with the <strong>NSJ</strong> series as the next expected assignment. At CarDataSales, we monitor daily microdata from the Directorate-General for Traffic to provide letter series and numbering in real time.",
            faq_q2: "🏆 Which are the best-selling cars in Spain in 2026?",
            faq_a2: "The leading passenger cars in registrations in the Spanish market in 2026 are the <strong>Dacia Sandero</strong>, <strong>Toyota Corolla</strong>, <strong>Seat Arona</strong>, <strong>Seat Ibiza</strong>, <strong>Toyota Yaris Cross</strong>, and <strong>Hyundai Tucson</strong>.",
            faq_q3: "⚡ What is the market share of electric cars in Spain?",
            faq_a3: "The share of 100% electric passenger cars (BEV) stands at around <strong>11% - 13%</strong> of the national total. Including plug-in hybrids (PHEV), vehicles with the DGT <strong>ZERO emissions</strong> eco-label reach nearly <strong>27% - 28%</strong> of the new passenger car market.",
            faq_q4: "📊 Where do CarDataSales data come from?",
            faq_a4: "All statistics come from the <strong>official daily and monthly vehicle registration microdata</strong> published by the Directorate-General for Traffic (DGT) through the Spanish Government open data portal (datos.gob.es).",
            faq_q5: "🔮 How does the license plate forecast work and which letter will I get?",
            faq_a5: "In Spain, an average of 3,000 to 5,000 vehicles are registered each business day. Each three-letter block (such as <strong>NSD, NSF, NSG</strong>) groups 10,000 numbers (from 0000 to 9999) and typically completes in 2 to 4 business days. Vowels (A, E, I, O, U) and consonants like Ñ and Q are excluded to avoid confusion. You can <a href=\"#matricula\" id=\"faq-link-open-plate\" style=\"color: #2563eb; font-weight: 700; text-decoration: underline;\">open the license plate viewer</a> to check current series and registration dates.",
            faq_q6: "📑 Highest plate observed and how to check DGT history",
            faq_a6: "The highest plate observed in Spain is updated daily in our top widget with official DGT dates and series. Furthermore, we provide a complete chronology of when each letter series debuted since the first registration of the current system (0000 BBB) in September 2000.",

            // Community & Media Section
            community_badge: "⭐ Community & Media",
            community_title: "Recommended by Automotive Creators & Communities",
            community_subtitle: "Discover how automotive analysts and car enthusiasts use official CarDataSales data",
            community_view_all: "View all mentions",
            comm_c1_role: "Automotive analyst & EV enthusiast",
            comm_c1_title: "\"Towards 1 million cars this year, electrics? - Real DGT Data\"",
            comm_c1_desc: "Javier Cervera explains on YouTube how to follow car market trends in Spain and the countdown to the first 100,000 100% electric passenger cars of 2026 through CarDataSales.",
            comm_c1_btn: "Watch analysis on YouTube",
            comm_c2_role: "Official community of owners and fans in Spain",
            comm_c2_forum: "💬 Club Tesla Forum",
            comm_c2_topic: "Deliveries & registrations debate",
            comm_c2_quote: "\"Daily CarDataSales data allows tracking minute by minute the registration pace of Model 3 and Model Y delivered every day in Spain by DGT.\"",
            comm_c2_title: "Daily delivery tracking & market share",
            comm_c2_desc: "Specialized forums and driver communities trust our normalization algorithms to monitor EV market share and real-time registration trends.",
            comm_c2_btn: "Follow updates at @CarDataSales",

            // Footer
            footer_brand: "CarDataSales",
            footer_tagline: "Automotive market intelligence with official DGT microdata.",
            footer_top_sales: "Best-selling cars in Spain (2026 Ranking)",
            footer_map: "Territorial Map",
            footer_plate: "Latest plate",
            footer_forecast: "Forecast",
            footer_methodology: "Methodology",
            footer_about: "About us",
            footer_contact: "Contact",
            footer_privacy: "Privacy",
            footer_legal: "Legal Notice",
            footer_cookies: "Cookies",
            footer_source: "Source: datos.gob.es",

            // Modals
            modal_brand_title: "Comprehensive Brand Analysis",
            modal_model_title: "Model Comparator"
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
