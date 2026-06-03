import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found at:", cacheFile);
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log("Q95 dataset rows count:", data.length);
    if (data.length > 0) {
        console.log("Sample row keys:", Object.keys(data[0]));
        console.log("Sample row values:", data[0]);
        
        const keyMap = new Map<string, string>();
        for (const k of Object.keys(data[0])) {
            keyMap.set(k.toLowerCase(), k);
        }
        console.log("Lowercased keys map:", Array.from(keyMap.entries()));
    }
}

main().catch(console.error);
