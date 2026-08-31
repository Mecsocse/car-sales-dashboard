// components.js - Reusable UI Components

function createMetricCard(title, value, delta, deltaIcon, deltaColor, extraText, iconName = "bar-chart-2") {
    return `
        <div class="glass-panel metric-card">
            <div class="metric-header">
                <span>${title}</span>
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="metric-value">${value}</div>
            <div class="metric-footer">
                <span class="${deltaColor}">
                    <i data-lucide="${deltaIcon}" style="width:14px; height:14px;"></i> ${delta}
                </span>
                <span class="text-muted">${extraText}</span>
            </div>
        </div>
    `;
}

function renderMetrics(summary, quotaMode = 'bev') {
    const container = document.getElementById("metrics-container");
    if (!container || !summary) return;

    const totalNum = summary.total_month || summary.total_registrations || 0;
    const totalVal = totalNum ? totalNum.toLocaleString("es-ES") : "0";
    const changeVal = summary.pct_change >= 0 ? `+${summary.pct_change}%` : `${summary.pct_change}%`;
    const changeColor = summary.pct_change >= 0 ? "text-green" : "text-red";
    const changeIcon = summary.pct_change >= 0 ? "trending-up" : "trending-down";

    const isZero = quotaMode === 'zero';
    const quotaTitle = isZero ? "Cuota Electrificada (Etiqueta 0)" : "Cuota Eléctrico Puro (BEV)";
    const rawZero = (summary.zero_share !== undefined && summary.zero_share !== null) ? summary.zero_share : summary.zero_quota;
    const rawEv = (summary.ev_share !== undefined && summary.ev_share !== null) ? summary.ev_share : summary.ev_quota;
    const quotaVal = isZero 
        ? (rawZero !== undefined && rawZero !== null ? `${rawZero}%` : "0%")
        : (rawEv !== undefined && rawEv !== null ? `${rawEv}%` : "0%");
    const quotaSub = isZero ? "BEV + PHEV enchufables" : "sobre total vehículo";
    const quotaBadge = isZero ? "ZERO" : "DGT";

    const rawBrand = summary.top_brand || "N/A";
    const topBrandVal = rawBrand.toUpperCase().includes('DESCONOCIDO') ? "N/A" : rawBrand;
    const topBrandUnits = (topBrandVal !== "N/A" && summary.top_brand_units) ? `${summary.top_brand_units.toLocaleString("es-ES")} un.` : "";

    const rawModel = summary.top_model || "N/A";
    const topModelVal = rawModel.toUpperCase().includes('DESCONOCIDO') ? "N/A" : rawModel;
    const topModelUnits = (topModelVal !== "N/A" && summary.top_model_units) ? `${summary.top_model_units.toLocaleString("es-ES")} un.` : "";

    const quotaCardHtml = `
        <div class="glass-panel metric-card">
            <div class="metric-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span id="metric-quota-title">${quotaTitle}</span>
                <div class="electrified-toggle-pills" id="kpi-quota-toggle">
                    <button class="pill-btn ${!isZero ? 'active' : ''}" id="btn-kpi-bev" data-mode="bev">100% BEV</button>
                    <button class="pill-btn ${isZero ? 'active' : ''}" id="btn-kpi-zero" data-mode="zero">+PHEV</button>
                </div>
            </div>
            <div class="metric-value" id="metric-quota-value">${quotaVal}</div>
            <div class="metric-footer">
                <span class="text-cyan">
                    <i data-lucide="zap" style="width:14px; height:14px;"></i> <span id="metric-quota-badge">${quotaBadge}</span>
                </span>
                <span class="text-muted" id="metric-quota-sub">${quotaSub}</span>
            </div>
        </div>
    `;

    container.innerHTML = `
        ${createMetricCard("Matriculaciones Totales", totalVal, changeVal, changeIcon, changeColor, "vs período anterior", "car")}
        ${quotaCardHtml}
        ${createMetricCard("Marca Ganadora", topBrandVal, topBrandUnits, "award", "text-green", "Líder de ventas", "award")}
        ${createMetricCard("Modelo Ganador", topModelVal, topModelUnits, "trophy", "text-purple", "Modelo más vendido", "trophy")}
    `;

    if (window.lucide) lucide.createIcons();
}

