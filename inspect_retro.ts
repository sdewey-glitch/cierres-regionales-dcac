import { calculateRetroactiveAdjustments } from './src/core/engine';

async function main() {
    console.log("Calculating retroactive adjustments for May 2026...");
    const adjs = await calculateRetroactiveAdjustments(2026, 5);
    console.log(`Calculated ${adjs.length} adjustments:`);
    let total = 0;
    for (const a of adjs) {
        console.log(`  Comercial: "${a.comercial}" | Mes: ${a.añoAjustado}-${String(a.mesAjustado).padStart(2, '0')} | Ajuste: $${Math.round(a.ajusteComponenteP).toLocaleString('es-AR')}`);
        total += a.ajusteComponenteP;
    }
    console.log(`Total Adjustments Sum: $${Math.round(total).toLocaleString('es-AR')}`);
}

main().catch(console.error);
