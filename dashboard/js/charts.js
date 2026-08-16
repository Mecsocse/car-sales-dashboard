// BUILD_STAMP_20260815_1325_PRODUCTION_NEW
// charts.js - Chart.js Initializations Premium Light Mode

// Set global defaults for Light Mode
Chart.defaults.color = '#475569';
Chart.defaults.borderColor = '#e2e8f0';
Chart.defaults.font.family = "'Outfit', sans-serif";

let charts = {};

// Custom plugin to render exact numeric values next to horizontal bars
const alwaysShowValuesPlugin = {
    id: 'alwaysShowValues',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
                const val = dataset.data[index];
                if (val !== undefined && val !== null && val > 0) {
                    ctx.save();
                    ctx.fillStyle = '#0f172a';
                    ctx.font = 'bold 12px Outfit, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const xPos = Math.min(bar.x + 8, chart.width - 55);
                    const yPos = bar.y;
                    ctx.fillText(val.toLocaleString('es-ES'), xPos, yPos);
                    ctx.restore();
                }
            });
        });
    }
};

function initDailyEvolutionChart(ctxId, data, onDateClick) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    
    if (charts[ctxId]) charts[ctxId].destroy();
    
    const labels = data.map(d => d.fecha);
    
    charts[ctxId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Eléctrico (BEV)',
                    data: data.map(d => d.ev),
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.15)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'PHEV',
                    data: data.map(d => d.phev),
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.15)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'HEV',
                    data: data.map(d => d.hev),
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Gasolina',
                    data: data.map(d => d.gasolina),
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements.length > 0 && onDateClick) {
                    const index = activeElements[0].index;
                    const clickedDate = labels[index];
                    onDateClick(clickedDate);
                }
            },
            plugins: {
                legend: { position: 'top', align: 'end' },
                tooltip: { mode: 'index', intersect: false }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                x: { grid: { display: false } },
                y: { stacked: true, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function initMonthlyEvolutionChart(ctxId, data) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');

    if (charts[ctxId]) charts[ctxId].destroy();

    const labels = data.map(d => d.mes_nombre);
    const totals = data.map(d => d.total);

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Matriculaciones',
                data: totals,
                backgroundColor: labels.map((_, i) => i === labels.length - 1 ? '#2563eb' : '#94a3b8'),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y.toLocaleString('es-ES')} turismos`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' } }
            }
        }
    });
}
function initBrandsRankingChart(ctxId, data) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    
    if (charts[ctxId]) charts[ctxId].destroy();
    if (el.parentElement) {
        el.parentElement.style.height = (!data || data.length === 0) ? '320px' : `${Math.max(320, data.length * 28 + 20)}px`;
    }
    if (!data || data.length === 0) return;
    
    const maxVal = Math.max(...data.map(d => d.total), 10);
    
    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.marca),
            datasets: [{
                label: 'Unidades',
                data: data.map(d => d.total),
                backgroundColor: '#7c3aed',
                borderRadius: 6
            }]
        },
        plugins: [alwaysShowValuesPlugin],
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 5, right: 40 } },
            onClick: (e, activeElements, chart) => {
                let elements = activeElements;
                if ((!elements || elements.length === 0) && chart && chart.getElementsAtEventForMode) {
                    elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
                }
                if (elements && elements.length > 0) {
                    const index = elements[0].index;
                    const brandObj = data[index];
                    if (brandObj && brandObj.marca && window.App && window.App.openBrandModal) {
                        window.App.openBrandModal(brandObj.marca);
                    }
                }
            },
            onHover: (e, activeElements, chart) => {
                let elements = activeElements;
                if ((!elements || elements.length === 0) && chart && chart.getElementsAtEventForMode) {
                    elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
                }
                if (e.native && e.native.target) {
                    e.native.target.style.cursor = (elements && elements.length > 0) ? 'pointer' : 'default';
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            return `${brandObj.marca}: ${brandObj.total.toLocaleString('es-ES')} unidades (Click para analizar)`;
                        },
                        label: () => null,
                        afterBody: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            if (!brandObj || !brandObj.modelos || brandObj.modelos.length === 0) return [];

                            const lines = ['Desglose por modelo:'];
                            brandObj.modelos.forEach(m => {
                                lines.push(`  • ${m.modelo}: ${m.total.toLocaleString('es-ES')} un.`);
                            });
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: '#f1f5f9' }, max: maxVal * 1.22 },
                y: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: '600' }, autoSkip: false } }
            }
        }
    });
}

function initModelsRankingChart(ctxId, data) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    
    if (charts[ctxId]) charts[ctxId].destroy();
    if (el.parentElement) {
        el.parentElement.style.height = (!data || data.length === 0) ? '320px' : `${Math.max(320, data.length * 28 + 20)}px`;
    }
    if (!data || data.length === 0) return;
    
    const maxVal = Math.max(...data.map(d => d.total), 10);
    
    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.modelo_full || `${d.marca} ${d.modelo}`),
            datasets: [{
                label: 'Unidades',
                data: data.map(d => d.total),
                backgroundColor: data.map(d => d.color || '#16a34a'),
                borderRadius: 6
            }]
        },
        plugins: [alwaysShowValuesPlugin],
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 5, right: 40 } },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: '#f1f5f9' }, max: maxVal * 1.22 },
                y: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: '600' }, autoSkip: false } }
            }
        }
    });
}

function initEVRankingChart(ctxId, data) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');

    if (charts[ctxId]) charts[ctxId].destroy();
    if (el.parentElement) {
        el.parentElement.style.height = (!data || data.length === 0) ? '320px' : `${Math.max(320, data.length * 28 + 20)}px`;
    }
    if (!data || data.length === 0) return;

    const maxVal = Math.max(...data.map(d => d.total), 10);

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.modelo_full || `${d.marca} ${d.modelo}`),
            datasets: [{
                label: 'Unidades 100% Eléctrico',
                data: data.map(d => d.total),
                backgroundColor: '#0284c7',
                borderRadius: 6
            }]
        },
        plugins: [alwaysShowValuesPlugin],
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 5, right: 40 } },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: '#f1f5f9' }, max: maxVal * 1.22 },
                y: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: '600' }, autoSkip: false } }
            }
        }
    });
}

function initEVBrandsRankingChart(ctxId, data) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');

    if (charts[ctxId]) charts[ctxId].destroy();
    if (el.parentElement) {
        el.parentElement.style.height = (!data || data.length === 0) ? '320px' : `${Math.max(320, data.length * 28 + 20)}px`;
    }
    if (!data || data.length === 0) return;

    const maxVal = Math.max(...data.map(d => d.total), 10);

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.marca),
            datasets: [{
                label: 'Unidades Marcas BEV',
                data: data.map(d => d.total),
                backgroundColor: '#0891b2',
                borderRadius: 6
            }]
        },
        plugins: [alwaysShowValuesPlugin],
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 5, right: 40 } },
            onClick: (e, activeElements, chart) => {
                let elements = activeElements;
                if ((!elements || elements.length === 0) && chart && chart.getElementsAtEventForMode) {
                    elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
                }
                if (elements && elements.length > 0) {
                    const index = elements[0].index;
                    const brandObj = data[index];
                    if (brandObj && brandObj.marca && window.App && window.App.openBrandModal) {
                        window.App.openBrandModal(brandObj.marca);
                    }
                }
            },
            onHover: (e, activeElements, chart) => {
                let elements = activeElements;
                if ((!elements || elements.length === 0) && chart && chart.getElementsAtEventForMode) {
                    elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, true);
                }
                if (e.native && e.native.target) {
                    e.native.target.style.cursor = (elements && elements.length > 0) ? 'pointer' : 'default';
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            return `${brandObj.marca}: ${brandObj.total.toLocaleString('es-ES')} unidades BEV (Click para analizar)`;
                        },
                        label: () => null,
                        afterBody: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            if (!brandObj || !brandObj.modelos || brandObj.modelos.length === 0) return [];

                            const lines = ['Desglose por modelo (BEV):'];
                            brandObj.modelos.forEach(m => {
                                lines.push(`  • ${m.modelo}: ${m.total.toLocaleString('es-ES')} un.`);
                            });
                            return lines;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: '#f1f5f9' }, max: maxVal * 1.22 },
                y: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: '600' }, autoSkip: false } }
            }
        }
    });
}

function initFuelMixChart(ctxId, rawData, onFuelClick) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    
    if (charts[ctxId]) charts[ctxId].destroy();

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return;

    function getFuelColor(fuelName) {
        const s = String(fuelName || '').toUpperCase();
        if (s.includes('GASOLINA')) return '#ef4444'; // Vibrant Red
        if (s.includes('PHEV') || s.includes('ENCHUF')) return '#8b5cf6'; // Electric Purple
        if (s.includes('HIBRID') || s.includes('HÍBRID') || s.includes('HEV') || s.includes('MHEV') || s.includes('HBRID')) return '#10b981'; // Emerald Green
        if (s.includes('ELEC') || s.includes('BEV') || s.includes('ELÉC') || s.includes('ELC') || s === 'EV') return '#06b6d4'; // Cyan / Teal
        if (s.includes('DIESEL') || s.includes('DIÉSEL') || s.includes('GASOIL')) return '#64748b'; // Slate Grey
        if (s.includes('GAS') || s.includes('GLP') || s.includes('GNC')) return '#f59e0b'; // Amber Orange
        if (s.includes('HIDRO') || s.includes('H2') || s.includes('FCEV')) return '#3b82f6'; // Sky Blue
        return '#6366f1';
    }

    const data = rawData.map(d => {
        const name = d.carburante || d.nombre || d.grupo || 'Otros';
        const total = Number(d.total || d.unidades || 0);
        const color = getFuelColor(name);
        return { carburante: name, total, color };
    }).filter(d => d.total > 0);

    if (data.length === 0) return;

    const totalSum = data.reduce((acc, curr) => acc + curr.total, 0) || 1;
    
    charts[ctxId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => `${d.carburante} (${((d.total/totalSum)*100).toFixed(1)}%)`),
            datasets: [{
                data: data.map(d => d.total),
                backgroundColor: data.map(d => d.color),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements.length > 0 && onFuelClick) {
                    const index = activeElements[0].index;
                    const clickedFuel = data[index].carburante;
                    onFuelClick(clickedFuel);
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#334155', font: { size: 12, weight: '600' }, boxWidth: 16, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: (tooltipItem) => {
                            const val = tooltipItem.parsed;
                            const pct = ((val / totalSum) * 100).toFixed(1);
                            return ` ${val.toLocaleString('es-ES')} un. (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });
}

