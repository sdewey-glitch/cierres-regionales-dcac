import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

const router = express.Router();

// En Vercel el filesystem es read-only, usar /tmp/ para archivos temporales
const IS_VERCEL = !!process.env.VERCEL;
const SNAPSHOTS_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, '../core/snapshots');

// API para listar meses disponibles
router.get('/snapshots', async (req, res) => {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:B');
        
        // Filtrar períodos válidos únicos (evita duplicidad por chunks)
        const uniquePeriods = Array.from(new Set(
            rows
                .filter(r => r[0] && r[0].match(/^\d{4}_\d{2}$/))
                .map(r => r[0])
        ));
        
        const files = uniquePeriods.map(p => `cierre_${p}.json`);
        res.json(files);
    } catch (e: any) {
        console.error('Error fetching snapshots', e);
        res.status(500).json({ error: "Error fetch snapshots" });
    }
});


import { calculateDynamicMonth, classifyChannel } from '../core/engine';
import { saveMonthSnapshot, loadMonthSnapshot, loadAllSnapshots } from '../core/snapshot';
import { updateDynamicSueldos } from '../core/writer';
import { fetchPreciosKm, fetchMendelGastos, fetchAjustesManuales, cleanSheetsNumber } from '../core/inputs';
import { calculateRetroactiveAdjustments } from '../core/engine';
import { getRoster, invalidateRosterCache, normalizeName } from '../core/normalization';
import { fetchQ95, fetchAcAssignmentDates } from './metabase';
import { readSheet, writeSheet, appendSheet, createSheetIfNotExists, clearSheetRange } from './sheets';
import { config } from '../config/env';
import { saveHistoricCierre, deleteHistoricCierre, initHistoricSheets, migrateExistingFrozenCierres } from '../core/historico-cierres';
import { loadAgentDataFromBajada } from './bajada';


async function getFrozenClosures(): Promise<{ period: string, agentName: string, date: string }[]> {
    try {
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Cierres_Congelados');
        const rows = await readSheet(config.HUB_CIERRES_ID, "'Cierres_Congelados'!A2:C10000");
        return rows.map(r => ({
            period: String(r[0] || ''),
            agentName: String(r[1] || ''),
            date: String(r[2] || '')
        })).filter(item => item.period && item.agentName);
    } catch (e) {
        console.error("[frozen] Error reading Cierres_Congelados", e);
        return [];
    }
}

async function saveSnapshotPreservingFrozen(year: number, month: number, results: any[]) {
    const period = `${year}_${String(month).padStart(2, '0')}`;
    const frozenList = await getFrozenClosures();
    const frozenAgentsForPeriod = frozenList
        .filter(item => item.period === period)
        .map(item => item.agentName.toLowerCase());

    let finalResults = results;
    if (frozenAgentsForPeriod.length > 0) {
        const previousSnapshot = await loadMonthSnapshot(year, month) || [];
        finalResults = results.map(r => {
            if (frozenAgentsForPeriod.includes(r.asociadoComercial.toLowerCase())) {
                const frozenAgentData = previousSnapshot.find(prev => prev.asociadoComercial.toLowerCase() === r.asociadoComercial.toLowerCase());
                if (frozenAgentData) {
                    console.log(`[snapshot] ❄️ Preservando cierre CONGELADO para ${r.asociadoComercial} en ${period}`);
                    return frozenAgentData;
                }
            }
            return r;
        });
    }

    await saveMonthSnapshot(year, month, finalResults);
    return finalResults;
}

