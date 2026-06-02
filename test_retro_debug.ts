import { calculateRetroactiveAdjustments } from './src/core/engine';
import { fetchHistoricalSalaries } from './src/core/historical';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("=== DEBUG RETROACTIVOS ===");
    const retros = await calculateRetroactiveAdjustments(2026, 5);
    console.log(`Total retros calculados: ${retros.length}`);
    for (const r of retros) {
        console.log(`Comercial: ${r.comercial} | Mes Ajustado: ${r.mesAjustado} | Escala Congelada: ${r.escalaCongelada} | Delta: ${r.deltaResultado} | Ajuste P: ${r.ajusteComponenteP}`);
        console.log(`  Detalle de Lotes (${r.detalleLotes.length}):`);
        for (const l of r.detalleLotes) {
            console.log(`    Lote: ${l.idLote} | Tipo: ${l.tipo} | Cabezas: ${l.cabezasAntes} -> ${l.cabezasDespues} | Res: ${l.resultadoAntes} -> ${l.resultadoDespues}`);
        }
    }
}

main().catch(console.error);