function initCompareFuelMixChart(ctxId, compData) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');

    if (charts[ctxId]) charts[ctxId].destroy();

    const labels = compData.fuel_comparison.map(f => f.carburante);
    const dataA = compData.fuel_comparison.map(f => f.pct_a);
    const dataB = compData.fuel_comparison.map(f => f.pct_b);

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: compData.month_a,
                    data: dataA,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                },
                {
                    label: compData.month_b,
                    data: dataB,
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (val) => `${val}%` }
                }
            }
        }
    });
}

// Plugin to draw annual mean quota reference lines with badges for all years
const annualAvgQuotaPlugin = {
    id: 'annualAvgQuota',
    afterDraw(chart) {
        const { ctx, chartArea, scales: { y } } = chart;
        if (!y || !chartArea) return;
        const { left, right, top, bottom } = chartArea;

        const linesToDraw = [];
        chart.data.datasets.forEach(dataset => {
            if (dataset.annualAvg !== undefined && dataset.annualAvg !== null && dataset.showAvgLine) {
                const yVal = dataset.annualAvg;
                const yPos = y.getPixelForValue(yVal);
                if (yPos >= top && yPos <= bottom) {
                    linesToDraw.push({
                        dataset,
                        yVal,
                        yPos,
                        color: dataset.borderColor,
                        txt: `Media ${dataset.yearLabel}: ${yVal.toFixed(1)}%`
                    });
                }
            }
        });

        // 1. Draw dashed reference lines
        linesToDraw.forEach(item => {
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.65;
            ctx.moveTo(left, item.yPos);
            ctx.lineTo(right, item.yPos);
            ctx.stroke();
            ctx.restore();
        });

        // 2. Draw staggered pill badges on the right
        linesToDraw.sort((a, b) => a.yPos - b.yPos);
        let prevBadgeY = -999;
        linesToDraw.forEach(item => {
            ctx.save();
            ctx.font = 'bold 11px Outfit, sans-serif';
            const textWidth = ctx.measureText(item.txt).width;
            const badgeW = textWidth + 14;
            const badgeH = 20;
            const badgeX = right - badgeW - 6;
            
            let targetY = item.yPos - (badgeH / 2);
            if (targetY < prevBadgeY + badgeH + 2) {
                targetY = prevBadgeY + badgeH + 2;
            }
            prevBadgeY = targetY;

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(badgeX, targetY, badgeW, badgeH, 6);
            } else {
                ctx.rect(badgeX, targetY, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = item.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.txt, badgeX + (badgeW / 2), targetY + (badgeH / 2));
            ctx.restore();
        });
    }
};