// GET /api/snapshots/frozen
router.get('/snapshots/frozen', async (req, res) => {
    try {
        const list = await getFrozenClosures();
        res.json(list);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// API para cargar un mes especfico
router.get('/snapshots/:filename', async (req, res) => {
    try {
        const filename = req.params.filename; // e.g. cierre_2026_04.json
        const match = filename.match(/^cierre_(\d{4})_(\d{2})\.json$/);
        if (!match) {
            return res.status(400).json({ error: "Archivo invalido" });
        }
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);

        const data = await loadMonthSnapshot(year, month);
        if (!data) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        res.json(data);
    } catch(e: any) {
        console.error('Error leyendo JSON de sheet', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/snapshots/freeze
router.post('/snapshots/freeze', async (req, res) => {
    const { year, month, agentName, source } = req.body;
    const useBajada = source === 'bajada' || source === 'bajada2';
    const bajadaSheetName = source === 'bajada2' ? 'Bajada 2' : 'Bajada';

    if (!year || !month || !agentName) {
        return res.status(400).json({ error: "Falta year, month o agentName" });
    }
    try {
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Cierres_Congelados');
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Ajustes Historico');

        const list = await getFrozenClosures();
        const period = `${year}_${String(month).padStart(2, '0')}`;
        const alreadyFrozen = list.some(item => item.period === period && item.agentName.toLowerCase() === agentName.toLowerCase());

        if (alreadyFrozen) {
            return res.json({ success: true, message: "El cierre ya está congelado" });
        }

        // 1. Agregar a Cierres_Congelados
        const newRow = [period, agentName, new Date().toISOString()];
        await appendSheet(config.HUB_CIERRES_ID, "'Cierres_Congelados'!A:C", [newRow]);

        // 2. Obtener las tropas de este agente del mes actual + los últimos 3 meses para Ajustes Historico
        const añoMesCierre = `${year}${String(month).padStart(2, '0')}`;

        // Armar lista de meses a procesar: mes actual + 3 anteriores
        const monthsToProcess: { y: number, m: number }[] = [];
        for (let i = 0; i <= 3; i++) {
            let targetMonth = Number(month) - i;
            let targetYear = Number(year);
            while (targetMonth <= 0) {
                targetMonth += 12;
                targetYear -= 1;
            }
            monthsToProcess.push({ y: targetYear, m: targetMonth });
        }

        const allTropaRows: any[][] = [];
        for (const { y, m } of monthsToProcess) {
            const snap = await loadMonthSnapshot(y, m);
            if (!snap) {
                console.log(`[freeze] ⚠️ No hay snapshot para ${y}-${m}, saltando`);
                continue;
            }
            const agentResult = snap.find((r: any) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
            if (!agentResult || !agentResult.operacionesDetalle) {
                console.log(`[freeze] ⚠️ Sin datos de ${agentName} en ${y}-${m}`);
                continue;
            }

            for (const op of agentResult.operacionesDetalle) {
                const opYearMonth = op.fecha_operacion
                    ? op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7)
                    : `${y}${String(m).padStart(2, '0')}`;
                const totalResultado = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);

                let ganancia = 0;
                if (op.comercial_venta && op.comercial_venta.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_venta || 0;
                }
                if (op.comercial_compra && op.comercial_compra.toLowerCase() === agentName.toLowerCase()) {
                    ganancia += op.ganancia_personal_compra || 0;
                }

                allTropaRows.push([
                    añoMesCierre,        // Col A: Mes del cierre congelado
                    opYearMonth,         // Col B: Mes real de la operación
                    op.id_lote,          // Col C: ID tropa/lote
                    totalResultado,      // Col D: Resultado empresa
                    ganancia,            // Col E: Resultado ajustado (ganancia del comercial)
                    op.comercial_venta || '',   // Col F: AC Vendedor
                    op.comercial_compra || '',  // Col G: AC Comprador
                    agentName,           // Col H: Asociado congelado (para poder borrar por descongelado)
                    agentResult.escalaGen != null ? Math.round(agentResult.escalaGen * 10000) / 100 : '' // Col I: Escala % (ej: 21.81)
                ]);
            }
            console.log(`[freeze] 📋 ${agentResult.operacionesDetalle.length} tropas del mes ${y}-${m} para ${agentName}`);
        }

        if (allTropaRows.length > 0) {
            await appendSheet(config.HUB_CIERRES_ID, "'Ajustes Historico'!A:I", allTropaRows);
            console.log(`[freeze] ✅ Total ${allTropaRows.length} filas guardadas en Ajustes Historico para ${agentName} (cierre ${añoMesCierre})`);
        } else {
            console.log(`[freeze] ⚠️ No se encontraron tropas para guardar de ${agentName}`);
        }

        // Guardar cierre completo en Historico_Cierres + Historico_Tropas para edición desde Sheets
        // Si source=bajada, usamos los datos recalculados con la bajada en lugar del snapshot
        let agentFull: any = null;
        if (useBajada) {
            try {
                agentFull = await loadAgentDataFromBajada(Number(year), Number(month), agentName, bajadaSheetName);
                if (agentFull) console.log(`[freeze] 🗒️ Usando datos de ${bajadaSheetName} para ${agentName}`);

            } catch (bajadaErr: any) {
                console.warn('[freeze] ⚠️ Error cargando bajada, fallback a snapshot:', bajadaErr.message);
            }
        }
        if (!agentFull) {
            const snapCurrent = await loadMonthSnapshot(Number(year), Number(month));
            agentFull = snapCurrent?.find((r: any) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
        }
        if (agentFull) {
            try {
                await initHistoricSheets();
                await saveHistoricCierre(Number(year), Number(month), agentFull);
            } catch (histErr: any) {
                console.warn('[freeze] ⚠️ Error guardando en Historico_Cierres:', histErr.message);
            }
        }

        res.json({ success: true, message: `Cierre de ${agentName} congelado correctamente` });
    } catch (e: any) {
        console.error("Error al congelar cierre:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/snapshots/unfreeze
router.post('/snapshots/unfreeze', async (req, res) => {
    const { year, month, agentName } = req.body;
    if (!year || !month || !agentName) {
        return res.status(400).json({ error: "Falta year, month o agentName" });
    }
    try {
        const period = `${year}_${String(month).padStart(2, '0')}`;
        const añoMesCierre = `${year}${String(month).padStart(2, '0')}`;

        // 1. Quitar de Cierres_Congelados
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Cierres_Congelados');
        const frozenRows = await readSheet(config.HUB_CIERRES_ID, "'Cierres_Congelados'!A:C").catch(() => []);
        if (frozenRows.length > 0) {
            const headers = frozenRows[0];
            const otherFrozen = frozenRows.slice(1).filter(r => !(String(r[0]) === period && String(r[1]).toLowerCase() === agentName.toLowerCase()));
            await clearSheetRange(config.HUB_CIERRES_ID, "'Cierres_Congelados'!A2:C10000").catch(() => {});
            const newFrozenSheetData = [headers, ...otherFrozen];
            await writeSheet(config.HUB_CIERRES_ID, `'Cierres_Congelados'!A1:C${newFrozenSheetData.length}`, newFrozenSheetData);
        }

        // 2. Quitar de Ajustes Historico (usando la columna Asociado_Congelado)
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Ajustes Historico');
        const histRows = await readSheet(config.HUB_CIERRES_ID, "'Ajustes Historico'!A:I").catch(() => []);
        if (histRows.length > 0) {
            const headers = histRows[0];
            const otherHist = histRows.slice(1).filter(r => {
                const isMatchingPeriod = String(r[0]) === añoMesCierre;
                const matchesAgent = r.length >= 8 
                    ? String(r[7]).toLowerCase() === agentName.toLowerCase()
                    : (String(r[5]).toLowerCase() === agentName.toLowerCase() || String(r[6]).toLowerCase() === agentName.toLowerCase());
                return !(isMatchingPeriod && matchesAgent);
            });
            await clearSheetRange(config.HUB_CIERRES_ID, "'Ajustes Historico'!A2:I100000").catch(() => {});
            const newHistSheetData = [headers, ...otherHist];
            await writeSheet(config.HUB_CIERRES_ID, `'Ajustes Historico'!A1:I${newHistSheetData.length}`, newHistSheetData);
        }

        res.json({ success: true, message: `Cierre de ${agentName} descongelado correctamente` });

        // Limpiar también Historico_Cierres + Historico_Tropas (en background, no bloquear)
        deleteHistoricCierre(Number(year), Number(month), agentName)
            .catch(e => console.warn('[unfreeze] ⚠️ Error limpiando historico:', e.message));
    } catch (e: any) {
        console.error("Error al descongelar cierre:", e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/snapshots/migrate-historico — migrar cierres congelados existentes a Historico_Cierres
router.post('/snapshots/migrate-historico', async (req, res) => {
    try {
        let list = await getFrozenClosures();
        // Si se pasa agentName, filtrar solo ese agente
        if (req.body?.agentName) {
            list = list.filter(l => l.agentName.toLowerCase() === req.body.agentName.toLowerCase());
        }
        await initHistoricSheets();
        const result = await migrateExistingFrozenCierres(list, loadMonthSnapshot);
        res.json({ success: true, ...result });
    } catch (e: any) {
        console.error('[migrate-historico] Error:', e);
        res.status(500).json({ error: e.message });
    }
});


// GET /api/lote/buscar/:id — busca un lote por ID en Metabase (Q95 cache) y calcula su resultado
router.get('/lote/buscar/:id', async (req, res) => {
    const loteId = Number(req.params.id);
    if (!loteId || isNaN(loteId)) return res.status(400).json({ error: 'ID de lote inválido' });
    try {
        const ops = await fetchQ95();
        const filas = ops.filter((op: any) => Number(op.id_lote || op.id) === loteId);
        if (filas.length === 0) return res.status(404).json({ error: `Lote ${loteId} no encontrado en Metabase` });

        // Calcular resultado con topes
        const fila = filas[0];
        const rawResultado = Number(fila.resultado_final || fila.resultado_total_proyectado) || 0;
        let rendimiento = Number(fila.rendimiento || fila.Rendimiento) || 0;
        let resultadoAjustado = rawResultado;
        const tipoOp = String(fila.Tipo || fila.tipo_negocio || '').toUpperCase();
        const isFaena = tipoOp.includes('FAENA');
        const MAX_YIELD = isFaena ? 6 : 8;
        const MIN_YIELD = isFaena ? -2 : -4.5;
        if (rendimiento > MAX_YIELD) resultadoAjustado = rawResultado * (MAX_YIELD / rendimiento);
        else if (rendimiento < MIN_YIELD && rendimiento !== 0) resultadoAjustado = rawResultado * (MIN_YIELD / rendimiento);

        const acVendRaw = fila.asociado_comercial_id_vend || fila.AC_Vend || fila.asociado_comercial_soc_vend || '';
        const acCompRaw = fila.asociado_comercial_id_comp || fila.AC_Comp || fila.asociado_comercial_soc_comp || '';
        const acVend = await normalizeName(String(acVendRaw));
        const acComp = await normalizeName(String(acCompRaw));

        res.json({
            id_lote: loteId,
            tipo: tipoOp,
            fecha_operacion: fila.fecha_operacion || '',
            sociedad_vendedora: fila.RS_Vendedora || fila.sociedad_vendedora || '',
            sociedad_compradora: fila.RS_Compradora || fila.sociedad_compradora || '',
            cantidad: Number(fila.Cabezas || fila.cantidad) || 0,
            categoria: fila.categoria || '',
            comercial_venta: acVend || '',
            comercial_compra: acComp || '',
            rendimiento_real: rendimiento,
            resultado_total: rawResultado,
            resultado_ajustado: Math.round(resultadoAjustado),
            resultado_venta: Math.round(resultadoAjustado * 2 / 3),
            resultado_compra: Math.round(resultadoAjustado * 1 / 3),
            filas: filas.length,
        });
    } catch (e: any) {
        console.error('[buscar-lote] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/snapshots/add-lote — agrega manualmente un lote al snapshot de un agente
router.post('/snapshots/add-lote', async (req, res) => {
    const { year, month, agentName, loteId, rol } = req.body;
    // rol: 'venta' | 'compra' | 'ambos'
    if (!year || !month || !agentName || !loteId) {
        return res.status(400).json({ error: 'Faltan parámetros: year, month, agentName, loteId' });
    }
    try {
        const snapshot = await loadMonthSnapshot(Number(year), Number(month));
        if (!snapshot) return res.status(404).json({ error: 'Snapshot no encontrado' });

        const agentData = (snapshot as any[]).find((r: any) =>
            r.asociadoComercial?.toString().trim().toLowerCase() === String(agentName).trim().toLowerCase()
        );
        if (!agentData) return res.status(404).json({ error: `Agente "${agentName}" no encontrado` });

        // Verificar que el lote no esté ya agregado MANUALMENTE
        const loteIdNum = Number(loteId);
        const existeManual = (agentData.operacionesDetalle || []).some((op: any) => Number(op.id_lote) === loteIdNum && op._addedManually);
        if (existeManual) return res.status(409).json({ error: `Lote ${loteId} ya fue agregado manualmente al cierre de ${agentName}` });
        // Si existe del engine (sin _addedManually), lo eliminamos para reemplazarlo con el manual
        agentData.operacionesDetalle = (agentData.operacionesDetalle || []).filter((op: any) => Number(op.id_lote) !== loteIdNum);

        // Buscar en Q95
        const ops = await fetchQ95();
        const filas = ops.filter((op: any) => Number(op.id_lote || op.id) === loteIdNum);
        if (filas.length === 0) return res.status(404).json({ error: `Lote ${loteId} no encontrado en Metabase` });

        const fila = filas[0];
        const rawResultado = Number(fila.resultado_final || fila.resultado_total_proyectado) || 0;
        let rendimiento = Number(fila.rendimiento || fila.Rendimiento) || 0;
        let resultadoAjustado = rawResultado;
        const tipoOp = String(fila.Tipo || fila.tipo_negocio || '').toUpperCase();
        const isFaena = tipoOp.includes('FAENA');
        const MAX_YIELD = isFaena ? 6 : 8;
        const MIN_YIELD = isFaena ? -2 : -4.5;
        if (rendimiento > MAX_YIELD) resultadoAjustado = rawResultado * (MAX_YIELD / rendimiento);
        else if (rendimiento < MIN_YIELD && rendimiento !== 0) resultadoAjustado = rawResultado * (MIN_YIELD / rendimiento);

        const acVendRaw = fila.asociado_comercial_id_vend || fila.AC_Vend || fila.asociado_comercial_soc_vend || '';
        const acCompRaw = fila.asociado_comercial_id_comp || fila.AC_Comp || fila.asociado_comercial_soc_comp || '';
        const acVend = await normalizeName(String(acVendRaw));
        const acComp = await normalizeName(String(acCompRaw));

        const cabezas = Number(fila.Cabezas || fila.cantidad) || 0;
        const rolFinal = rol || (acComp?.toLowerCase() === agentName.toLowerCase() ? 'compra' : 'venta');
        const esVenta = rolFinal === 'venta' || rolFinal === 'ambos';
        const esCompra = rolFinal === 'compra' || rolFinal === 'ambos';

        const rtVenta  = esVenta  ? Math.round(resultadoAjustado * 2 / 3) : 0;
        const rtCompra = esCompra ? Math.round(resultadoAjustado * 1 / 3) : 0;
        const escala = agentData.escalaGen || 0;

        const newOp: any = {
            id_lote: loteIdNum,
            tipo: tipoOp,
            fecha_operacion: fila.fecha_operacion || '',
            sociedad_vendedora: fila.RS_Vendedora || fila.sociedad_vendedora || '',
            sociedad_compradora: fila.RS_Compradora || fila.sociedad_compradora || '',
            cantidad: cabezas,
            categoria: fila.categoria || '',
            comercial_venta: acVend || '',
            comercial_compra: acComp || '',
            rendimiento_real: rendimiento,
            resultado_topeado_venta: rtVenta,
            resultado_topeado_compra: rtCompra,
            ganancia_personal_venta:  Math.round(rtVenta  * escala),
            ganancia_personal_compra: Math.round(rtCompra * escala),
            resultado_id: rawResultado,
            importe_vendedor: Number(fila.importe_vendedor) || 0,
            importe_comprador: Number(fila.importe_comprador) || 0,
            bonificacion_vendedor: 0,
            bonificacion_comprador: 0,
            rendimiento_topeado: rendimiento,
            escala_aplicada: escala,
            marca: esVenta ? '' : '†',
            _addedManually: true,
        };

        agentData.operacionesDetalle.push(newOp);

        // Recalcular totales
        const activeLotes: any[] = (agentData.operacionesDetalle || []).filter((d: any) => !d.excluida);
        agentData.resultado_final_ajustado = activeLotes.reduce(
            (sum: number, d: any) => sum + (d.resultado_topeado_venta || 0) + (d.resultado_topeado_compra || 0), 0
        );
        const seenIds = new Set<number>();
        let cabezasActivas = 0, tropasActivas = 0;
        for (const d of activeLotes) {
            const id = Number(d.id_lote);
            if (!seenIds.has(id)) { seenIds.add(id); cabezasActivas += Number(d.cantidad) || 0; tropasActivas += 1; }
        }
        agentData.cabezasGeneral = cabezasActivas;
        agentData.tropasGeneral = tropasActivas;
        agentData.componenteP = Math.round(agentData.resultado_final_ajustado * escala);
        agentData.componentePAju = agentData.componenteP;
        agentData.variable_personal = agentData.componenteP;

        const totalComponentes = (agentData.componenteP || 0) + (agentData.componenteR || 0) + (agentData.componenteO || 0);
        const isOperarioCarga = (agentData.tipo || '').toLowerCase().includes('operario');
        const sueldoFinal = isOperarioCarga
            ? (agentData.minimo || 0) + (agentData.componenteP || 0) + (agentData.ajustes || 0)
            : Math.max(agentData.minimo || 0, totalComponentes + (agentData.ajustes || 0));
        let reintegroNeto = agentData.reintegroMovilidad || 0;
        if (reintegroNeto > 0) reintegroNeto -= (agentData.gastosMendelMovilidad || 0);
        let ajusteEspecial = 0;
        if (agentData.asociadoComercial.toLowerCase() === 'pablo cieri') ajusteEspecial = (agentData.componenteP || 0) * -0.20;
        agentData.cierreReal = Math.round(sueldoFinal + reintegroNeto - (agentData.amortizacioneDcac || 0) + ajusteEspecial);

        await saveMonthSnapshot(Number(year), Number(month), snapshot as any[]);
        console.log(`[add-lote] ➕ Lote ${loteId} agregado manualmente a ${agentName} como ${rolFinal} → cierreReal: ${agentData.cierreReal}`);
        res.json({
            success: true,
            loteId: loteIdNum,
            rol: rolFinal,
            resultado: rtVenta + rtCompra,
            tropasGeneral: agentData.tropasGeneral,
            cabezasGeneral: agentData.cabezasGeneral,
            resultado_final_ajustado: agentData.resultado_final_ajustado,
            componenteP: agentData.componenteP,
            cierreReal: agentData.cierreReal,
            operacion: newOp,
        });
    } catch (e: any) {
        console.error('[add-lote] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});


// POST /api/snapshots/toggle-lote — excluir o restaurar una tropa del cierre de un agente
router.post('/snapshots/toggle-lote', async (req, res) => {
    const { year, month, agentName, loteId, exclude } = req.body;
    if (!year || !month || !agentName || loteId === undefined) {
        return res.status(400).json({ error: 'Faltan parámetros: year, month, agentName, loteId' });
    }
    try {
        const snapshot = await loadMonthSnapshot(Number(year), Number(month));
        if (!snapshot) return res.status(404).json({ error: 'Snapshot no encontrado para ese período' });

        const agentData = (snapshot as any[]).find((r: any) =>
            r.asociadoComercial.toLowerCase() === String(agentName).toLowerCase()
        );
        if (!agentData) return res.status(404).json({ error: `Agente "${agentName}" no encontrado en el snapshot` });

        // Marcar/desmarcar exclusión en el lote
        const loteIdNum = Number(loteId);
        const lote = (agentData.operacionesDetalle || []).find((d: any) => Number(d.id_lote) === loteIdNum);
        if (!lote) return res.status(404).json({ error: `Tropa ${loteId} no encontrada para ${agentName}` });

        lote.excluida = !!exclude;

        // Recalcular totales usando sólo lotes activos (no excluidos)
        const activeLotes: any[] = (agentData.operacionesDetalle || []).filter((d: any) => !d.excluida);

        agentData.resultado_final_ajustado = activeLotes.reduce(
            (sum: number, d: any) => sum + (d.resultado_topeado_venta || 0) + (d.resultado_topeado_compra || 0), 0
        );

        // Deduplicar por id_lote para cabezas y tropas
        const seenIds = new Set<number>();
        let cabezasActivas = 0, tropasActivas = 0;
        for (const d of activeLotes) {
            const id = Number(d.id_lote);
            if (!seenIds.has(id)) {
                seenIds.add(id);
                cabezasActivas += Number(d.cantidad) || 0;
                tropasActivas += 1;
            }
        }
        agentData.cabezasGeneral = cabezasActivas;
        agentData.tropasGeneral = tropasActivas;

        // Recalcular componenteP (se mantiene la misma escala, no se recalcula por cambio de cabezas)
        const escala = agentData.escalaGen || 0;
        agentData.componenteP = Math.round(agentData.resultado_final_ajustado * escala);
        agentData.componentePAju = agentData.componenteP;
        agentData.variable_personal = agentData.componenteP; // sincronizar con el template

        // Recalcular cierreReal (misma fórmula que /generate)
        const totalComponentes = (agentData.componenteP || 0) + (agentData.componenteR || 0) + (agentData.componenteO || 0);
        const isOperarioCarga = (agentData.tipo || '').toLowerCase().includes('operario');
        const sueldoFinal = isOperarioCarga
            ? (agentData.minimo || 0) + (agentData.componenteP || 0) + (agentData.ajustes || 0)
            : Math.max(agentData.minimo || 0, totalComponentes + (agentData.ajustes || 0));
        let reintegroNeto = agentData.reintegroMovilidad || 0;
        if (reintegroNeto > 0) reintegroNeto -= (agentData.gastosMendelMovilidad || 0);
        let ajusteEspecial = 0;
        if (agentData.asociadoComercial.toLowerCase() === 'pablo cieri') {
            ajusteEspecial = (agentData.componenteP || 0) * -0.20;
        }
        agentData.cierreReal = Math.round(
            sueldoFinal + reintegroNeto - (agentData.amortizacioneDcac || 0) + ajusteEspecial
        );

        // Guardar snapshot completo — el toggle-lote es una operación editorial explícita
        // y debe persistir incluso para agentes congelados
        await saveMonthSnapshot(Number(year), Number(month), snapshot as any[]);

        // Sincronizar exclusión en Historico_Tropas (col N) y Ajustes Historico (col J) en background
        const loteIdNum2 = loteIdNum;
        const excludeFlag = !!exclude;
        const periodo = `${year}${String(Number(month)).padStart(2, '0')}`;
        Promise.resolve().then(async () => {
            try {
                // 1. Historico_Tropas (col N = Excluida)
                const tropasData = await readSheet(config.HUB_CIERRES_ID, "'Historico_Tropas'!A:T").catch(() => []);
                if (tropasData && tropasData.length > 1) {
                    for (let i = 1; i < tropasData.length; i++) {
                        const r = tropasData[i];
                        if (String(r[0]) === periodo &&
                            String(r[3]).toLowerCase() === agentName.toLowerCase() &&
                            Number(r[2]) === loteIdNum2) {
                            // col N = índice 13, fila sheets = i + 1
                            await writeSheet(config.HUB_CIERRES_ID, `'Historico_Tropas'!N${i + 1}`, [[excludeFlag ? 'TRUE' : 'FALSE']]).catch(() => {});
                        }
                    }
                }

                // 2. Ajustes Historico (col J = Excluida) — añadir col si no existe
                const ajustesData = await readSheet(config.HUB_CIERRES_ID, "'Ajustes Historico'!A:J").catch(() => []);
                if (ajustesData && ajustesData.length > 1) {
                    // Asegurar header en col J
                    const header = ajustesData[0];
                    if (!header[9] || header[9] !== 'Excluida') {
                        await writeSheet(config.HUB_CIERRES_ID, `'Ajustes Historico'!J1`, [['Excluida']]).catch(() => {});
                    }
                    for (let i = 1; i < ajustesData.length; i++) {
                        const r = ajustesData[i];
                        // col A = periodo cierre, col C = id_lote, col H = agente
                        if (String(r[0]) === periodo &&
                            String(r[7] || '').toLowerCase() === agentName.toLowerCase() &&
                            Number(r[2]) === loteIdNum2) {
                            await writeSheet(config.HUB_CIERRES_ID, `'Ajustes Historico'!J${i + 1}`, [[excludeFlag ? 'TRUE' : 'FALSE']]).catch(() => {});
                        }
                    }
                }
                console.log(`[toggle-lote] 🔄 Sincronizado en Sheets: tropa ${loteIdNum2} excluida=${excludeFlag}`);
            } catch (syncErr: any) {
                console.warn('[toggle-lote] ⚠️ Error sincronizando en Sheets:', syncErr.message);
            }
        });

        console.log(`[toggle-lote] ${exclude ? '🚫 Excluida' : '✅ Restaurada'} tropa ${loteId} de ${agentName} → cierreReal: ${agentData.cierreReal}`);
        res.json({
            success: true,
            loteId: loteIdNum,
            excluida: !!exclude,
            cierreReal: agentData.cierreReal,
            tropasGeneral: agentData.tropasGeneral,
            cabezasGeneral: agentData.cabezasGeneral,
            resultado_final_ajustado: agentData.resultado_final_ajustado,
            componenteP: agentData.componenteP,
        });

    } catch (e: any) {
        console.error('[toggle-lote] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});


// Migrar ajustes del sheet viejo al nuevo como valores estáticos
router.post('/migrate-ajustes', async (req, res) => {
    try {
        console.log('[migrate] Leyendo ajustes del SOURCE viejo...');
        const oldData = await readSheet(config.SOURCE_SPREADSHEET_ID, "'Ajustes'!A2:V2000");
        
        // Filtrar solo los que tienen ajuste != 0 (col V = index 21)
        const withAdjustment = oldData.filter(r => r.length > 21 && r[21] && Number(r[21]) !== 0);
        console.log(`[migrate] ${withAdjustment.length} registros con ajuste != 0`);
        
        // Formato nuevo simplificado: Año | Mes | AñoMes | Comercial | Motivo | Monto
        const newHeaders = [['Año', 'Mes', 'AñoMes', 'Asociado_Comercial', 'Motivo', 'Monto']];
        const newRows = withAdjustment.map(r => [
            Number(r[1]),                    // Año
            Number(r[2]),                    // Mes
            String(r[3]),                    // AñoMes
            String(r[4]),                    // Asociado_Comercial
            'Retroactivo (migrado)',         // Motivo genérico
            Math.round(Number(r[21]) * 100) / 100  // Monto del ajuste
        ]);
        
        // Limpiar hoja vieja y escribir datos estáticos
        const targetRange = `'Ajustes'!A1:F${newRows.length + 1}`;
        await writeSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A1:V2000", [['']]);  // Limpia
        await writeSheet(config.HUB_CONFIGURACIONES_ID, targetRange, [...newHeaders, ...newRows]);
        
        console.log(`[migrate] ✅ ${newRows.length} ajustes migrados al sheet nuevo`);
        res.json({ 
            success: true, 
            migrated: newRows.length,
            periodos: [...new Set(newRows.map(r => r[2]))].sort()
        });
    } catch (e: any) {
        console.error('[migrate] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/roster', async (req, res) => {
    try {
        const roster = await getRoster();
        const AC_TIPOS = ['Regional', 'City Manager', 'Corporate', 'Representante', 'Operario de carga'];
        const rosterArray = Array.from(roster.values()).filter(r => AC_TIPOS.includes(r.tipo));
        res.json(rosterArray);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

let cachedV3Data: any = null;
let lastV3Fetch = 0;
router.get('/v3-salaries', async (req, res) => {
    try {
        const now = Date.now();
        if (cachedV3Data && (now - lastV3Fetch < 1000 * 60 * 60)) { // 1 hora de cache
            return res.json(cachedV3Data);
        }
        const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
        const parsed = data.map(r => ({
            anioMes: r[3],
            asociadoComercial: r[4],
            tipo: r[9],
            sueldo: Number(r[13]) || 0,
            cierreReal: Number(r[14]) || 0, // Sueldo Bruto V3
            minimo: Number(r[15]) || 0,
            cabezas: Number(r[18]) || 0,
            cabVenta: Number(r[19]) || 0,
            cabCompra: Number(r[20]) || 0,
            resultado: Number(r[22]) || 0,
            escala: Number(r[23]) || 0,
            compP: Number(r[24]) || 0,
        }));
        // Filtrar solo "Asociado Comercial" si es necesario, o lo hacemos en frontend.
        cachedV3Data = parsed;
        lastV3Fetch = now;
        res.json(parsed);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/roster', async (req, res) => {
    try {
        const agent = req.body;
        if (!agent || !agent.nombre) {
            return res.status(400).json({ error: "Falta nombre del comercial" });
        }
        const MASTER_ROSTER_ID = '1FpgyFCw2hibi3w_jArtohKUxPhvfUpnF9SDDI3YI-aI';
        const data = await readSheet(MASTER_ROSTER_ID, "'Asociados Comerciales'!A2:AC");
        let rowIndex = -1;
        let existingRow: any[] = [];
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row[0] && String(row[0]).trim().toLowerCase() === agent.nombre.toLowerCase()) {
                rowIndex = i + 2; // +2 porque el sheet empieza en fila 1 y nosotros leimos desde A2
                existingRow = row;
                break;
            }
        }

        // Prepare the new row, preserving existing data where we don't have inputs
        const newRow = Array(29).fill('');
        for (let i = 0; i < 29; i++) {
            if (existingRow[i] !== undefined) newRow[i] = existingRow[i];
        }

        // Update fields
        newRow[0] = agent.nombre;
        newRow[1] = agent.codigo !== undefined ? agent.codigo : newRow[1];
        newRow[2] = agent.provincia !== undefined ? agent.provincia : newRow[2];
        newRow[3] = agent.partido !== undefined ? agent.partido : newRow[3];
        newRow[4] = agent.oficina !== undefined ? agent.oficina : newRow[4];
        newRow[5] = agent.tipo !== undefined ? agent.tipo : newRow[5];
        newRow[6] = agent.modalidad !== undefined ? agent.modalidad : newRow[6];
        newRow[7] = agent.escalas !== undefined ? agent.escalas : newRow[7];
        newRow[8] = agent.detalleEscalas !== undefined ? agent.detalleEscalas : newRow[8];
        newRow[9] = agent.activo ? 'Si' : 'No';
        newRow[10] = agent.link !== undefined ? agent.link : newRow[10];
        newRow[11] = agent.tier !== undefined ? agent.tier : newRow[11];
        newRow[12] = agent.ingreso !== undefined ? agent.ingreso : newRow[12];
        newRow[13] = agent.mail !== undefined ? agent.mail : newRow[13];
        newRow[14] = agent.auto === true || agent.auto === 'Si' ? 'Si' : 'No';
        newRow[15] = agent.mendel === true || agent.mendel === 'Si' ? 'Si' : 'No';
        newRow[16] = agent.responsableDC !== undefined ? agent.responsableDC : newRow[16];
        newRow[17] = agent.operadorFaena !== undefined ? agent.operadorFaena : newRow[17];
        newRow[18] = agent.operadorInv !== undefined ? agent.operadorInv : newRow[18];
        newRow[19] = agent.operadorInvNeo !== undefined ? agent.operadorInvNeo : newRow[19];
        newRow[20] = agent.operadorCria !== undefined ? agent.operadorCria : newRow[20];
        newRow[21] = agent.beneficios !== undefined ? agent.beneficios : newRow[21];
        newRow[22] = agent.categoria !== undefined ? agent.categoria : newRow[22];
        newRow[23] = agent.grupoFamiliar !== undefined ? agent.grupoFamiliar : newRow[23];
        newRow[24] = agent.lat !== undefined ? agent.lat : newRow[24];
        newRow[25] = agent.long !== undefined ? agent.long : newRow[25];
        newRow[26] = agent.nombreOriginal !== undefined ? agent.nombreOriginal : newRow[26];
        newRow[27] = agent.departamento !== undefined ? agent.departamento : newRow[27];
        newRow[28] = agent.deptoId !== undefined ? agent.deptoId : newRow[28];

        if (rowIndex !== -1) {
            // Update existing
            await writeSheet(MASTER_ROSTER_ID, `'Asociados Comerciales'!A${rowIndex}:AC${rowIndex}`, [newRow]);
        } else {
            // Append new
            await appendSheet(MASTER_ROSTER_ID, "'Asociados Comerciales'!A:AC", [newRow]);
        }

        invalidateRosterCache();
        res.json({ success: true });

    } catch (e: any) {
        console.error("Error guardando en Sheets:", e);
        res.status(500).json({ error: e.message });
    }
});

// API para generar un nuevo cierre a demanda
router.post('/generate', async (req, res) => {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ error: "Falta año o mes" });
    
    try {
        console.log(`Generando cierre dinámico para ${year}-${month}...`);
        let results = await calculateDynamicMonth(Number(year), Number(month));
        results = await saveSnapshotPreservingFrozen(Number(year), Number(month), results);
        
        // Calcular retroactivos y guardarlos
        console.log(`Calculando retroactivos para ${year}-${month}...`);
        const retros = await calculateRetroactiveAdjustments(Number(year), Number(month));
        
        // Guardar retroactivos como JSON local (backup)
        try {
            const retroDir = SNAPSHOTS_DIR;
            const retroFile = path.join(retroDir, `retro_${year}_${String(month).padStart(2, '0')}.json`);
            fs.writeFileSync(retroFile, JSON.stringify(retros, null, 2));
            console.log(`[retro] Guardado ${retros.length} ajustes en ${retroFile}`);
        } catch (writeErr: any) {
            console.warn(`[retro] ⚠️ No se pudo guardar retro local: ${writeErr.message}`);
        }
        
        // === ESCRIBIR RETROACTIVOS AL SHEET ===
        const añoMes = `${year}${String(month).padStart(2, '0')}`;
        
        // 1. Hoja Ajustes_Retro: resumen por agente
        const retroHeaders = [['Año', 'Mes', 'AñoMes', 'Asociado_Comercial', 'Mes_Ajustado', 'Año_Ajustado',
            'Escala_Congelada', 'Resultado_Congelado', 'Resultado_Dinamico', 'Delta_Resultado',
            'Ajuste_ComponenteP', 'Cant_Lotes_Cambiados']];
        const retroRows = retros.map(r => [
            r.año, r.mes, añoMes, r.comercial, r.mesAjustado, r.añoAjustado,
            Math.round(r.escalaCongelada * 10000) / 10000,
            Math.round(r.resultadoCongelado),
            Math.round(r.resultadoDinamico),
            Math.round(r.deltaResultado),
            Math.round(r.ajusteComponenteP),
            r.detalleLotes.length
        ]);
        
        // 2. Hoja Detalle_Retro: cada lote que cambió
        const detalleHeaders = [['Año', 'Mes', 'AñoMes', 'Asociado_Comercial', 'Mes_Negocio', 'Año_Negocio',
            'ID_Lote', 'Tipo_Cambio', 'Cabezas_Antes', 'Cabezas_Despues',
            'Resultado_Antes', 'Resultado_Despues', 'Soc_Vendedora', 'Soc_Compradora']];
        const detalleRows: any[][] = [];
        for (const r of retros) {
            for (const l of r.detalleLotes) {
                detalleRows.push([
                    r.año, r.mes, añoMes, r.comercial, r.mesAjustado, r.añoAjustado,
                    l.idLote, l.tipo, l.cabezasAntes, l.cabezasDespues,
                    Math.round(l.resultadoAntes), Math.round(l.resultadoDespues),
                    l.sociedadVendedora, l.sociedadCompradora
                ]);
            }
        }
        
        try {
            // Leer datos existentes para no pisar otros meses
            const existingRetro = await readSheet(config.HUB_CIERRES_ID, "'Ajustes_Retro'!A2:L10000").catch(() => []);
            const existingDetalle = await readSheet(config.HUB_CIERRES_ID, "'Detalle_Retro'!A2:N50000").catch(() => []);
            
            // Filtrar registros de OTROS meses (preservar), quitar los del mes actual (reemplazar)
            const otherRetro = existingRetro.filter(r => String(r[2]) !== añoMes);
            const otherDetalle = existingDetalle.filter(r => String(r[2]) !== añoMes);
            
            // Escribir: headers + otros meses + nuevos del mes actual
            const allRetro = [...retroHeaders, ...otherRetro, ...retroRows];
            const allDetalle = [...detalleHeaders, ...otherDetalle, ...detalleRows];
            
            await writeSheet(config.HUB_CIERRES_ID, `'Ajustes_Retro'!A1:L${allRetro.length}`, allRetro);
            await writeSheet(config.HUB_CIERRES_ID, `'Detalle_Retro'!A1:N${allDetalle.length}`, allDetalle);
            
            console.log(`[retro] ✅ Escrito al sheet: ${retroRows.length} ajustes + ${detalleRows.length} lotes detalle`);
        } catch (sheetErr: any) {
            console.warn(`[retro] ⚠️ No se pudo escribir al sheet retro: ${sheetErr.message}`);
        }
        
        // === ESCRIBIR BAJADA ESTÁTICA (Q95 cruda de Metabase, 3 meses) ===
        // Al cerrar Abril, guardamos la Q95 cruda de Feb, Mar, Abr → base para retroactivos de Mayo
        try {
            const rawQ95: any[] = await fetchQ95();
            
            // Determinar los 4 meses: M, M-1, M-2, M-3
            const mesesIncluir: string[] = [];
            for (let i = 0; i <= 3; i++) {
                let pastM = Number(month) - i;
                let pastY = Number(year);
                if (pastM <= 0) { pastM += 12; pastY -= 1; }
                mesesIncluir.push(`${pastY}-${String(pastM).padStart(2, '0')}`);
            }
            
            // Filtrar Q95 a esos 3 meses por fecha_operacion
            const filteredOps = rawQ95.filter(op => {
                if (!op.fecha_operacion) return false;
                const prefix = op.fecha_operacion.substring(0, 7); // "2026-04"
                return mesesIncluir.includes(prefix);
            });
            
            console.log(`[bajada] Q95 total: ${rawQ95.length} rows, filtrado a 4 meses (${mesesIncluir.join(', ')}): ${filteredOps.length} rows`);
            
            // Tomar TODAS las columnas de la Q95 tal cual vienen
            if (filteredOps.length > 0) {
                const allColumns = Object.keys(filteredOps[0]);
                const bajadaHeaders = [allColumns];
                
                const bajadaRows = filteredOps.map(op => 
                    allColumns.map(col => {
                        const val = op[col];
                        return val === null || val === undefined ? '' : val;
                    })
                );
                
                // Determinar AñoMes para cada fila (para filtrado futuro)
                // Agregar columna AñoMes_Cierre al inicio para trackear a qué cierre pertenece
                const fullHeaders = [['AñoMes_Cierre', ...allColumns]];
                const fullRows = filteredOps.map(op => {
                    const opYM = op.fecha_operacion ? 
                        op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7) : '';
                    return [añoMes, ...allColumns.map(col => {
                        const val = op[col];
                        return val === null || val === undefined ? '' : val;
                    })];
                });
                
                // Leer existentes de otros cierres (preservar)
                const existingBajada = await readSheet(config.HUB_CIERRES_ID, "'Bajada_Estatica'!A2:BZ50000").catch(() => []);
                const otherBajada = existingBajada.filter(r => String(r[0]) !== añoMes);
                
                const allBajada = [...fullHeaders, ...otherBajada, ...fullRows];
                const lastCol = String.fromCharCode(65 + Math.min(allColumns.length, 25)); // A-Z
                await writeSheet(config.HUB_CIERRES_ID, `'Bajada_Estatica'!A1:BZ${allBajada.length}`, allBajada);
                
                console.log(`[bajada] ✅ Q95 cruda al sheet: ${fullRows.length} operaciones, ${allColumns.length + 1} columnas (${mesesIncluir.join(', ')})`);
            }
            
            // También actualizar snapshots locales de M-1 y M-2
            for (let i = 1; i <= 2; i++) {
                let pastM = Number(month) - i;
                let pastY = Number(year);
                if (pastM <= 0) { pastM += 12; pastY -= 1; }
                console.log(`[bajada] Actualizando snapshot dinámico ${pastY}-${pastM}...`);
                const dynResults = await calculateDynamicMonth(pastY, pastM);
                const finalDynResults = await saveSnapshotPreservingFrozen(pastY, pastM, dynResults);
                try {
                    await updateDynamicSueldos(pastY, pastM, finalDynResults);
                } catch (err: any) {
                    console.warn(`[bajada] ⚠️ Error escribiendo pastMonth ${pastY}-${pastM} al Google Sheet: ${err.message}`);
                }
            }
        } catch (sheetErr: any) {
            console.warn(`[bajada] ⚠️ No se pudo escribir bajada estática: ${sheetErr.message}`);
        }
        
        // Sumar ajustes por agente y agregarlos al snapshot
        const ajustesPorAgente = new Map<string, number>();
        for (const r of retros) {
            const key = r.comercial.toLowerCase();
            ajustesPorAgente.set(key, (ajustesPorAgente.get(key) || 0) + r.ajusteComponenteP);
        }
        
        // Actualizar el snapshot con los ajustes sumados (manuales + retroactivos) y aplicar fórmula de cierreReal
        for (const res of results) {
            const agentRetros = retros.filter(r => r.comercial.toLowerCase() === res.asociadoComercial.toLowerCase());
            res.retroactivosDetalle = agentRetros.length > 0 ? agentRetros : undefined;

            const manuales = res.ajustesManuales !== undefined ? res.ajustesManuales : (res.ajustes || 0);
            res.ajustesManuales = manuales;
            const ajusteRetro = ajustesPorAgente.get(res.asociadoComercial.toLowerCase()) || 0;
            res.ajustes = Math.round(manuales + ajusteRetro);
            
            let reintegroNeto = res.reintegroMovilidad || 0;
            const tieneAutoPropio = (res.reintegroMovilidad || 0) > 0;
            if (tieneAutoPropio) {
                reintegroNeto = reintegroNeto - (res.gastosMendelMovilidad || 0);
            }
            let ajusteEspecial = 0;
            if (res.asociadoComercial.toLowerCase() === 'pablo cieri') {
                ajusteEspecial = (res.componenteP || 0) * -0.20;
            }
            const totalComponentes = (res.componenteP || 0) + (res.componenteR || 0) + (res.componenteO || 0);
            const isOperarioCarga = (res.tipo || '').toLowerCase().includes('operario');
            const sueldoFinal = isOperarioCarga
                ? (res.minimo || 0) + (res.componenteP || 0) + res.ajustes
                : Math.max(res.minimo || 0, totalComponentes + res.ajustes);
            res.cierreReal = sueldoFinal + reintegroNeto - (res.amortizacioneDcac || 0) + ajusteEspecial;
        }
        
        // Re-guardar snapshot con ajustes incluidos
        const finalResultsWithAjustes = await saveSnapshotPreservingFrozen(Number(year), Number(month), results);
        try {
            await updateDynamicSueldos(Number(year), Number(month), finalResultsWithAjustes);
        } catch (err: any) {
            console.warn(`[generate] ⚠️ Error escribiendo cierre al Google Sheet: ${err.message}`);
        }
        
        res.json({ 
            success: true, 
            message: "Cierre generado correctamente",
            retroactivos: retros.length,
            detalleLotes: detalleRows.length,
            totalAjuste: Math.round([...ajustesPorAgente.values()].reduce((a, b) => a + b, 0))
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// API para generar o actualizar el cierre de un solo agente específico
router.post('/generate/agent', async (req, res) => {
    const { year, month, agentName } = req.body;
    if (!year || !month || !agentName) {
        return res.status(400).json({ error: "Falta año, mes o nombre del asociado comercial" });
    }
    
    try {
        const period = `${year}_${String(month).padStart(2, '0')}`;
        const frozenList = await getFrozenClosures();
        const isFrozen = frozenList.some(item => item.period === period && item.agentName.toLowerCase() === agentName.toLowerCase());
        if (isFrozen) {
            return res.status(400).json({ error: "El comercial se encuentra congelado. Debe descongelarlo primero para poder recalcular." });
        }

        console.log(`Recalculando cierre específico para ${agentName} en ${year}-${month}...`);
        
        // 1. Calcular mes dinámico completo (obtiene data fresca de Sheets/Metabase)
        const freshResults = await calculateDynamicMonth(Number(year), Number(month));
        const agentFresh = freshResults.find(r => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
        
        if (!agentFresh) {
            return res.status(404).json({ error: `No se encontró al asociado ${agentName} en los nuevos cálculos` });
        }
        
        // 2. Cargar snapshot actual
        const currentSnapshot = await loadMonthSnapshot(Number(year), Number(month)) || [];
        
        // Asegurar que cada registro en el snapshot tiene cargado ajustesManuales
        for (const r of currentSnapshot) {
            if (r.ajustesManuales === undefined) {
                const prevRetroSum = (r.retroactivosDetalle || []).reduce((sum: number, ret: any) => sum + (ret.ajusteComponenteP || 0), 0);
                r.ajustesManuales = Math.round((r.ajustes || 0) - prevRetroSum);
            }
            r.retroactivosDetalle = undefined;
        }
        
        // 3. Reemplazar o agregar el agente en el snapshot
        const agentIndex = currentSnapshot.findIndex((r: any) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
        if (agentIndex !== -1) {
            currentSnapshot[agentIndex] = agentFresh;
        } else {
            currentSnapshot.push(agentFresh);
        }
        
        // 4. Recalcular retroactivos (necesario ya que cambios de este agente pueden impactar en la red)
        console.log(`Recalculando retroactivos tras actualización de ${agentName}...`);
        const retros = await calculateRetroactiveAdjustments(Number(year), Number(month));
        
        // Guardar retroactivos como JSON local (backup)
        try {
            const retroFile = path.join(SNAPSHOTS_DIR, `retro_${year}_${String(month).padStart(2, '0')}.json`);
            fs.writeFileSync(retroFile, JSON.stringify(retros, null, 2));
        } catch (writeErr: any) {
            console.warn(`[retro] ⚠️ No se pudo guardar retro local: ${writeErr.message}`);
        }
        
        // Sumar ajustes por agente
        const ajustesPorAgente = new Map<string, number>();
        for (const r of retros) {
            const key = r.comercial.toLowerCase();
            ajustesPorAgente.set(key, (ajustesPorAgente.get(key) || 0) + r.ajusteComponenteP);
        }
        
        // Consolidar ajustes manuales + retroactivos para todos en el snapshot
        for (const r of currentSnapshot) {
            const agentRetros = retros.filter(ret => ret.comercial.toLowerCase() === r.asociadoComercial.toLowerCase());
            r.retroactivosDetalle = agentRetros.length > 0 ? agentRetros : undefined;

            const manuales = r.ajustesManuales !== undefined ? r.ajustesManuales : (r.ajustes || 0);
            r.ajustesManuales = manuales;
            const ajusteRetro = ajustesPorAgente.get(r.asociadoComercial.toLowerCase()) || 0;
            r.ajustes = Math.round(manuales + ajusteRetro);
            
            let reintegroNeto = r.reintegroMovilidad || 0;
            const tieneAutoPropio = (r.reintegroMovilidad || 0) > 0;
            if (tieneAutoPropio) {
                reintegroNeto = reintegroNeto - (r.gastosMendelMovilidad || 0);
            }
            let ajusteEspecial = 0;
            if (r.asociadoComercial.toLowerCase() === 'pablo cieri') {
                ajusteEspecial = (r.componenteP || 0) * -0.20;
            }
            const totalComponentes = (r.componenteP || 0) + (r.componenteR || 0) + (r.componenteO || 0);
            const isOperarioCarga = (r.tipo || '').toLowerCase().includes('operario');
            const sueldoFinal = isOperarioCarga
                ? (r.minimo || 0) + (r.componenteP || 0) + r.ajustes
                : Math.max(r.minimo || 0, totalComponentes + r.ajustes);
            r.cierreReal = sueldoFinal + reintegroNeto - (r.amortizacioneDcac || 0) + ajusteEspecial;
        }
        
        // 5. Guardar el snapshot consolidado final en el disco
        const finalSnapshot = await saveSnapshotPreservingFrozen(Number(year), Number(month), currentSnapshot);
        try {
            await updateDynamicSueldos(Number(year), Number(month), finalSnapshot);
        } catch (err: any) {
            console.warn(`[generate/agent] ⚠️ Error escribiendo cierre del agente al Google Sheet: ${err.message}`);
        }
        
        res.json({
            success: true,
            message: `Cierre para ${agentName} recalculado y guardado correctamente`,
            agent: {
                nombre: agentFresh.asociadoComercial,
                kms: agentFresh.kms,
                auto: agentFresh.auto,
                reintegro: agentFresh.reintegroMovilidad,
                gastosMkt: agentFresh.gastosMkt,
                cierreReal: agentFresh.cierreReal
            }
        });
        
    } catch (e: any) {
        console.error('Error recalculando agente:', e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para consultar retroactivos de un mes
router.get('/retroactivos', async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: "Falta year y month" });
    
    try {
        const retroFile = path.join(SNAPSHOTS_DIR, `retro_${year}_${String(Number(month)).padStart(2, '0')}.json`);
        
        if (fs.existsSync(retroFile)) {
            // Devolver retroactivos pre-calculados
            const data = JSON.parse(fs.readFileSync(retroFile, 'utf8'));
            return res.json(data);
        }
        
        // Si no existen, calcularlos en vivo
        const retros = await calculateRetroactiveAdjustments(Number(year), Number(month));
        res.json(retros);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

const CUENTAS_FILE_BUNDLED = path.join(__dirname, '../core/data/cuentas.json');
const CUENTAS_FILE_TMP = '/tmp/cuentas.json';

function getCuentasFile(): string {
    // En Vercel: intentar /tmp primero (si fue actualizado), luego el bundled
    if (IS_VERCEL) {
        if (fs.existsSync(CUENTAS_FILE_TMP)) return CUENTAS_FILE_TMP;
        return CUENTAS_FILE_BUNDLED;
    }
    return CUENTAS_FILE_BUNDLED;
}

// API para Cuentas Especiales
router.get('/cuentas', (req, res) => {
    const cuentasFile = getCuentasFile();
    if (!fs.existsSync(cuentasFile)) {
        return res.json([]);
    }
    try {
        const data = fs.readFileSync(cuentasFile, 'utf8');
        res.json(JSON.parse(data));
    } catch(e) {
        res.status(500).json({ error: "Error leyendo cuentas.json" });
    }
});

router.post('/cuentas', (req, res) => {
    try {
        const target = IS_VERCEL ? CUENTAS_FILE_TMP : CUENTAS_FILE_BUNDLED;
        fs.writeFileSync(target, JSON.stringify(req.body, null, 2), 'utf8');
        res.json({ success: true });
    } catch(e: any) {
        res.status(500).json({ error: `Error guardando cuentas: ${e.message}` });
    }
});

router.get('/mendel', async (req, res) => {
    try {
        const mendelData = await fetchMendelGastos();
        res.json(mendelData);
    } catch(e: any) {
        res.status(500).json({ error: "Error leyendo Mendel: " + e.message });
    }
});

router.get('/kms-prices', async (req, res) => {
    try {
        const prices = await fetchPreciosKm();
        const obj = Object.fromEntries(prices);
        res.json(obj);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// ── Ajustes Manuales (CRUD en Google Sheets) ──
router.get('/ajustes-manuales', async (req, res) => {
    try {
        const raw = await readSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F");
        const data: any[] = [];
        raw.forEach((row, idx) => {
            const año = Number(row[0]);
            const comercial = String(row[3] || '').trim();
            if (año && comercial) {
                data.push({
                    id: idx, // index en A2:F (fila en Sheets es id + 2)
                    año,
                    mes: Number(row[1]) || 0,
                    añoMes: String(row[2] || ''),
                    comercial,
                    motivo: String(row[4] || '').trim(),
                    monto: cleanSheetsNumber(row[5])
                });
            }
        });
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/ajustes-manuales', async (req, res) => {
    try {
        const { año, mes, comercial, motivo, monto } = req.body;
        if (!año || !mes || !comercial || isNaN(Number(monto))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [Number(año), Number(mes), añoMes, String(comercial).trim(), String(motivo).trim(), Number(monto)];
        await appendSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A:F", [row]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/ajustes-manuales/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const { año, mes, comercial, motivo, monto } = req.body;
        if (!año || !mes || !comercial || isNaN(Number(monto))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [Number(año), Number(mes), añoMes, String(comercial).trim(), String(motivo).trim(), Number(monto)];
        
        const sheetRow = id + 2;
        const range = `'Ajustes'!A${sheetRow}:F${sheetRow}`;
        await writeSheet(config.HUB_CONFIGURACIONES_ID, range, [row]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/ajustes-manuales/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const raw = await readSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F");
        if (id >= raw.length) {
            return res.status(404).json({ error: 'Ajuste no encontrado' });
        }
        
        raw.splice(id, 1);
        
        await clearSheetRange(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F2000");
        
        if (raw.length > 0) {
            await writeSheet(config.HUB_CONFIGURACIONES_ID, `'Ajustes'!A2:F${raw.length + 1}`, raw);
        }
        
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/revision/sociedad-sin-legajo', async (req, res) => {
    try {
        const year = parseInt(String(req.query.year), 10);
        const month = parseInt(String(req.query.month), 10);
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const rawOps = await fetchQ95();
        const roster = await getRoster();
        const assignmentDates = await fetchAcAssignmentDates();

        // A helper function to normalize name comparison
        const cleanName = (name: string | null | undefined): string => {
            if (!name) return '';
            return name.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, '')
                .trim();
        };

        const ops = rawOps.filter((op: any) => {
            if (!op.fecha_operacion) return false;
            const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
            const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
            return opYear === year && opMonth === month;
        });

        const items: any[] = [];
        for (const op of ops) {
            const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
            const acSocVend = op.asociado_comercial_soc_vend || '';
            const repreVend = op.RepreVendedor || op.repre_vendedor || '';
            const legajoVend = acIdVend || repreVend || '';

            const acIdComp = op.asociado_comercial_id_comp || op.AC_Comp || '';
            const acSocComp = op.asociado_comercial_soc_comp || '';
            const repreComp = op.RepreComprador || op.repre_comprador || '';
            const legajoComp = acIdComp || repreComp || '';

            const resolvedVend = acSocVend ? await normalizeName(String(acSocVend)) : null;
            const resolvedComp = acSocComp ? await normalizeName(String(acSocComp)) : null;

            // Discrepancy is when society has a resolved AC, but it differs from the transaction legajo
            const isVendDiff = resolvedVend !== null && cleanName(legajoVend) !== cleanName(resolvedVend);
            const isCompDiff = resolvedComp !== null && cleanName(legajoComp) !== cleanName(resolvedComp);

            if (isVendDiff || isCompDiff) {
                const vendRosterEntry = resolvedVend ? roster.get(resolvedVend.toLowerCase()) : null;
                const compRosterEntry = resolvedComp ? roster.get(resolvedComp.toLowerCase()) : null;

                const vendRosterName = resolvedVend ? (vendRosterEntry?.nombre || resolvedVend) : '';
                const compRosterName = resolvedComp ? (compRosterEntry?.nombre || resolvedComp) : '';

                const ac_vendedor_activo = vendRosterEntry ? (vendRosterEntry.activo ? 'Sí' : 'No') : '—';
                const ac_vendedor_tipo = vendRosterEntry ? vendRosterEntry.tipo : '—';

                const ac_comprador_activo = compRosterEntry ? (compRosterEntry.activo ? 'Sí' : 'No') : '—';
                const ac_comprador_tipo = compRosterEntry ? compRosterEntry.tipo : '—';

                // Look up assignment dates
                const cuitVend = String(op.cuit_vendedor || '').trim();
                const cuitComp = String(op.cuit_comprador || '').trim();

                const fechaAsigVend = cuitVend ? assignmentDates[cuitVend] : null;
                const fechaAsigComp = cuitComp ? assignmentDates[cuitComp] : null;

                const opDateStr = op.fecha_operacion ? op.fecha_operacion.substring(0, 10) : '';

                let reasignar_venta_valido = false;
                let reasignar_venta_motivo = '—';
                if (isVendDiff) {
                    if (!vendRosterEntry) {
                        reasignar_venta_motivo = 'No encontrado en Roster';
                    } else if (!vendRosterEntry.activo) {
                        reasignar_venta_motivo = 'Agente Inactivo';
                    } else if (vendRosterEntry.tipo === 'Corporate') {
                        reasignar_venta_motivo = 'Cuenta Corporativa';
                    } else if (fechaAsigVend) {
                        const asigDateOnly = fechaAsigVend.substring(0, 10);
                        if (opDateStr < asigDateOnly) {
                            reasignar_venta_valido = true;
                            reasignar_venta_motivo = `Válido (Reasignación posterior: ${asigDateOnly})`;
                        } else {
                            reasignar_venta_motivo = `Discrepancia (Operación posterior a asignación: ${asigDateOnly})`;
                        }
                    } else {
                        reasignar_venta_motivo = 'Discrepancia (Sin fecha de asignación)';
                    }
                }

                let reasignar_compra_valido = false;
                let reasignar_compra_motivo = '—';
                if (isCompDiff) {
                    if (!compRosterEntry) {
                        reasignar_compra_motivo = 'No encontrado en Roster';
                    } else if (!compRosterEntry.activo) {
                        reasignar_compra_motivo = 'Agente Inactivo';
                    } else if (compRosterEntry.tipo === 'Corporate') {
                        reasignar_compra_motivo = 'Cuenta Corporativa';
                    } else if (fechaAsigComp) {
                        const asigDateOnly = fechaAsigComp.substring(0, 10);
                        if (opDateStr < asigDateOnly) {
                            reasignar_compra_valido = true;
                            reasignar_compra_motivo = `Válido (Reasignación posterior: ${asigDateOnly})`;
                        } else {
                            reasignar_compra_motivo = `Discrepancia (Operación posterior a asignación: ${asigDateOnly})`;
                        }
                    } else {
                        reasignar_compra_motivo = 'Discrepancia (Sin fecha de asignación)';
                    }
                }

                items.push({
                    lote: op.id_lote || op.id,
                    fecha: opDateStr || '—',
                    sociedad_vendedora: op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '—',
                    sociedad_compradora: op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '—',
                    cantidad: Number(op.Cabezas || op.cantidad) || 0,
                    categoria: op.categoria || '—',
                    ac_negocio_venta: legajoVend || '—',
                    ac_sociedad_venta_raw: acSocVend || '—',
                    ac_sociedad_venta_resuelta: vendRosterName || '—',
                    ac_vendedor_activo,
                    ac_vendedor_tipo,
                    tropa_tiene_ac_venta: !!legajoVend,
                    reasignar_venta: isVendDiff,
                    reasignar_venta_valido,
                    reasignar_venta_motivo,
                    ac_negocio_compra: legajoComp || '—',
                    ac_sociedad_compra_raw: acSocComp || '—',
                    ac_sociedad_compra_resuelta: compRosterName || '—',
                    ac_comprador_activo,
                    ac_comprador_tipo,
                    tropa_tiene_ac_compra: !!legajoComp,
                    reasignar_compra: isCompDiff,
                    reasignar_compra_valido,
                    reasignar_compra_motivo,
                    importe: Number(op.importe_vendedor || op.importe_comprador || 0)
                });
            }
        }

        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/revision/concretadas-sin-cierre', async (req, res) => {
    try {
        const year = parseInt(String(req.query.year), 10);
        const month = parseInt(String(req.query.month), 10);
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const rawOps = await fetchQ95();
        const roster = await getRoster();

        const ops = rawOps.filter((op: any) => {
            if (!op.fecha_operacion) return false;
            const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
            const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
            if (opYear !== year || opMonth !== month) return false;

            const estado = String(op.ESTADO || '').toUpperCase();
            const estadoTrop = String(op.Estado_Trop || '').toUpperCase();

            const isConcretada = (estado.includes('CONCRETADA') && !estado.includes('NO CONCRETADA')) ||
                                 (estadoTrop.includes('CONCRETADA') && !estadoTrop.includes('NO CONCRETADA'));
            const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];

            const isInvalidState = invalidStates.includes(estado) || invalidStates.includes(estadoTrop);

            return isConcretada && isInvalidState;
        });

        const items: any[] = [];
        for (const op of ops) {
            const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
            const acSocVend = op.asociado_comercial_soc_vend || '';
            const repreVend = op.RepreVendedor || op.repre_vendedor || '';
            let vendRaw = acIdVend || acSocVend || repreVend || op.operador_nombre || '';
            const resolvedVend = vendRaw ? await normalizeName(String(vendRaw)) : null;
            const acVendedorName = resolvedVend ? (roster.get(resolvedVend)?.nombre || resolvedVend) : '—';

            const acIdComp = op.asociado_comercial_id_comp || op.AC_Comp || '';
            const acSocComp = op.asociado_comercial_soc_comp || '';
            const repreComp = op.RepreComprador || op.repre_comprador || '';
            let compRaw = acIdComp || acSocComp || repreComp || op.operador_nombre || '';
            const resolvedComp = compRaw ? await normalizeName(String(compRaw)) : null;
            const acCompradorName = resolvedComp ? (roster.get(resolvedComp)?.nombre || resolvedComp) : '—';

            items.push({
                lote: op.id_lote || op.id,
                fecha: op.fecha_operacion ? op.fecha_operacion.substring(0, 10) : '—',
                sociedad_vendedora: op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '—',
                sociedad_compradora: op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '—',
                cantidad: Number(op.Cabezas || op.cantidad) || 0,
                categoria: op.categoria || '—',
                estado_tropa: op.Estado_Trop || '—',
                estado_operacion: op.ESTADO || '—',
                ac_vendedor: acVendedorName,
                ac_comprador: acCompradorName,
                importe: Number(op.importe_vendedor || op.importe_comprador || 0)
            });
        }

        res.json(items);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// ─── Market Metrics: real rendimientos from Metabase lotes ───

router.get('/market-metrics', async (req, res) => {
    try {
        const year = parseInt(String(req.query.year), 10);
        const month = parseInt(String(req.query.month), 10);
        if (!year || !month) return res.status(400).json({ error: 'year & month required' });

        const rawOps = await fetchQ95();

        // Filter by month/year and concretadas (same filter as engine)
        const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
        const ops = rawOps.filter(op => {
            if (!op.fecha_operacion) return false;
            const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
            const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
            if (opYear !== year || opMonth !== month) return false;
            const estado = String(op.ESTADO || '').toUpperCase();
            const estadoTrop = String(op.Estado_Trop || '').toUpperCase();
            if (invalidStates.includes(estado) || invalidStates.includes(estadoTrop)) return false;
            return true;
        });

        // Deduplicate by id_lote to avoid double-counting compra/venta
        const lotesMap = new Map<string, { cab: number; tipo: string; impVend: number; res: number }>();
        for (const op of ops) {
            const lid = String(op.id_lote || op.id);
            if (lotesMap.has(lid)) continue;
            const cab = Number(op.Cabezas || op.cantidad) || 0;
            const impVend = Number(op.importe_vendedor) || 0;
            const res = Number(op.resultado_final || op.resultado_total_proyectado) || 0;
            const tipoOp = String(op.Tipo || op.tipo_negocio || '').toUpperCase();
            let un = 'INV';
            if (tipoOp.includes('MAG') || String(op.feria || '').toUpperCase() === 'MAG') un = 'MAG';
            else if (tipoOp.includes('FAENA')) un = 'FAENA';
            else if (tipoOp.includes('CRIA') || tipoOp.includes('REPRODUCTOR')) un = 'CRIA';
            lotesMap.set(lid, { cab, tipo: un, impVend, res });
        }

        // Compute rend = total resultado / total importe * 100 (per UN and total)
        const metrics: Record<string, { sumRes: number; sumCab: number; sumImp: number }> = {
            INV: { sumRes: 0, sumCab: 0, sumImp: 0 },
            FAENA: { sumRes: 0, sumCab: 0, sumImp: 0 },
            CRIA: { sumRes: 0, sumCab: 0, sumImp: 0 },
            MAG: { sumRes: 0, sumCab: 0, sumImp: 0 },
            TOTAL: { sumRes: 0, sumCab: 0, sumImp: 0 },
        };

        for (const l of lotesMap.values()) {
            if (l.cab <= 0) continue;
            const m = metrics[l.tipo];
            m.sumRes += l.res;
            m.sumCab += l.cab;
            m.sumImp += l.impVend;
            metrics.TOTAL.sumRes += l.res;
            metrics.TOTAL.sumCab += l.cab;
            metrics.TOTAL.sumImp += l.impVend;
        }

        const result: Record<string, { rend: number; dollarPerCab: number; cab: number }> = {};
        for (const [key, m] of Object.entries(metrics)) {
            result[key] = {
                rend: m.sumImp > 0 ? Math.round(m.sumRes / m.sumImp * 10000) / 100 : 0,
                dollarPerCab: m.sumCab > 0 ? Math.round(m.sumImp / m.sumCab) : 0,
                cab: m.sumCab,
            };
        }

        res.json({ year, month, lotes: lotesMap.size, metrics: result });
    } catch (e: any) {
        console.error('market-metrics error:', e);
        res.status(500).json({ error: e.message });
    }
});


// ─── Validation: V3 (BDSUELDO_REAL) vs V4 (engine snapshots) ───
import { CommercialResult } from '../core/types';

// ── Cache offline: guarda datos de Google Sheets a disco para funcionar sin WiFi ──
const OFFLINE_CACHE_DIR = IS_VERCEL ? '/tmp/cache' : path.join(__dirname, '../core/cache');
try { if (!fs.existsSync(OFFLINE_CACHE_DIR)) fs.mkdirSync(OFFLINE_CACHE_DIR, { recursive: true }); } catch (e) {}

function saveOfflineCache(name: string, data: any) {
    try {
        fs.writeFileSync(path.join(OFFLINE_CACHE_DIR, `${name}.json`), JSON.stringify(data));
        console.log(`[cache] Guardado offline: ${name}.json`);
    } catch (e: any) { console.warn(`[cache] Error guardando ${name}:`, e.message); }
}

function loadOfflineCache(name: string): any | null {
    const filePath = path.join(OFFLINE_CACHE_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const stat = fs.statSync(filePath);
        console.log(`[cache] Cargado offline: ${name}.json (guardado: ${stat.mtime.toISOString().split('T')[0]})`);
        return data;
    } catch (e: any) { console.warn(`[cache] Error leyendo ${name}:`, e.message); return null; }
}

let cachedValidateV3: any[] | null = null;
let lastValidateV3Fetch = 0;
// Cache del roster completo (Asociados Comerciales) para filtrar ACs activos
interface RosterInfo { nombre: string; codigo: string; tipo: string; activo: boolean; oficina: string; modalidad: string; categoria: number }
let cachedFullRoster: Map<string, RosterInfo> | null = null;
let cachedRosterByCodigo: Map<string, RosterInfo> | null = null;
let lastRosterFetch = 0;

router.get('/validate', async (req, res) => {
    try {
        const year = parseInt(String(req.query.year), 10);
        const month = parseInt(String(req.query.month), 10);
        if (!year || !month) return res.status(400).json({ error: 'year & month required' });

        const now = Date.now();

        // ── Roster: leer 'Asociados Comerciales' completo para saber tipo + activo + codigo ──
        if (!cachedFullRoster || (now - lastRosterFetch > 1000 * 60 * 60)) {
            const MASTER_ROSTER_ID = config.MASTER_ROSTER_ID;
            let rosterRaw: any[] | null = null;
            try {
                rosterRaw = await readSheet(MASTER_ROSTER_ID, "'Asociados Comerciales'!A2:AC");
                saveOfflineCache('roster_ac', rosterRaw);
            } catch (e: any) {
                console.warn(`[validate] Sin conexión para roster: ${e.message}. Buscando cache offline...`);
                rosterRaw = loadOfflineCache('roster_ac');
                if (!rosterRaw) throw new Error('Sin conexión y sin cache offline del roster');
            }
            cachedFullRoster = new Map();
            cachedRosterByCodigo = new Map();
            for (const row of rosterRaw) {
                const nombre = String(row[0] || '').trim();
                if (!nombre) continue;
                const codigo = String(row[1] || '').trim();     // Col B = Código / ID Usuario
                const tipo = String(row[5] || '').trim();       // Col F = Tipo
                const activo = String(row[9] || '').trim().toLowerCase() === 'si'; // Col J = Activo
                const oficina = String(row[4] || '').trim();    // Col E = Oficina
                const modalidad = String(row[6] || '').trim();  // Col G = Modalidad
                const categoria = Number(row[22]) || 0;         // Col W = Categoria
                const entry: RosterInfo = { nombre, codigo, tipo, activo, oficina, modalidad, categoria };
                cachedFullRoster.set(nombre.toLowerCase(), entry);
                if (codigo) cachedRosterByCodigo.set(codigo, entry);
            }
            lastRosterFetch = now;
            // Log tipos encontrados para debugging
            const tipos = new Set([...cachedFullRoster.values()].map(r => r.tipo));
            console.log(`[validate] Roster cargado: ${cachedFullRoster.size} entradas. Tipos: ${[...tipos].join(', ')}`);
            const activeCount = [...cachedFullRoster.values()].filter(r => r.activo && ['Regional', 'City Manager', 'Corporate', 'Representante'].includes(r.tipo)).length;
            console.log(`[validate] ACs activos (Regional/CityManager/Corporate/Representante): ${activeCount}`);
        }

        // Filtrar Asociados Comerciales activos — todos los tipos que son personas reales
        // Tipos: Regional (AC estándar), City Manager (Híbrido), Corporate (KAM), Representante
        const AC_TIPOS = ['Regional', 'City Manager', 'Corporate', 'Representante'];
        const activeACsByName = new Set<string>();
        const activeACsByCodigo = new Set<string>();
        for (const [key, entry] of cachedFullRoster) {
            if (entry.activo && AC_TIPOS.includes(entry.tipo)) {
                activeACsByName.add(key);
                if (entry.codigo) activeACsByCodigo.add(entry.codigo);
            }
        }

        // ── V3: leer datos de la hoja BDSUELDO_REAL (con cache de 1h) ──
        if (!cachedValidateV3 || (now - lastValidateV3Fetch > 1000 * 60 * 60)) {
            try {
                const raw = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
                cachedValidateV3 = raw;
                saveOfflineCache('v3_bdsueldo_real', raw);
            } catch (e: any) {
                console.warn(`[validate] Sin conexión para V3: ${e.message}. Buscando cache offline...`);
                const cached = loadOfflineCache('v3_bdsueldo_real');
                if (!cached) throw new Error('Sin conexión y sin cache offline de V3');
                cachedValidateV3 = cached;
            }
            lastValidateV3Fetch = now;
        }

        const anioMesTarget = year * 100 + month; // e.g. 202604
        const v3Rows = (cachedValidateV3 || []).filter(r => Number(r[3]) === anioMesTarget);

        // Parsear cada fila V3 a un objeto comparable
        interface V3Agent {
            nombre: string;
            codigo: string;
            tropas: number;
            cabezas: number;
            resultado: number;
            escala: number;
            componenteP: number;
            sueldo: number;
            cierreReal: number;
            minimo: number;
        }
        const v3Map = new Map<string, V3Agent>();
        const v3ByCodigo = new Map<string, V3Agent>();
        for (const row of v3Rows) {
            const nombre = String(row[4] || '').trim();
            const codigo = String(row[5] || '').trim();   // Col F = Codigo
            if (!nombre) continue;
            const key = nombre.toLowerCase();
            // Solo incluir si es un AC activo (match por nombre O codigo)
            if (!activeACsByName.has(key) && !(codigo && activeACsByCodigo.has(codigo))) continue;
            const agent: V3Agent = {
                nombre,
                codigo,
                tropas: Number(row[17]) || 0,
                cabezas: Number(row[18]) || 0,
                resultado: Number(row[22]) || 0,
                escala: Number(row[23]) || 0,
                componenteP: Number(row[24]) || 0,
                sueldo: Number(row[13]) || 0,
                cierreReal: Number(row[14]) || 0,
                minimo: Number(row[15]) || 0,
            };
            v3Map.set(key, agent);
            if (codigo) v3ByCodigo.set(codigo, agent);
        }

        // ── V4: leer snapshot del engine (desde Sheets, no filesystem) ──
        let v4List: CommercialResult[] = [];
        try {
            const snapshotData = await loadMonthSnapshot(Number(year), Number(month));
            if (snapshotData) v4List = snapshotData;
        } catch (snapErr: any) {
            console.warn(`[validate] Error leyendo snapshot de Sheets: ${snapErr.message}`);
        }

        const v4Map = new Map<string, CommercialResult>();
        const v4ByCodigo = new Map<string, CommercialResult>();
        for (const entry of v4List) {
            const key = String(entry.asociadoComercial || '').trim().toLowerCase();
            const cod = String(entry.codigo || '').trim();
            // Solo incluir si es un AC activo (match por nombre O codigo)
            const isActive = (key && activeACsByName.has(key)) || (cod && activeACsByCodigo.has(cod));
            if (!isActive) continue;
            // Si ya existe un entry para este key, quedarnos con el que tiene más datos
            if (key) {
                const existing = v4Map.get(key);
                if (!existing || (entry.tropasGeneral > existing.tropasGeneral) || (entry.sueldoBruto > existing.sueldoBruto)) {
                    v4Map.set(key, entry);
                }
            }
            if (cod) {
                const existing = v4ByCodigo.get(cod);
                if (!existing || (entry.tropasGeneral > existing.tropasGeneral) || (entry.sueldoBruto > existing.sueldoBruto)) {
                    v4ByCodigo.set(cod, entry);
                }
            }
        }

        // ── Comparar V3 ↔ V4 (dual-key: nombre + codigo) ──
        type CompFields = { tropas: number; cabezas: number; escala: number; resultado: number; componenteP: number; sueldo: number; cierreReal: number; minimo: number };
        type DiffFields = { tropas: number; cabezas: number; escala: number; resultado: number; componenteP: number };
        type AgentComparison = {
            nombre: string;
            codigo: string;
            oficina: string;
            modalidad: string;
            categoria: number;
            v3: CompFields | null;
            v4: CompFields | null;
            diff: DiffFields | null;
            status: 'ok' | 'minor' | 'major';
        };

        const agents: AgentComparison[] = [];
        const processedV4Keys = new Set<string>();

        // Recorrer todos los agentes de V3 (solo ACs activos)
        for (const [key, v3] of v3Map) {
            // Dual-key match: primero por nombre, si no, por codigo
            let v4Entry = v4Map.get(key) || null;
            if (!v4Entry && v3.codigo) v4Entry = v4ByCodigo.get(v3.codigo) || null;
            if (v4Entry) processedV4Keys.add(String(v4Entry.asociadoComercial || '').trim().toLowerCase());

            // Buscar info del roster (por nombre o codigo)
            const rosterInfo = cachedFullRoster!.get(key) || (v3.codigo ? cachedRosterByCodigo!.get(v3.codigo) : undefined);

            const v4Fields: CompFields | null = v4Entry ? {
                tropas: v4Entry.tropasGeneral,
                cabezas: v4Entry.cabezasGeneral,
                escala: v4Entry.escalaGen,
                resultado: v4Entry.resultado_final_ajustado,
                componenteP: v4Entry.componenteP,
                sueldo: v4Entry.sueldoBruto,
                cierreReal: v4Entry.cierreReal,
                minimo: v4Entry.minimo,
            } : null;

            const diff: DiffFields | null = v4Fields ? {
                tropas: v4Fields.tropas - v3.tropas,
                cabezas: v4Fields.cabezas - v3.cabezas,
                escala: v4Fields.escala - v3.escala,
                resultado: v4Fields.resultado - v3.resultado,
                componenteP: v4Fields.componenteP - v3.componenteP,
            } : null;

            // Clasificar según diferencia absoluta en componenteP
            let status: 'ok' | 'minor' | 'major' = 'ok';
            if (diff) {
                const absDiff = Math.abs(diff.componenteP);
                if (absDiff >= 50000) status = 'major';
                else if (absDiff >= 1000) status = 'minor';
            } else {
                status = 'major';
            }

            agents.push({
                nombre: v3.nombre,
                codigo: v3.codigo || v4Entry?.codigo || rosterInfo?.codigo || '',
                oficina: rosterInfo?.oficina || '',
                modalidad: rosterInfo?.modalidad || '',
                categoria: rosterInfo?.categoria || 0,
                v3: {
                    tropas: v3.tropas, cabezas: v3.cabezas, escala: v3.escala,
                    resultado: v3.resultado, componenteP: v3.componenteP,
                    sueldo: v3.sueldo, cierreReal: v3.cierreReal, minimo: v3.minimo,
                },
                v4: v4Fields,
                diff,
                status,
            });
        }

        // Agentes AC activos que están SOLO en V4 (no en V3)
        for (const [key, v4Entry] of v4Map) {
            if (processedV4Keys.has(key)) continue;
            const rosterInfo = cachedFullRoster.get(key);
            agents.push({
                nombre: v4Entry.asociadoComercial,
                codigo: v4Entry.codigo || rosterInfo?.codigo || '',
                oficina: rosterInfo?.oficina || '',
                modalidad: rosterInfo?.modalidad || '',
                categoria: rosterInfo?.categoria || 0,
                v3: null,
                v4: {
                    tropas: v4Entry.tropasGeneral,
                    cabezas: v4Entry.cabezasGeneral,
                    escala: v4Entry.escalaGen,
                    resultado: v4Entry.resultado_final_ajustado,
                    componenteP: v4Entry.componenteP,
                    sueldo: v4Entry.sueldoBruto,
                    cierreReal: v4Entry.cierreReal,
                    minimo: v4Entry.minimo,
                },
                diff: null,
                status: 'major',
            });
        }

        // Ordenar: major primero, luego minor, luego ok
        const statusOrder: Record<string, number> = { major: 0, minor: 1, ok: 2 };
        agents.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        // ── Resumen ──
        const total = agents.length;
        const okCount = agents.filter(a => a.status === 'ok').length;
        const minorCount = agents.filter(a => a.status === 'minor').length;
        const majorCount = agents.filter(a => a.status === 'major').length;
        const v3Total = v3Map.size;
        const matched = [...v3Map.keys()].filter(k => v4Map.has(k)).length;
        const matchRate = v3Total > 0 ? Math.round(matched / v3Total * 100) : 0;

        res.json({
            year,
            month,
            summary: { total, ok: okCount, minor: minorCount, major: majorCount, matchRate, activeACs: activeACsByName.size },
            agents,
        });
    } catch (e: any) {
        console.error('validate error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── Historical data per agent: V3 + Drive PDF links ───
import { getCierreLinks } from './drive';

router.get('/historico/:agente', async (req, res) => {
    try {
        const agentName = decodeURIComponent(req.params.agente);
        const roster = await getRoster();

        const normalizeNameSync = (rawName: string | null | undefined) => {
            if (!rawName) return null;
            let name = rawName.trim();
            if (!name) return null;
            const match = roster.get(name.toLowerCase());
            const AC_TIPOS = ['Regional', 'City Manager', 'Corporate', 'Representante', 'Oficina'];
            if (match && AC_TIPOS.includes(match.tipo)) {
                return match.nombre;
            }
            return null;
        };

        // 1. Get V3 data (all months for this agent)
        const now = Date.now();
        if (!cachedV3Data || (now - lastV3Fetch > 1000 * 60 * 60)) {
            const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
            cachedV3Data = data.map(r => ({
                anioMes: Number(r[3]),
                asociadoComercial: r[4],
                tipo: r[9],
                sueldo: Number(r[13]) || 0,
                cierreReal: Number(r[14]) || 0,
                minimo: Number(r[15]) || 0,
                tropas: Number(r[17]) || 0,
                cabezas: Number(r[18]) || 0,
                resultado: Number(r[22]) || 0,
                escala: Number(r[23]) || 0,
                compP: Number(r[24]) || 0,
            }));
            lastV3Fetch = now;
        }

        const agentV3Data = cachedV3Data.filter((r: any) => 
            r.asociadoComercial && r.asociadoComercial.toLowerCase() === agentName.toLowerCase()
        );

        // Map to store combined history entries
        const historyMap = new Map<number, any>();
        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Add V3 entries
        for (const r of agentV3Data) {
            const am = r.anioMes;
            const year = Math.floor(am / 100);
            const month = am % 100;
            historyMap.set(am, {
                anioMes: am,
                year,
                month,
                monthName: MONTHS_ES[month - 1] || '',
                tropas: r.tropas,
                cabezas: r.cabezas,
                resultado: r.resultado,
                escala: r.escala,
                compP: r.compP,
                sueldo: r.sueldo,
                cierreReal: r.cierreReal,
                minimo: r.minimo,
                bonificacionOculta: 0,
                driveLink: null,
                hasSnapshot: false,
            });
        }

        // 2. Read V4 data (from local snapshots)
        try {
            const allSnaps = await loadAllSnapshots();
            for (const [period, snapshotData] of Object.entries(allSnaps)) {
                const parts = period.split('_');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const am = year * 100 + month;

                const agentSnap = snapshotData.find((s: any) => s.asociadoComercial && s.asociadoComercial.toLowerCase() === agentName.toLowerCase());

                if (agentSnap) {
                    historyMap.set(am, {
                        anioMes: am,
                        year,
                        month,
                        monthName: MONTHS_ES[month - 1] || '',
                        tropas: agentSnap.tropasGeneral || 0,
                        cabezas: agentSnap.cabezasGeneral || 0,
                        resultado: agentSnap.resultado_final_ajustado || 0,
                        escala: agentSnap.escalaGen || 0,
                        compP: agentSnap.componenteP || 0,
                        sueldo: agentSnap.sueldoBruto || 0,
                        cierreReal: agentSnap.cierreReal || 0,
                        minimo: agentSnap.minimo || 0,
                        bonificacionOculta: 0,
                        driveLink: null,
                        hasSnapshot: true,
                    });
                }
            }
        } catch (e: any) {
            console.warn('[historico] Error al cargar los snapshots:', e.message);
        }

        // 3. Load Drive links
        let driveLinks = new Map<string, string>();
        try {
            driveLinks = await getCierreLinks();
            for (const [am, entry] of historyMap.entries()) {
                const linkKey = `${agentName.toLowerCase()}_${am}`;
                if (driveLinks.has(linkKey)) {
                    entry.driveLink = driveLinks.get(linkKey);
                }
            }
        } catch (e: any) {
            console.warn('[historico] No se pudieron obtener links de Drive:', e.message);
        }

        // 4. Load Metabase Q95 operations and aggregate cabezas & bonificación oculta
        try {
            const rawOps = await fetchQ95();
            
            // Temporary map for Metabase aggregates
            const metabaseAggregates = new Map<number, { cabezas: number, bonif: number, tropas: number }>();

            const cleanName = (n: string) => (n || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '').trim();
            const targetAgentClean = cleanName(agentName);

            for (const op of rawOps) {
                if (!op.fecha_operacion) continue;
                
                // State filters
                const estado = String(op.ESTADO || '').toUpperCase();
                const estadoTrop = String(op.Estado_Trop || '').toUpperCase();
                const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
                if (invalidStates.includes(estado) || invalidStates.includes(estadoTrop)) continue;

                // Resolve commercial names
                const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
                const acSocVend = op.asociado_comercial_soc_vend || '';
                const repreVend = op.RepreVendedor || op.repre_vendedor || '';
                const vendRaw = acIdVend || acSocVend || repreVend || op.operador_nombre || '';

                const acIdComp = op.asociado_comercial_id_comp || op.AC_Comp || '';
                const acSocComp = op.asociado_comercial_soc_comp || '';
                const repreComp = op.RepreComprador || op.repre_comprador || '';
                const compRaw = acIdComp || acSocComp || repreComp || op.operador_nombre || '';

                const acVendClean = cleanName(normalizeNameSync(String(vendRaw)) || '');
                const acCompClean = cleanName(normalizeNameSync(String(compRaw)) || '');

                const isSeller = acVendClean === targetAgentClean;
                const isBuyer = acCompClean === targetAgentClean;

                if (isSeller || isBuyer) {
                    const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
                    const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
                    const am = opYear * 100 + opMonth;

                    if (!metabaseAggregates.has(am)) {
                        metabaseAggregates.set(am, { cabezas: 0, bonif: 0, tropas: 0 });
                    }
                    const agg = metabaseAggregates.get(am)!;
                    
                    agg.tropas += 1;
                    agg.cabezas += Number(op.Cabezas || op.cantidad) || 0;
                    
                    if (isSeller) {
                        agg.bonif += Number(op.bonificacion_vendedor) || 0;
                    }
                    if (isBuyer) {
                        agg.bonif += Number(op.bonificacion_comprador) || 0;
                    }
                }
            }

            // Merge Metabase aggregates into historyMap
            for (const [am, agg] of metabaseAggregates.entries()) {
                if (historyMap.has(am)) {
                    const entry = historyMap.get(am);
                    entry.cabezas = agg.cabezas;
                    entry.bonificacionOculta = Math.round(agg.bonif);
                    entry.tropas = agg.tropas;
                } else {
                    const year = Math.floor(am / 100);
                    const month = am % 100;
                    historyMap.set(am, {
                        anioMes: am,
                        year,
                        month,
                        monthName: MONTHS_ES[month - 1] || '',
                        tropas: agg.tropas,
                        cabezas: agg.cabezas,
                        resultado: 0,
                        escala: 0,
                        compP: 0,
                        sueldo: 0,
                        cierreReal: 0,
                        minimo: 0,
                        bonificacionOculta: Math.round(agg.bonif),
                        driveLink: driveLinks.get(`${agentName.toLowerCase()}_${am}`) || null,
                        hasSnapshot: false,
                    });
                }
            }

        } catch (mbErr: any) {
            console.error('[historico] Error aggregating Metabase data:', mbErr.message);
        }

        const history = Array.from(historyMap.values());
        history.sort((a: any, b: any) => b.anioMes - a.anioMes);
        
        res.json({ agente: agentName, history });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Métricas de la Red Regional — deduplicadas por id_lote
// Trae operaciones concretadas del Q95, filtradas por fecha server-side
router.get('/metricas-red', async (req, res) => {
    try {
        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Parámetros opcionales de fecha (del filtro principal)
        const qYear = req.query.year ? parseInt(String(req.query.year)) : undefined;
        const qMonth = req.query.month ? parseInt(String(req.query.month)) : undefined;
        
        if (qYear) {
            console.log(`[metricas-red] Filtro: year=${qYear} month=${qMonth || 'all'}`);
        }

        // --- Cargar roster y Q95 ---
        const roster = await getRoster();
        const q95Raw = await fetchQ95();

        // Filtro de estados inválidos (mismo que engine.ts)
        const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];

        // Resolve both sides of an operation to channel names using
        // the exact same logic as engine.ts (normalizeName → classifyChannel)
        const resolveOpChannels = async (op: any): Promise<{ cVenta: string; cCompra: string; acVendRaw: string; acCompRaw: string }> => {
            // Venta: legajo → sociedad → repre (same priority as engine)
            const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
            const acSocVend = op.asociado_comercial_soc_vend || '';
            const repreVend = op.RepreVendedor || op.repre_vendedor || '';
            const vendRaw = acIdVend || acSocVend || repreVend || '';
            
            // Compra: legajo → sociedad → repre
            const acIdComp = op.asociado_comercial_id_comp || op.AC_Comp || '';
            const acSocComp = op.asociado_comercial_soc_comp || '';
            const repreComp = op.RepreComprador || op.repre_comprador || '';
            const compRaw = acIdComp || acSocComp || repreComp || '';
            
            const acVend = vendRaw ? await normalizeName(String(vendRaw)) : null;
            const acComp = compRaw ? await normalizeName(String(compRaw)) : null;
            
            const cVenta = classifyChannel(acVend, repreVend, op.Canal_Venta, roster).toUpperCase();
            const cCompra = classifyChannel(acComp, repreComp, op.Canal_compra, roster).toUpperCase();
            
            return { cVenta, cCompra, acVendRaw: vendRaw, acCompRaw: compRaw };
        };

        // --- Agrupar operaciones del Q95 por año-mes ---
        const opsByMonth = new Map<string, any[]>();
        
        for (const op of q95Raw) {
            if (!op.fecha_operacion) continue;
            const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
            const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
            if (isNaN(opYear) || isNaN(opMonth)) continue;
            
            // Filtro por año: solo el año solicitado + el anterior (para YoY)
            if (qYear && opYear !== qYear && opYear !== qYear - 1) continue;
            
            // Filtro de concretadas
            const estado = String(op.ESTADO || '').toUpperCase();
            const estadoTrop = String(op.Estado_Trop || '').toUpperCase();
            if (invalidStates.includes(estado) || invalidStates.includes(estadoTrop)) continue;
            
            const key = `${opYear}_${String(opMonth).padStart(2, '0')}`;
            if (!opsByMonth.has(key)) opsByMonth.set(key, []);
            opsByMonth.get(key)!.push(op);
        }

        // Segundo agrupamiento: Concretadas + No Concretadas (para CCC = concretada / total en venta)
        // Excluye: PUBLICADO, OFRECIMIENTOS, BAJA, DADAS DE BAJA, PUBLICADAS, PUBLICADO OCULTO, REVISAR
        const cccExcludeStates = ['PUBLICADO', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
        const allOpsByMonth = new Map<string, any[]>();
        for (const op of q95Raw) {
            if (!op.fecha_operacion) continue;
            const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
            const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
            if (isNaN(opYear) || isNaN(opMonth)) continue;
            if (qYear && opYear !== qYear && opYear !== qYear - 1) continue;
            
            // Excluir bajas, publicadas, ofrecimientos — pero DEJAR pasar "NO CONCRETADAS"
            const estado = String(op.ESTADO || '').toUpperCase();
            const estadoTrop = String(op.Estado_Trop || '').toUpperCase();
            if (cccExcludeStates.includes(estado) || cccExcludeStates.includes(estadoTrop)) continue;
            
            const key = `${opYear}_${String(opMonth).padStart(2, '0')}`;
            if (!allOpsByMonth.has(key)) allOpsByMonth.set(key, []);
            allOpsByMonth.get(key)!.push(op);
        }

        // --- Cargar gastos Mendel del sheet ---
        let mendelData: any[] = [];
        try {
            mendelData = await fetchMendelGastos();
        } catch (e: any) {
            console.warn('[metricas-red] No se pudo cargar Mendel:', e.message);
        }
        // Agrupar Mendel por periodo + usuario normalizado
        const mendelByPeriodoUser = new Map<string, number>();
        for (const mg of mendelData) {
            if (!mg.periodo || !mg.usuario) continue;
            const userNorm = String(mg.usuario).trim().toLowerCase();
            const key = `${mg.periodo}_${userNorm}`;
            mendelByPeriodoUser.set(key, (mendelByPeriodoUser.get(key) || 0) + (mg.importe || 0));
        }

        // --- Cargar costos de los snapshots ---
        const snapshotCosts = new Map<string, { costoRed: number; agentes: number; acDetail: any[] }>();
        
        try {
            const allSnaps = await loadAllSnapshots();
            for (const [periodCode, raw] of Object.entries(allSnaps)) {
                const match = periodCode.match(/^(\d{4})_(\d{2})$/);
                if (!match) continue;
                const key = `${match[1]}_${match[2]}`;
                const periodo = `${match[1]}${match[2]}`; // e.g. "202605"
                let costoRed = 0;
                const agentesSet = new Set<string>();
                const acDetail: any[] = [];
                for (const agent of raw) {
                    if (agent.asociadoComercial) agentesSet.add(agent.asociadoComercial);
                    const sueldoBruto = agent.sueldoBruto || 0;
                    // Buscar gastos Mendel para este AC en este período
                    const acNameNorm = String(agent.asociadoComercial || '').trim().toLowerCase();
                    const mendelKey = `${periodo}_${acNameNorm}`;
                    const gastosMkt = (agent.gastosMkt || 0) + (mendelByPeriodoUser.get(mendelKey) || 0);
                    const amortizacion = agent.amortizacioneDcac || 0;
                    const movilidad = agent.reintegroMovilidad || 0;
                    const costoTotal = sueldoBruto + gastosMkt + amortizacion + movilidad;
                    costoRed += costoTotal;
                    acDetail.push({
                        nombre: agent.asociadoComercial || 'Sin nombre',
                        codigo: agent.codigo || '',
                        tipo: agent.tipo || '',
                        oficina: agent.oficina || '',
                        provincia: agent.provincia || '',
                        cabezas: agent.cabezasGeneral || 0,
                        cabezasVenta: agent.cabzGenVenta || 0,
                        cabezasCompra: agent.cabzGenCompra || 0,
                        tropas: agent.tropasGeneral || 0,
                        importe: agent.importeGen || 0,
                        resultado: agent.resultado_final || 0,
                        sueldoBruto,
                        gastosMkt,
                        amortizacion,
                        movilidad,
                        costoTotal,
                        fijo: agent.fijo || 0,
                        variable: agent.variable_personal || 0,
                        categoria: agent.categoria || 0,
                    });
                }
                snapshotCosts.set(key, { costoRed, agentes: agentesSet.size, acDetail });
            }
        } catch (e: any) {
            console.warn('[metricas-red] Error al cargar los snapshots:', e.message);
        }

        // --- Procesar cada mes ---
        const months: any[] = [];
        
        for (const [monthKey, ops] of opsByMonth.entries()) {
            const [yearStr, monthStr] = monthKey.split('_');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            
            // Deduplicar por id_lote
            const unique = new Map<number, any>();
            for (const op of ops) {
                const id = op.id_lote || op.id;
                if (id && !unique.has(id)) {
                    unique.set(id, op);
                }
            }
            
            const canalKeys = ['REGIONAL', 'REPRESENTANTE', 'COMISIONISTA', 'DIRECTO'];
            let cabezas = 0, importe = 0, resultado = 0, bonificaciones = 0;
            const categorias: Record<string, number> = {};
            const canales: Record<string, { cabezas: number; tropas: number; importe: number; bonificaciones: number; reps: number; ccc: number; bonifPct: number }> = {
                REGIONAL: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
                REPRESENTANTE: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
                COMISIONISTA: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
                DIRECTO: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 }
            };
            const canalReps: Record<string, Set<string>> = {
                REGIONAL: new Set(), REPRESENTANTE: new Set(), COMISIONISTA: new Set(), DIRECTO: new Set()
            };
            const canalCabzVenta: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };
            const canalCabzCompra: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };
            const categoriasDetalle: Record<string, {
                totalCabezas: number;
                venta: Record<string, number>;
                compra: Record<string, number>;
                cruces: Record<string, number>;
            }> = {};

            for (const op of unique.values()) {
                const qty = Number(op.Cabezas || op.cantidad) || 0;
                const impVend = Number(op.importe_vendedor) || 0;
                const impComp = Number(op.importe_comprador) || 0;
                const bonVend = Number(op.bonificacion_vendedor) || 0;
                const bonComp = Number(op.bonificacion_comprador) || 0;
                const resId = Number(op.resultado_final || op.resultado_total_proyectado) || 0;
                
                cabezas += qty;
                importe += impVend;
                resultado += resId;
                bonificaciones += bonVend + bonComp;
                
                const tipoOp = String(op.Tipo || op.tipo_negocio || '').toUpperCase().trim();
                const cat = tipoOp || 'OTROS';
                categorias[cat] = (categorias[cat] || 0) + qty;

                // Clasificar canales (misma lógica que engine.ts)
                const { cVenta, cCompra, acVendRaw, acCompRaw } = await resolveOpChannels(op);

                // Cruces por categoría
                [cat, 'OVERALL'].forEach(cName => {
                    if (!categoriasDetalle[cName]) {
                        categoriasDetalle[cName] = {
                            totalCabezas: 0,
                            venta: { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 },
                            compra: { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 },
                            cruces: {}
                        };
                    }
                    const cd = categoriasDetalle[cName];
                    cd.totalCabezas += qty;
                    cd.venta[cVenta] = (cd.venta[cVenta] || 0) + qty;
                    cd.compra[cCompra] = (cd.compra[cCompra] || 0) + qty;
                    const cruceKey = `${cVenta} - ${cCompra}`;
                    cd.cruces[cruceKey] = (cd.cruces[cruceKey] || 0) + qty;
                });

                // Asignación por canal
                canalKeys.forEach(ck => {
                    const isV = cVenta === ck;
                    const isC = cCompra === ck;
                    if (isV || isC) {
                        const cData = canales[ck];
                        cData.cabezas += qty;
                        cData.tropas += 1;
                        if (isV) {
                            cData.importe += impVend;
                            cData.bonificaciones += bonVend;
                            canalCabzVenta[ck] += qty;
                            if (acVendRaw) canalReps[ck].add(String(acVendRaw).trim());
                        }
                        if (isC) {
                            cData.importe += impComp;
                            cData.bonificaciones += bonComp;
                            canalCabzCompra[ck] += qty;
                            if (acCompRaw) canalReps[ck].add(String(acCompRaw).trim());
                        }
                    }
                });
            }

            // Calcular CCC real: Concretada / (Concretada + No Concretada) solo en VENTA
            // Contar cabezas de venta TOTALES (concretadas + no concretadas) por canal
            const allOpsForMonth = allOpsByMonth.get(monthKey) || [];
            const allUniqueForCCC = new Map<number, any>();
            for (const op of allOpsForMonth) {
                const id = op.id_lote || op.id;
                if (id && !allUniqueForCCC.has(id)) {
                    allUniqueForCCC.set(id, op);
                }
            }
            const cccTotalVenta: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };
            for (const op of allUniqueForCCC.values()) {
                const qty = Number(op.Cabezas || op.cantidad) || 0;
                const { cVenta } = await resolveOpChannels(op);
                if (cVenta && cccTotalVenta.hasOwnProperty(cVenta)) {
                    cccTotalVenta[cVenta] += qty;
                }
            }

            // Calcular ratios por canal
            canalKeys.forEach(ck => {
                const cData = canales[ck];
                cData.reps = canalReps[ck].size;
                // CCC = cabezas venta concretadas / cabezas venta totales (conc + no conc)
                cData.ccc = cccTotalVenta[ck] > 0 ? (canalCabzVenta[ck] / cccTotalVenta[ck]) : 0;
                cData.bonifPct = cData.importe > 0 ? (cData.bonificaciones / cData.importe) : 0;
            });

            const snap = snapshotCosts.get(monthKey) || { costoRed: 0, agentes: 0, acDetail: [] };
            const ratioCosto = (importe + bonificaciones) > 0 ? snap.costoRed / (importe + bonificaciones) : 0;
            
            months.push({
                year, month,
                monthName: MONTHS_ES[month - 1] || '',
                anioMes: year * 100 + month,
                tropas: unique.size,
                cabezas,
                importe,
                resultado,
                bonificaciones,
                costoRed: snap.costoRed,
                ratioCosto,
                agentes: snap.agentes,
                acDetail: snap.acDetail,
                categorias,
                canales,
                categoriasDetalle,
            });
        }
        
        // Sort desc
        months.sort((a, b) => b.anioMes - a.anioMes);
        
        // Calcular totales anuales
        const yearTotals: Record<number, any> = {};
        for (const m of months) {
            if (!yearTotals[m.year]) yearTotals[m.year] = { tropas: 0, cabezas: 0, importe: 0, resultado: 0, bonificaciones: 0, costoRed: 0, meses: 0 };
            yearTotals[m.year].tropas += m.tropas;
            yearTotals[m.year].cabezas += m.cabezas;
            yearTotals[m.year].importe += m.importe;
            yearTotals[m.year].resultado += m.resultado;
            yearTotals[m.year].bonificaciones += m.bonificaciones;
            yearTotals[m.year].costoRed += m.costoRed;
            yearTotals[m.year].meses += 1;
            yearTotals[m.year].ratioCosto = (yearTotals[m.year].importe + yearTotals[m.year].bonificaciones) > 0 ? yearTotals[m.year].costoRed / (yearTotals[m.year].importe + yearTotals[m.year].bonificaciones) : 0;
        }
        
        res.json({ months, yearTotals });
    } catch (e: any) {
        console.error('[metricas-red] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para obtener las métricas de PLM (Share y Resultados regionales por UN)
router.get('/metricas-plm', async (req, res) => {
    try {
        const data = await fetchQ95();
        const UN_LIST = ['Faena', 'Invernada', 'Invernada Neo', 'Cria', 'MAG'];

        // Estructura: year_month -> UN -> metrics
        const results: Record<string, Record<string, {
            totalCabezas: number;
            regionalCabezas: number;
            resultadoFinal: number;
            importeRegional: number;
            importeTotal: number;
        }>> = {};

        const normalizeUn = (unRaw: string): string => {
            const un = unRaw.toLowerCase().trim();
            if (un.includes('faena')) return 'Faena';
            if (un === 'invernada neo') return 'Invernada Neo';
            if (un.includes('invernada')) return 'Invernada';
            if (un.includes('cria') || un.includes('cría')) return 'Cria';
            if (un.includes('mag')) return 'MAG';
            return 'Otros';
        };

        for (const row of data) {
            const estado = String(row.ESTADO || row.estado || '').trim().toUpperCase();
            if (estado !== 'CONCRETADA') {
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

            const mappedUn = normalizeUn(String(row.UN || row.un || ''));
            if (!UN_LIST.includes(mappedUn)) continue;

            if (!results[period]) {
                results[period] = {};
                for (const un of UN_LIST) {
                    results[period][un] = {
                        totalCabezas: 0,
                        regionalCabezas: 0,
                        resultadoFinal: 0,
                        importeRegional: 0,
                        importeTotal: 0
                    };
                }
            }

            const cabezas = Number(row.Cabezas || row.cantidad) || 0;
            const canalVenta = String(row.Canal_Venta || row.canal_venta || '').trim().toUpperCase();
            const importeVendedor = Number(row.importe_vendedor || 0);
            const resultado = Number(row.resultado_final || row.resultado_final_ajustado || 0);
            const isRegionalVenta = canalVenta === 'REGIONAL';

            const unData = results[period][mappedUn];
            
            unData.totalCabezas += cabezas;
            unData.importeTotal += importeVendedor;
            
            if (isRegionalVenta) {
                unData.regionalCabezas += cabezas;
                unData.importeRegional += importeVendedor;
                unData.resultadoFinal += resultado;
            }
        }

        const monthsData: any[] = [];
        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        for (const [period, unMap] of Object.entries(results)) {
            const year = parseInt(period.substring(0, 4));
            const month = parseInt(period.substring(4, 6));
            if (isNaN(year) || isNaN(month)) continue;

            monthsData.push({
                year,
                month,
                monthName: MONTHS_ES[month - 1] || '',
                periodId: period,
                unData: unMap
            });
        }

        monthsData.sort((a, b) => parseInt(b.periodId) - parseInt(a.periodId));

        res.json({
            unList: UN_LIST,
            months: monthsData
        });
    } catch (e: any) {
        console.error('[metricas-plm] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// 🔴 Costo de mínimos garantizados en toda la red 🔴
router.get('/minimos-red', async (req, res) => {
    try {
        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const months: any[] = [];

        try {
            const allSnaps = await loadAllSnapshots();
            for (const [periodCode, agents] of Object.entries(allSnaps)) {
                try {
                    const parts = periodCode.split('_');
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10);

                    // Filtrar agentes (excluir tipo Oficina)
                    const agentesRed = agents.filter(a => a.tipo !== 'Oficina');

                    // Agentes que cayeron al mínimo: variable_personal === 0, modalidad no es 'Sin minimo' ni 'Fijo'
                    const enMinimo = agentesRed.filter(a =>
                        a.variable_personal === 0 &&
                        a.modalidad !== 'Sin minimo' &&
                        a.modalidad !== 'Fijo'
                    );

                    const agentesEnMinimo = enMinimo.length;
                    const totalAgentes = agentesRed.length;

                    const subsidioTotal = enMinimo.reduce((sum, a) => {
                        return sum + Math.max(0, (a.minimo || 0) - (a.componenteP || 0));
                    }, 0);

                    const sueldoBrutoTotal = agentesRed.reduce((sum, a) => sum + (a.sueldoBruto || 0), 0);

                    const pctEnMinimo = totalAgentes > 0 ? Math.round((agentesEnMinimo / totalAgentes) * 1000) / 1000 : 0;

                    const detalle = enMinimo.map(a => ({
                        nombre: a.asociadoComercial,
                        codigo: a.codigo,
                        provincia: a.provincia,
                        oficina: a.oficina,
                        categoria: a.categoria,
                        modalidad: a.modalidad,
                        minimo: a.minimo || 0,
                        componenteP: a.componenteP || 0,
                        subsidio: Math.max(0, (a.minimo || 0) - (a.componenteP || 0)),
                        cierreReal: a.cierreReal || 0
                    }));

                    months.push({
                        year,
                        month,
                        monthName: MONTHS_ES[month - 1] || '',
                        agentesEnMinimo,
                        totalAgentes,
                        subsidioTotal: Math.round(subsidioTotal),
                        sueldoBrutoTotal: Math.round(sueldoBrutoTotal),
                        pctEnMinimo,
                        detalle
                    });
                } catch (fileErr: any) {
                    console.warn(`[minimos-red] Error procesando ${periodCode}:`, fileErr.message);
                }
            }
        } catch (e: any) {
            console.error('[minimos-red] Error:', e.message);
            res.status(500).json({ error: e.message });
            return;
        }

        // Ordenar descendente por año+mes
        months.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

        res.json({ months });
    } catch (e: any) {
        console.error('[minimos-red] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});


export default router;
