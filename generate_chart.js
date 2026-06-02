const puppeteer = require('puppeteer');
const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style> body { margin: 0; padding: 20px; background: white; width: 800px; height: 500px; } </style>
</head>
<body>
<canvas id="myChart"></canvas>
<script>
    const labels = [];
    const dataCompleta = [];
    const dataSimple = [];
    const dataOficina = [];
    
    function getPct(x, minScale, maxScale, maxCabezas) {
        const log100 = Math.log10(100);
        const logMax = Math.log10(maxCabezas);
        const logCabezas = Math.max(Math.log10(Math.max(x, 1)), log100);
        
        let pct = minScale + (maxScale - minScale) * (1 - (logCabezas - log100) / (logMax - log100));
        return Math.max(minScale, Math.min(maxScale, pct));
    }

    for (let x = 100; x <= 6000; x += 100) {
        labels.push(x);
        dataCompleta.push(getPct(x, 15, 30, 4000));
        dataSimple.push(getPct(x, 14, 22, 6000));
        dataOficina.push(getPct(x, 5, 20, 2000));
    }

    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Escala Completa (Top 30% a 15%)',
                    data: dataCompleta,
                    borderColor: '#1a365d',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Escala Simple (Top 22% a 14%)',
                    data: dataSimple,
                    borderColor: '#38a169',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Escala Oficina (Top 20% a 5%)',
                    data: dataOficina,
                    borderColor: '#e53e3e',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                title: { display: true, text: 'Comparativa de Curvas de Retención Logarítmica', font: { size: 18 } }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Volumen de Cabezas Operadas' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    title: { display: true, text: '% Retención' },
                    min: 0, max: 35
                }
            }
        }
    });
</script>
</body>
</html>
`;

async function run() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 840, height: 540 });
    await page.setContent(html);
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'docs/comparativa_curvas.png' });
    await browser.close();
}

run();