function initEVQuotaTrendChart(ctxId, yearsData) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthCodes = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    const YEAR_COLORS = {
        '2026': '#16a34a', // green
        '2025': '#dc2626', // red
        '2024': '#ea580c', // orange
        '2023': '#eab308'  // yellow
    };

    const datasets = [];
    const sortedYears = Object.keys(yearsData).sort().reverse();
    sortedYears.forEach(year => {
        const validQuotas = [];
        const dataArr = monthCodes.map(m => {
            const item = yearsData[year] ? yearsData[year][m] : null;
            if (item && item.quota !== null && item.quota !== undefined) {
                validQuotas.push(Number(item.quota));
                return item.quota;
            }
            return null;
        });

        const avgQuota = validQuotas.length > 0
            ? Number((validQuotas.reduce((a, b) => a + b, 0) / validQuotas.length).toFixed(1))
            : null;

        const labelText = avgQuota !== null ? `${year} (Media: ${avgQuota}%)` : year;

        datasets.push({
            label: labelText,
            yearLabel: year,
            annualAvg: avgQuota,
            showAvgLine: true, // Show average line for all available years
            data: dataArr,
            borderColor: YEAR_COLORS[year] || '#2563eb',
            backgroundColor: YEAR_COLORS[year] || '#2563eb',
            tension: 0.3,
            borderWidth: year === '2026' ? 3 : 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: false
        });
    });

    charts[ctxId] = new Chart(ctx, {
        type: 'line',
        data: { labels: monthLabels, datasets },
        plugins: [annualAvgQuotaPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'center' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y + '%' : 'N/A'}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (v) => v.toLocaleString('es-ES') }
                }
            }
        }
    });
}

