const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, 'src/api/routes.js');
let c = fs.readFileSync(f, 'utf8');

const OLD = `        const allTropaRows = [];
        for (const { y, m } of monthsToProcess) {
            const snap = await (0, snapshot_1.loadMonthSnapshot)(y, m);
            if (!snap) {
                console.log(\`[freeze] ⚠️ No hay snapshot para \${y}-\${m}, saltando\`);
                continue;
            }
            const agentResult = snap.find((r) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
            if (!agentResult || !agentResult.operacionesDetalle) {
                console.log(\`[freeze] ⚠️ Sin datos de \${agentName} en \${y}-\${m}\`);
                continue;
            }
            for (const op of agentResult.operacionesDetalle) {
                const opYearMonth = op.fecha_operacion
                    ? op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7)
                    : \`\${y}\${String(m).padStart(2, '0')}\`;
                const totalResultado = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
                let ganancia = 0;
                if (op.comercial_venta && op.comercial_venta.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_venta || 0;
                }
                if (op.comercial_compra && op.comercial_compra.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_compra || 0;
                }
                allTropaRows.push([
                    añoMesCierre, // Col A: Mes del cierre congelado
                    opYearMonth, // Col B: Mes real de la operación
                    op.id_lote, // Col C: ID tropa/lote
                    totalResultado, // Col D: Resultado empresa
                    ganancia, // Col E: Resultado ajustado (ganancia del comercial)
                    op.comercial_venta || '', // Col F: AC Vendedor
                    op.comercial_compra || '', // Col G: AC Comprador
                    agentName, // Col H: Asociado congelado (para poder borrar por descongelado)
                    agentResult.escalaGen != null ? Math.round(agentResult.escalaGen * 10000) / 100 : '' // Col I: Escala % (ej: 21.81)
                ]);
            }
            console.log(\`[freeze] 📋 \${agentResult.operacionesDetalle.length} tropas del mes \${y}-\${m} para \${agentName}\`);
        }`;

const NEW = `        const allTropaRows = [];
        for (const { y, m } of monthsToProcess) {
            // Si source=bajada: usar loadAgentDataFromBajada para obtener valores de la hoja Bajada
            // en lugar del snapshot Q95. Si falla o no hay datos en bajada → fallback al snapshot.
            let agentResult = null;
            if (useBajada) {
                try {
                    agentResult = await (0, bajada_1.loadAgentDataFromBajada)(y, m, agentName, bajadaSheetName);
                    if (agentResult && agentResult.operacionesDetalle) {
                        console.log(\`[freeze] 🗒️ Ajustes Historico: usando datos de \${bajadaSheetName} para \${agentName} (mes \${y}-\${m})\`);
                    } else {
                        agentResult = null;
                    }
                } catch (bajadaErr) {
                    console.warn(\`[freeze] ⚠️ Error cargando bajada para mes \${y}-\${m}, fallback a snapshot: \${bajadaErr.message}\`);
                    agentResult = null;
                }
            }
            // Fallback: leer del snapshot en memoria (Q95)
            if (!agentResult) {
                const snap = await (0, snapshot_1.loadMonthSnapshot)(y, m);
                if (!snap) {
                    console.log(\`[freeze] ⚠️ No hay snapshot para \${y}-\${m}, saltando\`);
                    continue;
                }
                agentResult = snap.find((r) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
            }
            if (!agentResult || !agentResult.operacionesDetalle) {
                console.log(\`[freeze] ⚠️ Sin datos de \${agentName} en \${y}-\${m}\`);
                continue;
            }
            for (const op of agentResult.operacionesDetalle) {
                const opYearMonth = op.fecha_operacion
                    ? op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7)
                    : \`\${y}\${String(m).padStart(2, '0')}\`;
                const totalResultado = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
                let ganancia = 0;
                if (op.comercial_venta && op.comercial_venta.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_venta || 0;
                }
                if (op.comercial_compra && op.comercial_compra.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_compra || 0;
                }
                allTropaRows.push([
                    añoMesCierre, // Col A: Mes del cierre congelado
                    opYearMonth,  // Col B: Mes real de la operación
                    op.id_lote,   // Col C: ID tropa/lote
                    totalResultado, // Col D: Resultado punta congelado (bajada o Q95)
                    ganancia,     // Col E: Ganancia personal = col D × escala
                    op.comercial_venta || '',  // Col F: AC Vendedor
                    op.comercial_compra || '', // Col G: AC Comprador
                    agentName,    // Col H: Asociado congelado
                    agentResult.escalaGen != null ? Math.round(agentResult.escalaGen * 10000) / 100 : '' // Col I: Escala %
                ]);
            }
            console.log(\`[freeze] 📋 \${agentResult.operacionesDetalle.length} tropas del mes \${y}-\${m} para \${agentName} (\${useBajada ? bajadaSheetName : 'Q95'})\`);
        }`;

if (c.includes(OLD)) {
    c = c.replace(OLD, NEW);
    fs.writeFileSync(f, c, 'utf8');
    console.log('PATCH OK');
} else {
    console.error('OLD block NOT FOUND');
    process.exit(1);
}
