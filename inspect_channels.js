const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/core/snapshots/cierre_2026_05.json'), 'utf8'));

console.log('=== ANÁLISIS COMPLETO DEL SNAPSHOT MAYO 2026 ===\n');

// 1. Total de agentes y operaciones sin deduplicar
let totalOpsRaw = 0;
let totalCabRaw = 0;
const allIdLotes = [];
const idLoteCount = {};

for (const agent of data) {
    const ops = agent.operacionesDetalle || [];
    totalOpsRaw += ops.length;
    for (const op of ops) {
        totalCabRaw += op.cantidad || 0;
        allIdLotes.push(op.id_lote);
        idLoteCount[op.id_lote] = (idLoteCount[op.id_lote] || 0) + 1;
    }
}

console.log(`Agentes en snapshot: ${data.length}`);
console.log(`Operaciones ANTES de deduplicar: ${totalOpsRaw}`);
console.log(`Cabezas ANTES de deduplicar (suma bruta): ${totalCabRaw.toLocaleString()}`);

// 2. Deduplicar por id_lote (como hace el endpoint)
const unique = new Map();
for (const agent of data) {
    for (const op of (agent.operacionesDetalle || [])) {
        if (!unique.has(op.id_lote)) {
            unique.set(op.id_lote, op);
        }
    }
}

let cabDedup = 0;
for (const op of unique.values()) {
    cabDedup += op.cantidad || 0;
}

console.log(`\nOperaciones DESPUÉS de deduplicar: ${unique.size}`);
console.log(`Cabezas DESPUÉS de deduplicar: ${cabDedup.toLocaleString()}`);

// 3. ¿Cuántos id_lote aparecen más de 1 vez?
const duplicados = Object.entries(idLoteCount).filter(([, count]) => count > 1);
console.log(`\nid_lote duplicados: ${duplicados.length} (aparecen en >1 agente)`);

let cabPerdidas = 0;
for (const [id, count] of duplicados) {
    // Solo la primera aparición se cuenta, las demás se pierden
    cabPerdidas += (unique.get(Number(id))?.cantidad || 0) * (count - 1);
}
console.log(`Cabezas "perdidas" por dedup: ${cabPerdidas.toLocaleString()} (ya están contadas en el primer agente)`);

// 4. Verificar cabezasGeneral del snapshot (el campo pre-calculado)
let totalCabGeneral = 0;
let totalCabVenta = 0;
let totalCabCompra = 0;
for (const agent of data) {
    totalCabGeneral += agent.cabezasGeneral || 0;
    totalCabVenta += agent.cabzGenVenta || 0;
    totalCabCompra += agent.cabzGenCompra || 0;
}
console.log(`\n=== Campos pre-calculados del snapshot ===`);
console.log(`Σ cabezasGeneral: ${totalCabGeneral.toLocaleString()}`);
console.log(`Σ cabzGenVenta: ${totalCabVenta.toLocaleString()}`);
console.log(`Σ cabzGenCompra: ${totalCabCompra.toLocaleString()}`);
console.log(`Σ venta + compra: ${(totalCabVenta + totalCabCompra).toLocaleString()}`);

// 5. ¿Hay operaciones con cantidad 0?
let opsConCero = 0;
for (const op of unique.values()) {
    if (!op.cantidad || op.cantidad === 0) opsConCero++;
}
console.log(`\nOps con cantidad=0: ${opsConCero}`);

// 6. Mostrar distribución de tipos
const tipos = {};
for (const op of unique.values()) {
    const t = (op.tipo || 'SIN_TIPO').toUpperCase();
    if (!tipos[t]) tipos[t] = { count: 0, cabezas: 0 };
    tipos[t].count++;
    tipos[t].cabezas += op.cantidad || 0;
}
console.log(`\n=== Distribución por Tipo ===`);
for (const [t, v] of Object.entries(tipos).sort((a, b) => b[1].cabezas - a[1].cabezas)) {
    console.log(`  ${t}: ${v.count} tropas, ${v.cabezas.toLocaleString()} cabezas`);
}

// 7. Campos de estado/concretado
console.log('\n=== Campos de estado en primera operación ===');
const firstOp = data[0]?.operacionesDetalle?.[0];
if (firstOp) {
    const stateFields = Object.keys(firstOp).filter(k => 
        k.toLowerCase().includes('estado') || k.toLowerCase().includes('status') || 
        k.toLowerCase().includes('concret') || k.toLowerCase().includes('confirm')
    );
    console.log('Campos de estado encontrados:', stateFields.length > 0 ? stateFields : 'NINGUNO');
    console.log('Todas las keys:', Object.keys(firstOp).join(', '));
}

// 8. ¿Cuántas ops hay por agente? (top 10)
console.log('\n=== Top 10 agentes por cabezas ===');
const agentStats = data.map(a => ({
    name: a.asociadoComercial,
    ops: (a.operacionesDetalle || []).length,
    cabezas: a.cabezasGeneral || 0,
    cabVenta: a.cabzGenVenta || 0,
    cabCompra: a.cabzGenCompra || 0
})).sort((a, b) => b.cabezas - a.cabezas);

for (const a of agentStats.slice(0, 10)) {
    console.log(`  ${a.name}: ${a.ops} ops, ${a.cabezas.toLocaleString()} cab (V:${a.cabVenta} / C:${a.cabCompra})`);
}

// 9. ¿Es posible que el total correcto sea venta + compra?
console.log('\n=== DIAGNÓSTICO ===');
console.log(`Si contamos venta+compra (sin dedup): ${(totalCabVenta + totalCabCompra).toLocaleString()}`);
console.log(`Si contamos solo unique por id_lote: ${cabDedup.toLocaleString()}`);
console.log(`User dice que son ~41K cabezas`);
console.log(`Hipótesis: quizás hay que sumar cabzGenVenta de todos los agentes = ${totalCabVenta.toLocaleString()}`);