function initEVCumulativeTrendChart(ctxId, cumulativeData) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthCodes = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    const YEAR_COLORS = {
        '2026': '#16a34a',
        '2025': '#dc2626',
        '2024': '#ea580c',
        '2023': '#eab308'
    };

    const datasets = [];
    Object.keys(cumulativeData).sort().reverse().forEach(year => {
        const dataArr = monthCodes.map(m => {
            return cumulativeData[year] && cumulativeData[year][m] !== undefined ? cumulativeData[year][m] : null;
        });

        datasets.push({
            label: year,
            data: dataArr,
            borderColor: YEAR_COLORS[year] || '#2563eb',
            backgroundColor: YEAR_COLORS[year] || '#2563eb',
            tension: 0.2,
            borderWidth: year === '2026' ? 3 : 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: false
        });
    });

    charts[ctxId] = new Chart(ctx, {
        type: 'line',
        data: { labels: monthLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'center' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toLocaleString('es-ES') + ' un.' : 'N/A'}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (v) => `${(v/1000).toFixed(0)}k` }
                }
            }
        }
    });
}

function initAllTechQuotaChart(ctxId, techData) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthCodes = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    const TECH_COLORS = {
        "GASOLINA":                 "#dc2626", // red
        "HÍBRIDO (HEV/MHEV)":       "#16a34a", // green
        "HÍBRIDO ENCHUFABLE (PHEV)": "#7c3aed", // purple
        "ELÉCTRICO (BEV)":          "#0284c7", // blue
        "DIÉSEL":                   "#64748b"  // slate
    };

    const allTechs = ["GASOLINA", "HÍBRIDO (HEV/MHEV)", "HÍBRIDO ENCHUFABLE (PHEV)", "ELÉCTRICO (BEV)", "DIÉSEL"];

    const datasets = allTechs.map(tech => {
        const dataArr = monthCodes.map(m => {
            return techData[m] && techData[m][tech] !== undefined ? techData[m][tech] : null;
        });

        return {
            label: tech,
            data: dataArr,
            borderColor: TECH_COLORS[tech] || '#2563eb',
            backgroundColor: TECH_COLORS[tech] || '#2563eb',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            spanGaps: false
        };
    });

    charts[ctxId] = new Chart(ctx, {
        type: 'line',
        data: { labels: monthLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'center' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y + '%' : 'N/A'}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (v) => `${v}%` }
                }
            }
        }
    });
}

// -------------------------------------------------------------
// BRAND DEEP DIVE MODAL CHARTS
// -------------------------------------------------------------
function initBrandMonthlyChart(ctxId, monthlyA, monthlyB, nameA, nameB) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const labels = (monthlyA || []).map(m => m.mes_nombre);
    const datasets = [{
        label: nameA,
        data: (monthlyA || []).map(m => m.total),
        backgroundColor: '#2563eb', // Brand A: Blue
        borderRadius: 4
    }];

    if (monthlyB && nameB) {
        datasets.push({
            label: nameB,
            data: (monthlyB || []).map(m => m.total),
            backgroundColor: '#dc2626', // Brand B: Red
            borderRadius: 4
        });
    }

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: !!nameB, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES')} un.`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => v.toLocaleString('es-ES') } }
            }
        }
    });
}

