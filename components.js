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

function renderMetrics(summary) {
    const container = document.getElementById("metrics-container");
    if (!container || !summary) return;

    const rawTotal = (summary.total_month !== undefined && summary.total_month !== null) ? summary.total_month : (summary.total_units || 0);
    const totalVal = rawTotal.toLocaleString("es-ES");

    const rawPct = (summary.pct_change !== undefined && summary.pct_change !== null) ? summary.pct_change : 0;
    const changeVal = rawPct >= 0 ? `+${rawPct}%` : `${rawPct}%`;
    const changeColor = rawPct >= 0 ? "text-green" : "text-red";
    const changeIcon = rawPct >= 0 ? "trending-up" : "trending-down";

    const evShareVal = (summary.ev_share !== undefined && summary.ev_share !== null) ? `${summary.ev_share}%` : "0%";
    const topBrandVal = summary.top_brand || "N/A";
    const topBrandUnits = (summary.top_brand_units !== undefined && summary.top_brand_units !== null && summary.top_brand_units > 0) ? `${summary.top_brand_units.toLocaleString("es-ES")} un.` : "";

    const topModelVal = summary.top_model || "N/A";
    const topModelUnits = (summary.top_model_units !== undefined && summary.top_model_units !== null && summary.top_model_units > 0) ? `${summary.top_model_units.toLocaleString("es-ES")} un.` : "";

    container.innerHTML = `
        ${createMetricCard("Matriculaciones Totales", totalVal, changeVal, changeIcon, changeColor, "vs período anterior", "car")}
        ${createMetricCard("Cuota Eléctrico Puro (BEV)", evShareVal, "DGT", "zap", "text-cyan", "sobre total vehículo", "zap")}
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

window.Components = {
    createMetricCard,
    renderMetrics,
    renderTable,
    populateSelect,
    getFuelColor
};
