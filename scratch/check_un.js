const fs = require('fs');
const path = require('path');

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found");
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const unSet = new Set();
    const map = {};
    for (const r of data) {
        const un = String(r.UN || r.un || '');
        unSet.add(un);
        map[un] = (map[un] || 0) + 1;
    }
    console.log("Unique UNs:", Array.from(unSet));
    console.log("UN occurrences:", map);
}

main().catch(console.error);
