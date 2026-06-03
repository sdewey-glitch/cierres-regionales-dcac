const fs = require('fs');
const path = require('path');

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found");
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const magRows = data.filter(r => String(r.UN || '').trim().toUpperCase() === 'MAG');
    console.log(`MAG rows count: ${magRows.length}`);
    if (magRows.length > 0) {
        console.log("MAG row sample:", JSON.stringify(magRows[0], null, 2));
    }
}

main().catch(console.error);
