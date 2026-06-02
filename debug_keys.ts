import { fetchHistoricalSalaries } from './src/core/historical';
import { calculateDynamicMonth } from './src/core/engine';

async function main() {
    const hist = await fetchHistoricalSalaries();
    const histKeys = new Set(hist.map(h => `${h.comercial.toLowerCase()}_${h.año}${String(h.mes).padStart(2, '0')}`));
    
    // Check one month, say April 2026 (year 2026, month 4)
    const dyn = await calculateDynamicMonth(2026, 4);
    console.log("Comparing keys for April 2026:");
    for (const d of dyn) {
        const key = `${d.asociadoComercial.toLowerCase()}_202604`;
        const exists = histKeys.has(key);
        console.log(`  Dynamic: "${d.asociadoComercial}" | Key: "${key}" | Found in BDSUELDO_REAL: ${exists}`);
    }
}

main().catch(console.error);
