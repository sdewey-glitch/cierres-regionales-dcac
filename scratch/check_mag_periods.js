const fs = require('fs');
const path = require('path');

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found");
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Group MAG rows by period
    const periods = {};
    for (const r of data) {
        const un = String(r.UN || '').trim().toUpperCase();
        if (un === 'MAG') {
            const p = String(r.Fecha_op || '').trim();
            periods[p] = (periods[p] || 0) + 1;
        }
    }
    console.log("MAG periods and counts:", periods);
}

main().catch(console.error);
