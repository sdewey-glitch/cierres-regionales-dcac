const http = require('http');

// Test con filtro year=2026&month=5
const url = 'http://localhost:4000/api/metricas-red?year=2026&month=5';
console.log(`Fetching: ${url}`);
const start = Date.now();

http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`Response in ${elapsed}s (status: ${res.statusCode})`);
        
        if (res.statusCode !== 200) {
            console.error('Error:', data.substring(0, 500));
            return;
        }
        
        const json = JSON.parse(data);
        const months = json.months || [];
        
        console.log(`\nMeses recibidos: ${months.length}`);
        for (const m of months) {
            console.log(`  ${m.monthName} ${m.year}: ${m.cabezas.toLocaleString()} cabz`);
        }
        console.log('\nYear Totals:', JSON.stringify(json.yearTotals, null, 2));
    });
}).on('error', e => console.error(e.message));
