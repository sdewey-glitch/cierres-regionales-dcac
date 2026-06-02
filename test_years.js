const http = require('http');

http.get('http://localhost:4000/api/metricas-red', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log('=== MESES POR AÑO ===');
        const byYear = {};
        for (const m of json.months) {
            if (!byYear[m.year]) byYear[m.year] = [];
            byYear[m.year].push(`${m.monthName}: ${m.cabezas.toLocaleString()} cabz`);
        }
        for (const [y, ms] of Object.entries(byYear).sort(([a],[b]) => b - a)) {
            console.log(`\n${y} (${ms.length} meses):`);
            for (const m of ms) console.log(`  ${m}`);
        }
        console.log('\n=== YEAR TOTALS ===');
        for (const [y, t] of Object.entries(json.yearTotals).sort(([a],[b]) => b - a)) {
            console.log(`${y}: ${t.cabezas.toLocaleString()} cabz, ${t.tropas} tropas, ${t.meses} meses`);
        }
    });
}).on('error', e => console.error(e.message));