function renderTable(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay datos disponibles para la selección</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.fecha}</td>
            <td><strong>${item.marca}</strong></td>
            <td><span class="badge-model">${item.modelo || '-'}</span></td>
            <td><span style="font-weight:600; color:#0284c7;">${item.ccaa || '-'}</span></td>
            <td>${item.provincia}</td>
            <td>
                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${getFuelColor(item.carburante)}; margin-right:6px;"></span>
                ${item.carburante}
            </td>
            <td><strong>${item.unidades}</strong></td>
        </tr>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

function getFuelColor(fuel) {
    const colors = {
        'EV': '#00d4ff',
        'Eléctrico (BEV)': '#00d4ff',
        'PHEV': '#7c3aed',
        'Híbrido Enchufable': '#7c3aed',
        'HEV': '#10b981',
        'Híbrido (HEV)': '#10b981',
        'Gasolina': '#ef4444',
        'Diésel': '#f59e0b',
        'Diesel': '#f59e0b',
        'GLP': '#ec4899',
        'Otros': '#94a3b8'
    };
    return colors[fuel] || colors['Otros'];
}

function populateSelect(selectId, options, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentVal = select.value;
    let html = `<option value="">${defaultText}</option>`;
    options.forEach(opt => {
        const val = typeof opt === 'object' ? (opt.id || opt.name) : opt;
        const text = typeof opt === 'object' ? opt.name : opt;
        const sel = val === currentVal ? "selected" : "";
        html += `<option value="${val}" ${sel}>${text}</option>`;
    });
    
    select.innerHTML = html;
}

function patchMetricCardsIfMissing(cleanBrands, cleanModels) {
    const container = document.getElementById("metrics-container");
    if (!container) return;

    const cards = container.querySelectorAll(".metric-card");
    if (cards.length >= 4) {
        // Card 3: Marca Ganadora
        const brandCard = cards[2];
        const brandValEl = brandCard.querySelector(".metric-value");
        const brandFootEl = brandCard.querySelector(".metric-footer span:first-child");
        if (cleanBrands && cleanBrands.length > 0) {
            const topB = cleanBrands[0];
            if (brandValEl && (brandValEl.textContent.trim() === "N/A" || brandValEl.textContent.toUpperCase().includes("DESCONOCIDO") || brandValEl.textContent.startsWith("202"))) {
                brandValEl.textContent = topB.marca;
                if (brandFootEl && topB.total) {
                    brandFootEl.innerHTML = `<i data-lucide="award" style="width:14px; height:14px;"></i> ${topB.total.toLocaleString("es-ES")} un.`;
                }
            }
        }

        // Card 4: Modelo Ganador
        const modelCard = cards[3];
        const modelValEl = modelCard.querySelector(".metric-value");
        const modelFootEl = modelCard.querySelector(".metric-footer span:first-child");
        if (cleanModels && cleanModels.length > 0) {
            const topM = cleanModels[0];
            if (modelValEl && (modelValEl.textContent.trim() === "N/A" || modelValEl.textContent.toUpperCase().includes("DESCONOCIDO") || modelValEl.textContent.startsWith("202"))) {
                modelValEl.textContent = topM.modelo_full || `${topM.marca} ${topM.modelo}`;
                if (modelFootEl && topM.total) {
                    modelFootEl.innerHTML = `<i data-lucide="trophy" style="width:14px; height:14px;"></i> ${topM.total.toLocaleString("es-ES")} un.`;
                }
            }
        }
        if (window.lucide) lucide.createIcons();
    }
}

window.Components = {
    createMetricCard,
    renderMetrics,
    patchMetricCardsIfMissing,
    renderTable,
    populateSelect,
    getFuelColor
};

