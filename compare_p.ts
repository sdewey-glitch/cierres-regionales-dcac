import { fetchHistoricalSalaries } from './src/core/historical';
import * as fs from 'fs';

async function main() {
    const data = await fetchHistoricalSalaries();
    const abrExcel = data.filter(d => d.año === 2026 && d.mes === 4);
    
    const engineData = JSON.parse(fs.readFileSync('src/core/snapshots/cierre_2026_04.json', 'utf8'));

    for (const d of engineData) {
        if (d.componenteP === 0) continue;
        const e = abrExcel.find(x => x.comercial.toLowerCase() === d.asociadoComercial.toLowerCase());
        const excP = e ? e.componenteP : 0;
        
        if (Math.abs(d.componenteP - excP) > 1000) {
            console.log(d.asociadoComercial.padEnd(30), 'Engine P:', d.componenteP.toFixed(2).padStart(15), '| Excel P:', excP.toFixed(2).padStart(15), '| Diff:', (d.componenteP - excP).toFixed(2).padStart(15));
        }
    }
}

main().catch(console.error);
