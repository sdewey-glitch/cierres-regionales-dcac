const http = require('http');

console.log('Fetching /api/metricas-red from Q95...');
const start = Date.now();

http.get('http://localhost:4000/api/metricas-red', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`Response received in ${elapsed}s (status: ${res.statusCode})`);
        
        if (res.statusCode !== 200) {
            console.error('Error:', data.substring(0, 500));
            return;
        }
        
        const json = JSON.parse(data);
        const months = json.months || [];
        
        console.log(`\n=== MESES DISPONIBLES (${months.length}) ===`);
        for (const m of months.slice(0, 8)) {
            console.log(`  ${m.monthName} ${m.year}: ${m.cabezas.toLocaleString()} cabz, ${m.tropas} tropas`);
            if (m.canales) {
                const cKeys = Object.keys(m.canales);
                for (const ck of cKeys) {
                    const c = m.canales[ck];
                    console.log(`    ${ck}: ${c.cabezas.toLocaleString()} cabz, ${c.tropas} trop, CCC'=${(c.ccc * 100).toFixed(0)}%`);
                }
            }
        }
        
        // Focus on May 2026
        const may = months.find(m => m.month === 5 && m.year === 2026);
        if (may) {
            console.log('\n=== MAYO 2026 DETALLE ===');
            console.log('Cabezas total:', may.cabezas.toLocaleString());
            console.log('Tropas:', may.tropas);
            console.log('Categorías:', JSON.stringify(may.categorias, null, 2));
            console.log('\nDoble Click (OVERALL):', JSON.stringify(may.categoriasDetalle?.OVERALL, null, 2));
        }
        
        console.log('\n=== TOTALES ANUALES ===');
        console.log(JSON.stringify(json.yearTotals, null, 2));
    });
}).on('error', e => console.error('Request error:', e.message));
