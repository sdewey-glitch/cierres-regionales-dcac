// Quick check: what does rendimiento look like in the raw Metabase data?
import { fetchQ95 } from './src/api/metabase';

async function check() {
    const ops = await fetchQ95();
    const abril = ops.filter(op => {
        if (!op.fecha_operacion) return false;
        return op.fecha_operacion.startsWith('2026-04');
    });
    
    console.log(`Total ops abril: ${abril.length}`);
    
    // Sample some ops
    for (let i = 0; i < Math.min(5, abril.length); i++) {
        const op = abril[i];
        console.log(`Op ${op.id_lote}: cab=${op.Cabezas || op.cantidad}, rend=${op.rendimiento || op.Rendimiento}, tipo=${op.Tipo || op.tipo_negocio}, imp_vend=${op.importe_vendedor}, res=${op.resultado_final}`);
    }
    
    // Compute resultado_final / importe_vendedor as rend check
    let totRes = 0, totImp = 0;
    const seen = new Set();
    for (const op of abril) {
        const lid = String(op.id_lote || op.id);
        if (seen.has(lid)) continue;
        seen.add(lid);
        const impVend = Number(op.importe_vendedor) || 0;
        const res = Number(op.resultado_final || op.resultado_total_proyectado) || 0;
        const cab = Number(op.Cabezas || op.cantidad) || 0;
        if (cab > 0 && impVend > 0) {
            totRes += res;
            totImp += impVend;
        }
    }
    console.log(`\nAlternative rend = resultado_final / importe_vendedor = ${(totRes / totImp * 100).toFixed(2)}%`);
    console.log(`Total res: ${totRes}, Total imp: ${totImp}`);
}

check().catch(console.error);
