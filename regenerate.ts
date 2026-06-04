import { calculateDynamicMonth, calculateRetroactiveAdjustments } from './src/core/engine';
import { saveMonthSnapshot } from './src/core/snapshot';
import { updateDynamicSueldos } from './src/core/writer';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const targetYear = 2026;
    const targetMonth = 5;
    
    console.log(`[Script] Recalculando mes ${targetYear}-${targetMonth} con el nuevo engine.ts...`);
    const results = await calculateDynamicMonth(targetYear, targetMonth);
    const retros = await calculateRetroactiveAdjustments(targetYear, targetMonth);
    
    // Consolidar manuales + retroactivos
    const ajustesPorAgente = new Map<string, number>();
    for (const r of retros) {
        ajustesPorAgente.set(r.comercial.toLowerCase(), (ajustesPorAgente.get(r.comercial.toLowerCase()) || 0) + r.ajusteComponenteP);
    }
    
    for (const res of results) {
        const agentRetros = retros.filter(r => r.comercial.toLowerCase() === res.asociadoComercial.toLowerCase());
        res.retroactivosDetalle = agentRetros.length > 0 ? agentRetros : undefined;
        
        const manuales = res.ajustesManuales !== undefined ? res.ajustesManuales : (res.ajustes || 0);
        res.ajustesManuales = manuales;
        const ajusteRetro = ajustesPorAgente.get(res.asociadoComercial.toLowerCase()) || 0;
        res.ajustes = Math.round(manuales + ajusteRetro);
        
        let reintegroNeto = res.reintegroMovilidad || 0;
        if ((res.reintegroMovilidad || 0) > 0) {
            reintegroNeto = reintegroNeto - (res.gastosMendelMovilidad || 0);
        }
        let ajusteEspecial = 0;
        if (res.asociadoComercial.toLowerCase() === 'pablo cieri') {
            ajusteEspecial = (res.componenteP || 0) * -0.20;
        }
        const totalComponentes = (res.componenteP || 0) + (res.componenteR || 0) + (res.componenteO || 0);
        const sueldoFinal = Math.max(res.minimo || 0, totalComponentes + res.ajustes);
        res.cierreReal = sueldoFinal + reintegroNeto - (res.amortizacioneDcac || 0) + ajusteEspecial;
    }
    
    saveMonthSnapshot(targetYear, targetMonth, results);
    console.log(`[Script] Snapshot guardado con las nuevas métricas.`);
}

main().catch(console.error);
