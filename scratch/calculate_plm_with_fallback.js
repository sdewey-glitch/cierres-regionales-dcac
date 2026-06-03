const fs = require('fs');
const path = require('path');

async function main() {
    const cacheFile = path.resolve(__dirname, '../src/core/cache/q95_raw.json');
    if (!fs.existsSync(cacheFile)) {
        console.log("No q95_raw.json found");
        return;
    }
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log("Q95 rows:", data.length);

    const results = {};

    for (const row of data) {
        const estado = String(row.ESTADO || row.estado || '').trim().toUpperCase();
        // Wait, in our MAG row printout, Cierre was 0!
        // But wait! In the sheet formula, is Cierre required to be 1?
        // Sheet formula: ... Import3599!$AO:$AO,1 ... (which is Cierre === 1).
        // Let's check how many MAG rows have Cierre === 1 and Cierre === 0
        const cierre = Number(row.Cierre !== undefined ? row.Cierre : (row.cierre || 0));
        
        if (estado !== 'CONCRETADA' || cierre !== 1) {
            continue;
        }

        let period = String(row.Fecha_op || '').trim();
        if (!period && row.fecha_operacion) {
            const dateStr = String(row.fecha_operacion);
            if (dateStr.includes('-')) {
                period = dateStr.substring(0, 4) + dateStr.substring(5, 7);
            }
        }
        
        if (!period) continue;

        const un = String(row.UN || row.un || '').trim();
        const resultadoFinal = Number(row.resultado_final || row.resultado_final_ajustado || 0);

        const canalVenta = String(row.Canal_Venta || row.canal_venta || '').trim().toUpperCase();
        const canalCompra = String(row.Canal_compra || row.canal_compra || '').trim().toUpperCase();

        let regionalAlloc = 0;
        if (canalVenta === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (2/3);
        }
        if (canalCompra === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (1/3);
        }

        if (regionalAlloc === 0) {
            continue;
        }

        if (!results[period]) {
            results[period] = {
                'Faena': 0,
                'Invernada': 0,
                'Invernada Neo': 0,
                'Cria': 0,
                'MAG': 0
            };
        }

        let mappedUn = un;
        if (un.toLowerCase().includes('faena')) mappedUn = 'Faena';
        else if (un.toLowerCase() === 'invernada neo') mappedUn = 'Invernada Neo';
        else if (un.toLowerCase().includes('invernada')) mappedUn = 'Invernada';
        else if (un.toLowerCase().includes('cria') || un.toLowerCase().includes('cría')) mappedUn = 'Cria';
        else if (un.toLowerCase().includes('mag')) mappedUn = 'MAG';

        if (results[period][mappedUn] !== undefined) {
            results[period][mappedUn] += regionalAlloc;
        }
    }

    // Let's print results for 202603, 202511, 202512
    const testPeriods = ['202603', '202511', '202512'];
    for (const p of testPeriods) {
        console.log(`\n--- Period: ${p} ---`);
        const pData = results[p];
        if (!pData) {
            console.log("No data for period", p);
            continue;
        }
        const total = Object.values(pData).reduce((a, b) => a + b, 0);
        console.log(`Total Regional Result: ${total}`);
        for (const [un, val] of Object.entries(pData)) {
            const share = total > 0 ? val / total : 0;
            console.log(`UN ${un}: Val: ${Math.round(val)} -> Share: ${(share * 100).toFixed(2)}%`);
        }
    }
}

main().catch(console.error);