function initBrandYearlyChart(ctxId, yearlyA, yearlyB, nameA, nameB) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const labels = (yearlyA || []).map(y => y.anio);
    const datasets = [{
        label: nameA,
        data: (yearlyA || []).map(y => y.total),
        backgroundColor: '#2563eb', // Brand A: Blue
        borderRadius: 6
    }];

    if (yearlyB && nameB) {
        datasets.push({
            label: nameB,
            data: (yearlyB || []).map(y => y.total),
            backgroundColor: '#dc2626', // Brand B: Red
            borderRadius: 6
        });
    }

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: !!nameB, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES')} un.`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => v.toLocaleString('es-ES') } }
            }
        }
    });
}

function initBrandModelsChart(ctxId, modelsA, modelsB, nameA, nameB) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    if (!modelsB) {
        // Single Brand Mode: Horizontal bar of all models
        const topModels = (modelsA || []).slice(0, 15);
        if (el.parentElement) {
            el.parentElement.style.height = `${Math.max(280, topModels.length * 28 + 30)}px`;
        }

        charts[ctxId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topModels.map(m => m.modelo),
                datasets: [{
                    label: nameA,
                    data: topModels.map(m => m.total),
                    backgroundColor: '#2563eb', // Brand A: Blue
                    borderRadius: 5
                }]
            },
            plugins: [alwaysShowValuesPlugin],
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false }, ticks: { color: '#0f172a', font: { weight: '600' } } }
                }
            }
        });
    } else {
        // Comparison Mode: Grouped models
        const topA = (modelsA || []).slice(0, 8);
        const topB = (modelsB || []).slice(0, 8);
        const allModelNames = Array.from(new Set([...topA.map(m => m.modelo), ...topB.map(m => m.modelo)]));
        const mapA = Object.fromEntries((modelsA || []).map(m => [m.modelo, m.total]));
        const mapB = Object.fromEntries((modelsB || []).map(m => [m.modelo, m.total]));

        if (el.parentElement) {
            el.parentElement.style.height = `${Math.max(280, allModelNames.length * 32 + 30)}px`;
        }

        charts[ctxId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allModelNames,
                datasets: [
                    {
                        label: nameA,
                        data: allModelNames.map(m => mapA[m] || 0),
                        backgroundColor: '#2563eb', // Brand A: Blue
                        borderRadius: 4
                    },
                    {
                        label: nameB,
                        data: allModelNames.map(m => mapB[m] || 0),
                        backgroundColor: '#dc2626', // Brand B: Red
                        borderRadius: 4
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x.toLocaleString('es-ES')} un.`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false }, ticks: { color: '#0f172a', font: { weight: '600' } } }
                }
            }
        });
    }
}

function initBrandFuelMixChart(ctxId, fuelA, fuelB, nameA, nameB) {
    const el = document.getElementById(ctxId);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[ctxId]) charts[ctxId].destroy();

    const allFuels = ['Gasolina', 'Diésel', 'Híbrido (HEV/MHEV)', 'Híbrido Enchufable (PHEV)', 'Eléctrico (BEV)', 'Gas (GLP/GNC)'];
    const mapA = Object.fromEntries((fuelA || []).map(f => [f.carburante, f.pct]));
    const mapB = Object.fromEntries((fuelB || []).map(f => [f.carburante, f.pct]));

    const datasets = [{
        label: nameA,
        data: allFuels.map(f => mapA[f] || 0),
        backgroundColor: '#2563eb', // Brand A: Blue
        borderRadius: 4
    }];

    if (fuelB && nameB) {
        datasets.push({
            label: nameB,
            data: allFuels.map(f => mapB[f] || 0),
            backgroundColor: '#dc2626', // Brand B: Red
            borderRadius: 4
        });
    }

    charts[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: allFuels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: !!nameB, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v) => `${v}%` } }
            }
        }
    });
}

window.DashboardCharts = {
    initDailyEvolutionChart,
    initMonthlyEvolutionChart,
    initBrandsRankingChart,
    initModelsRankingChart,
    initEVRankingChart,
    initEVBrandsRankingChart,
    initFuelMixChart,
    initCompareFuelMixChart,
    initEVQuotaTrendChart,
    initEVCumulativeTrendChart,
    initAllTechQuotaChart,
    initBrandMonthlyChart,
    initBrandYearlyChart,
    initBrandModelsChart,
    initBrandFuelMixChart
};
