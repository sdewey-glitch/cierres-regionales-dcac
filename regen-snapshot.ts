import { calculateDynamicMonth } from './src/core/engine';
import { saveMonthSnapshot } from './src/core/snapshot';

async function main() {
    console.log('Regenerando snapshot Mayo 2026...');
    const results = await calculateDynamicMonth(2026, 5);
    saveMonthSnapshot(2026, 5, results);
    
    const luli = results.find(r => r.asociadoComercial.toLowerCase().includes('lucila frutos'));
    if (luli) {
        console.log('GC:', Math.round(luli.grandesCuentas || 0));
        console.log('Mermas:', Math.round(luli.mermas || 0));
        console.log('CIS:', Math.round(luli.activacionCIS || 0));
        console.log('TOTAL:', Math.round(luli.componenteP));
    }
    console.log('Done!');
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
