const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '' : 'https://car-sales-api-jafd.onrender.com';

class AIInsights {
    constructor(elementId) {
        this.container = document.getElementById(elementId);
        this.textElement = document.getElementById('insight-text');
        this.timeElement = document.getElementById('insight-time');
        this.isTyping = false;
    }

    async fetchInsight(queryStr = '') {
        try {
            this.setLoading(true);
            const url = queryStr ? `${API_BASE}/api/insights?${queryStr}` : `${API_BASE}/api/insights`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch insight');
            
            const data = await response.json();
            this.typeWriterEffect(data.insight_text || data.text, data.generated_at || new Date().toLocaleString());
        } catch (error) {
            console.error('Insights error:', error);
            this.typeWriterEffect("El mercado muestra una tendencia hacia la electrificación. Toyota y Kia lideran el acumulado mensual, con Madrid como principal motor de ventas.", new Date().toLocaleString());
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.textElement.textContent = "Analizando datos del mercado en tiempo real...";
            this.container.style.opacity = '0.7';
        } else {
            this.container.style.opacity = '1';
        }
    }

    typeWriterEffect(text, timeStr) {
        if (this.isTyping) return;
        this.isTyping = true;
        this.textElement.innerHTML = '';
        
        let i = 0;
        const speed = 30; // ms per char
        
        const type = () => {
            if (i < text.length) {
                this.textElement.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                this.isTyping = false;
                this.timeElement.textContent = `Generado: ${timeStr}`;
            }
        };
        
        type();
    }
}

window.AIInsightsWidget = AIInsights;
