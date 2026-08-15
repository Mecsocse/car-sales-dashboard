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
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            return `${brandObj.marca}: ${brandObj.total.toLocaleString('es-ES')} unidades`;
                        },
                        label: () => null,
                        afterBody: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            if (!brandObj || !brandObj.modelos || brandObj.modelos.length === 0) return [];

                            const lines = ['Desglose completo:'];
                            brandObj.modelos.forEach(m => {
                                lines.push(`• ${m.modelo}: ${m.total.toLocaleString('es-ES')}`);
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
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            return `${brandObj.marca}: ${brandObj.total.toLocaleString('es-ES')} unidades (BEV)`;
                        },
                        label: () => null,
                        afterBody: (tooltipItems) => {
                            const item = tooltipItems[0];
                            const brandObj = data[item.dataIndex];
                            if (!brandObj || !brandObj.modelos || brandObj.modelos.length === 0) return [];

                            const lines = ['Desglose completo:'];
                            brandObj.modelos.forEach(m => {
                                lines.push(`• ${m.modelo}: ${m.total.toLocaleString('es-ES')}`);
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
    Object.keys(yearsData).sort().reverse().forEach(year => {
        const dataArr = monthCodes.map(m => {
            const item = yearsData[year] ? yearsData[year][m] : null;
            return item ? item.quota : null;
        });

        datasets.push({
            label: year,
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
    initAllTechQuotaChart
};
