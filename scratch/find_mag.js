const fs = require('fs');
const path = require('path');

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found");
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const magRows = data.filter(r => {
        const un = String(r.UN || r.un || '').trim().toUpperCase();
        const period = String(r.Fecha_op || r.fecha_op || '').trim();
        return un === 'MAG' && period === '202603';
    });
    console.log(`Found ${magRows.length} MAG rows for 202603`);
    if (magRows.length > 0) {
        console.log("Sample MAG row:", magRows[0]);
    }
}

main().catch(console.error);
