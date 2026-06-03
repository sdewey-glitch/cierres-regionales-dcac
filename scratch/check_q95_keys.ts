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
        
        // Let's check unique values of ESTADO, Cierre, Canal_Venta, etc.
        const estados = new Set(data.map((r: any) => r.estado || r.ESTADO));
        const cierres = new Set(data.map((r: any) => r.cierre || r.Cierre || r.CIERRE));
        const unList = new Set(data.map((r: any) => r.un || r.UN));
        console.log("Unique ESTADO:", Array.from(estados));
        console.log("Unique Cierre:", Array.from(cierres));
        console.log("Unique UN:", Array.from(unList));
    }
}

main().catch(console.error);
