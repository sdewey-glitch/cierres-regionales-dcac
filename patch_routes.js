const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, 'src/api/routes.js');
let c = fs.readFileSync(f, 'utf8');

const START = '        // 8. Procesar cada fila';
const END_MARKER = '            group.totalDelta += item.delta;';

const startIdx = c.indexOf(START);
if (startIdx === -1) { console.error('START NOT FOUND'); process.exit(1); }
const endIdx = c.indexOf(END_MARKER, startIdx) + END_MARKER.length;

const before = c.slice(0, startIdx);
const after  = c.slice(endIdx);

const newBlock = `        // 8. Procesar cada fila
        const loteItems = rows.map(col => {
            const id_lote = col[2];
            const resultado_estatico  = Number(col[3]) || 0;  // col D: punta result congelada → Res. Ajustado ANTES
            const ganancia_estatica   = Number(col[4]) || 0;  // col E: col D × escala → VAR ANTES
            const ac_vendedor  = col[5] || '';
            const ac_comprador = col[6] || '';
            const ac_de_tropa  = col[7] || '';
            const escala_pct_raw = Number(col[8]) || 0;
            const excluida = (col[9] || '').toString().toUpperCase() === 'TRUE';
            // Cuando col I está vacío/0, derivar escala del ratio ganancia/resultado
            const effective_escala = escala_pct_raw > 0
                ? escala_pct_raw
                : (resultado_estatico > 0 ? (ganancia_estatica / resultado_estatico) * 100 : 0);
            // Normalizar unicode para comparar nombres con acentos correctamente
            const norm = s => (s || '').normalize('NFC').toLowerCase().trim();
            const isVendedor  = norm(ac_de_tropa) === norm(ac_vendedor);
            const isComprador = norm(ac_de_tropa) === norm(ac_comprador);
            // Buscar en Q95 para resultado dinámico
            const q95Row = q95.find(op => String(op.id_lote) === String(id_lote));
            let resultado_dinamico_asignable;
            if (q95Row) {
                const rv = Number(q95Row.resultado_topeado_venta || 0);
                const rc = Number(q95Row.resultado_topeado_compra || 0);
                const total_q95 = (rv !== 0 || rc !== 0)
                    ? rv + rc
                    : Number(q95Row.resultado_final || q95Row.resultado_total_proyectado || 0);
                if (isVendedor && isComprador) {
                    resultado_dinamico_asignable = total_q95;
                } else if (isVendedor) {
                    resultado_dinamico_asignable = rv !== 0 ? rv : total_q95 * (2 / 3);
                } else if (isComprador) {
                    resultado_dinamico_asignable = rc !== 0 ? rc : total_q95 * (1 / 3);
                } else {
                    // rol no determinado: escalar proporcionalmente al congelado
                    const ref = rv !== 0 || rc !== 0 ? rv + rc : total_q95;
                    const ratio = resultado_estatico > 0 && ref > 0 ? resultado_estatico / ref : 1;
                    resultado_dinamico_asignable = total_q95 * ratio;
                }
            } else {
                resultado_dinamico_asignable = resultado_estatico; // no hallado → delta 0
            }
            const ganancia_dinamica = resultado_dinamico_asignable * (effective_escala / 100);
            const delta = ganancia_dinamica - ganancia_estatica;
            return {
                id_lote,
                anioMesTropa:             String(col[1]),
                resultado_estatico,           // "Res. Ajustado ANTES"
                ganancia_estatica,            // "VAR ANTES"
                resultado_dinamico_asignable, // "Res. Ajustado AHORA"
                ganancia_dinamica,            // "VAR AHORA"
                delta,
                ac_vendedor,
                ac_comprador,
                ac_de_tropa,
                effective_escala,
                excluida
            };
        });
        // 9. Agrupar por ac_de_tropa
        const byComercial = new Map();
        for (const item of loteItems) {
            const key = item.ac_de_tropa || '(sin asignar)';
            if (!byComercial.has(key)) {
                byComercial.set(key, { comercial: key, tropas: [], totalEstatico: 0, totalDinamico: 0, totalDelta: 0 });
            }
            const group = byComercial.get(key);
            group.tropas.push(item);
            group.totalEstatico += item.ganancia_estatica;
            group.totalDinamico += item.ganancia_dinamica;
            group.totalDelta    += item.delta;`;

fs.writeFileSync(f, before + newBlock + after, 'utf8');
console.log('PATCH OK - startIdx=' + startIdx + ' endIdx=' + endIdx);
