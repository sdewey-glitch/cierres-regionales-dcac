"use strict";
/**
 * historico-cierres.ts
 *
 * Fuente de datos para cierres CONGELADOS en Google Sheets.
 * Al congelar se guardan todos los campos del reporte en dos hojas:
 *   - Historico_Cierres: un fila por agente/período (totales y parámetros)
 *   - Historico_Tropas: una fila por tropa (detalle para página 2)
 *
 * Al renderizar un cierre congelado se leen desde aquí en vez del snapshot JSON.
 * El usuario puede editar valores directamente en Sheets y el reporte se actualiza.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initHistoricSheets = initHistoricSheets;
exports.saveHistoricCierre = saveHistoricCierre;
exports.loadHistoricCierre = loadHistoricCierre;
exports.deleteHistoricCierre = deleteHistoricCierre;
exports.migrateExistingFrozenCierres = migrateExistingFrozenCierres;
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
// ── Nombres de hojas ────────────────────────────────────────────────────────
const SHEET_CIERRES = 'Historico_Cierres';
const SHEET_TROPAS = 'Historico_Tropas';
const RANGE_CIERRES = `'${SHEET_CIERRES}'!A:AJ`;
const RANGE_TROPAS = `'${SHEET_TROPAS}'!A:T`;
// ── Headers ─────────────────────────────────────────────────────────────────
const HEADERS_CIERRES = [
    'Periodo', 'Agente', 'Tipo', 'Provincia', 'Oficina', 'Codigo', 'Modalidad',
    'Total_Facturar', 'Minimo', 'Variable_Personal', 'Componente_Regional', 'Componente_Oficina',
    'Ajustes', 'Reintegro_Movilidad', 'Gastos_Mendel', 'Amortizacion_DCAC',
    'Cabezas', 'Tropas', 'Resultado_Empresa', 'Escala_Pct',
    'Tiene_Auto_Propio', 'Vehiculo_Tipo', 'Kms_Recorridos', 'Precio_Km',
    'ResInv', 'ResInvNeo', 'ResFaena', 'CabInv', 'CabInvNeo', 'CabFaena',
    'Grandes_Cuentas', 'Mermas', 'Activacion_CIS',
    'Gastos_Detalle_JSON', 'EscalaTexto', 'FechaCierre'
];
const HEADERS_TROPAS = [
    'Periodo_Cierre', 'Periodo_Tropa', 'ID_Lote', 'Agente',
    'Resultado', 'Ganancia', 'AC_Vendedor', 'AC_Comprador',
    'Tipo_Tropa', 'Cabezas', 'Sociedad_Vendedora', 'Sociedad_Compradora',
    'Fecha', 'Excluida', 'Escala_Pct', 'Importe_Vend', 'Importe_Comp',
    'Rend_Real', 'Rend_Topeado', 'Marca'
];
// ── Inicializar hojas ────────────────────────────────────────────────────────
async function initHistoricSheets() {
    await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, SHEET_CIERRES);
    await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, SHEET_TROPAS);
    // Escribir headers si la hoja está vacía
    const existing = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A1:A1`).catch(() => []);
    if (!existing || existing.length === 0 || !existing[0] || existing[0][0] !== 'Periodo') {
        await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A1`, [HEADERS_CIERRES]);
    }
    const existingT = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A1:A1`).catch(() => []);
    if (!existingT || existingT.length === 0 || !existingT[0] || existingT[0][0] !== 'Periodo_Cierre') {
        await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A1`, [HEADERS_TROPAS]);
    }
}
// ── Guardar cierre al congelar ───────────────────────────────────────────────
async function saveHistoricCierre(year, month, agentData) {
    const periodo = `${year}${String(month).padStart(2, '0')}`;
    // Fila principal del cierre
    const cierreRow = [
        periodo,
        agentData.asociadoComercial,
        agentData.tipo || '',
        agentData.provincia || '',
        agentData.oficina || '',
        agentData.codigo || '',
        agentData.modalidad || '',
        agentData.cierreReal || 0, // Total_Facturar (editable)
        agentData.minimo || 0, // Minimo (editable)
        agentData.variable_personal ?? agentData.componenteP ?? 0, // Variable_Personal (editable)
        agentData.componenteR || 0, // Componente_Regional (editable)
        agentData.componenteO || 0, // Componente_Oficina (editable)
        agentData.ajustes || 0, // Ajustes (editable)
        agentData.reintegroMovilidad || 0, // Reintegro_Movilidad (editable)
        agentData.gastosMendelMovilidad || 0, // Gastos_Mendel (editable)
        agentData.amortizacioneDcac || 0, // Amortizacion_DCAC (editable)
        agentData.cabezasGeneral || 0,
        agentData.tropasGeneral || 0,
        agentData.resultado_final_ajustado || 0,
        agentData.escalaGen != null ? Math.round(agentData.escalaGen * 10000) / 100 : 0,
        (agentData.reintegroMovilidad || 0) > 0 ? 'TRUE' : 'FALSE', // Tiene_Auto_Propio
        agentData.auto || '',
        agentData.kms || 0,
        agentData.precioPorKm || 0,
        agentData.resInv || 0,
        agentData.resInvNeo || 0,
        agentData.resFaena || 0,
        agentData.cabInv || 0,
        agentData.cabInvNeo || 0,
        agentData.cabFaena || 0,
        agentData.grandesCuentas || 0,
        agentData.mermas || 0,
        agentData.activacionCIS || 0,
        JSON.stringify(agentData.gastosDetalle || []), // Gastos como JSON
        agentData.escalasTexto || '',
        agentData.fechaCierre || new Date().toISOString(),
    ];
    // Filas de tropas
    const tropaRows = (agentData.operacionesDetalle || []).map(op => {
        const opYM = op.fecha_operacion
            ? op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7)
            : periodo;
        const ganancia = (op.comercial_venta?.toLowerCase() === agentData.asociadoComercial.toLowerCase() ? (op.ganancia_personal_venta || 0) : 0) +
            (op.comercial_compra?.toLowerCase() === agentData.asociadoComercial.toLowerCase() ? (op.ganancia_personal_compra || 0) : 0);
        return [
            periodo,
            opYM,
            op.id_lote,
            agentData.asociadoComercial,
            (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0),
            ganancia,
            op.comercial_venta || '',
            op.comercial_compra || '',
            op.tipo || '',
            op.cantidad || 0,
            op.sociedad_vendedora || '',
            op.sociedad_compradora || '',
            op.fecha_operacion?.substring(0, 10) || '',
            op.excluida ? 'TRUE' : 'FALSE',
            agentData.escalaGen != null ? Math.round(agentData.escalaGen * 10000) / 100 : 0,
            op.importe_vendedor || 0,
            op.importe_comprador || 0,
            op.rendimiento_real || 0,
            op.rendimiento_topeado || 0,
            op.marca || '',
        ];
    });
    // Escribir en paralelo (upsert: si ya existe la fila del cierre, reemplazarla)
    const existingCierres = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_CIERRES).catch(() => []);
    const existingIdx = (existingCierres || []).findIndex((r, i) => i > 0 &&
        String(r[0]) === periodo &&
        String(r[1]).toLowerCase() === agentData.asociadoComercial.toLowerCase());
    if (existingIdx > 0) {
        // Reemplazar fila existente (row index en sheets = existingIdx + 1 por header)
        const sheetRow = existingIdx + 1;
        await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A${sheetRow}`, [cierreRow]);
        console.log(`[historico] 🔄 Actualizado cierre de ${agentData.asociadoComercial} ${periodo} (fila ${sheetRow})`);
    }
    else {
        await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, RANGE_CIERRES, [cierreRow]);
    }
    // Tropas: eliminar las anteriores del mismo agente/período y reescribir
    if (tropaRows.length > 0) {
        const existingTropas = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_TROPAS).catch(() => []);
        if (existingTropas && existingTropas.length > 1) {
            const headers = existingTropas[0];
            const otherTropas = existingTropas.slice(1).filter(r => !(String(r[0]) === periodo && String(r[3]).toLowerCase() === agentData.asociadoComercial.toLowerCase()));
            await (0, sheets_1.clearSheetRange)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A2:T100000`).catch(() => { });
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A1`, [headers, ...otherTropas, ...tropaRows]);
        }
        else {
            await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, RANGE_TROPAS, tropaRows);
        }
    }
    console.log(`[historico] ✅ Cierre de ${agentData.asociadoComercial} ${periodo} guardado (${tropaRows.length} tropas)`);
}
// ── Leer cierre congelado desde Sheets ──────────────────────────────────────
async function loadHistoricCierre(year, month, agentName) {
    const periodo = `${year}${String(month).padStart(2, '0')}`;
    const [cierresData, tropasData] = await Promise.all([
        (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_CIERRES).catch(() => []),
        (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_TROPAS).catch(() => []),
    ]);
    if (!cierresData || cierresData.length < 2)
        return null;
    // Buscar fila del cierre (skip header row)
    const row = cierresData.slice(1).find(r => String(r[0]) === periodo &&
        String(r[1]).toLowerCase() === agentName.toLowerCase());
    if (!row)
        return null;
    // Parsear gastos desde JSON
    let gastosDetalle = [];
    try {
        gastosDetalle = JSON.parse(String(row[33] || '[]'));
    }
    catch {
        gastosDetalle = [];
    }
    // Parsear tropas
    const tropas = (tropasData || []).slice(1)
        .filter(r => String(r[0]) === periodo &&
        String(r[3]).toLowerCase() === agentName.toLowerCase() &&
        String(r[13]).toUpperCase() !== 'TRUE' // excluida = FALSE
    )
        .map(r => ({
        id_lote: Number(r[2]) || 0,
        tipo: String(r[8] || ''),
        fecha_operacion: String(r[12] || ''),
        sociedad_vendedora: String(r[10] || ''),
        sociedad_compradora: String(r[11] || ''),
        cantidad: Number(r[9]) || 0,
        categoria: '',
        comercial_venta: String(r[6] || ''),
        comercial_compra: String(r[7] || ''),
        bonificacion_vendedor: 0,
        bonificacion_comprador: 0,
        rendimiento_real: Number(r[17]) || 0,
        rendimiento_topeado: Number(r[18]) || 0,
        // r[4] = Resultado = total resultado_topeado_venta + resultado_topeado_compra guardado al congelar
        resultado_topeado_venta: Number(r[4]) || 0,
        resultado_topeado_compra: 0,
        escala_aplicada: Number(r[14]) / 100 || 0,
        ganancia_personal_venta: Number(r[5]) || 0,
        ganancia_personal_compra: 0,
        importe_vendedor: Number(r[15]) || 0,
        importe_comprador: Number(r[16]) || 0,
        resultado_id: 0,
        marca: String(r[19] || ''),
    }));
    // Incluir también tropas excluidas (con flag)
    const todasTropas = (tropasData || []).slice(1)
        .filter(r => String(r[0]) === periodo &&
        String(r[3]).toLowerCase() === agentName.toLowerCase())
        .map(r => ({
        id_lote: Number(r[2]) || 0,
        tipo: String(r[8] || ''),
        fecha_operacion: String(r[12] || ''),
        sociedad_vendedora: String(r[10] || ''),
        sociedad_compradora: String(r[11] || ''),
        cantidad: Number(r[9]) || 0,
        categoria: '',
        comercial_venta: String(r[6] || ''),
        comercial_compra: String(r[7] || ''),
        bonificacion_vendedor: 0,
        bonificacion_comprador: 0,
        rendimiento_real: Number(r[17]) || 0,
        rendimiento_topeado: Number(r[18]) || 0,
        // r[4] = Resultado total guardado al congelar
        resultado_topeado_venta: Number(r[4]) || 0,
        resultado_topeado_compra: 0,
        escala_aplicada: Number(r[14]) / 100 || 0,
        ganancia_personal_venta: Number(r[5]) || 0,
        ganancia_personal_compra: 0,
        importe_vendedor: Number(r[15]) || 0,
        importe_comprador: Number(r[16]) || 0,
        resultado_id: 0,
        marca: String(r[19] || ''),
        excluida: String(r[13]).toUpperCase() === 'TRUE',
    }));
    const escalaGen = Number(row[19]) / 100 || 0;
    const result = {
        asociadoComercial: String(row[1]),
        tipo: String(row[2] || ''),
        provincia: String(row[3] || ''),
        oficina: String(row[4] || ''),
        codigo: String(row[5] || ''),
        modalidad: String(row[6] || ''),
        fechaCierre: String(row[35] || ''),
        año: year,
        mes: month,
        añoMes: periodo,
        idUsuario: '',
        mail: '',
        partido: '',
        escalasTexto: String(row[34] || ''),
        categoria: 0,
        // Totales editables desde Sheets
        cierreReal: Number(row[7]) || 0,
        minimo: Number(row[8]) || 0,
        variable_personal: Number(row[9]) || 0,
        componenteP: Number(row[9]) || 0,
        componentePAju: Number(row[9]) || 0,
        componenteR: Number(row[10]) || 0,
        componenteO: Number(row[11]) || 0,
        ajustes: Number(row[12]) || 0,
        reintegroMovilidad: Number(row[13]) || 0,
        gastosMendelMovilidad: Number(row[14]) || 0,
        amortizacioneDcac: Number(row[15]) || 0,
        cabezasGeneral: Number(row[16]) || 0,
        tropasGeneral: Number(row[17]) || 0,
        resultado_final_ajustado: Number(row[18]) || 0,
        escalaGen,
        auto: String(row[21] || ''),
        kms: Number(row[22]) || 0,
        precioPorKm: Number(row[23]) || 0,
        resInv: Number(row[24]) || 0,
        resInvNeo: Number(row[25]) || 0,
        resFaena: Number(row[26]) || 0,
        resCria: 0,
        resMag: 0,
        cabInv: Number(row[27]) || 0,
        cabInvNeo: Number(row[28]) || 0,
        cabFaena: Number(row[29]) || 0,
        cabCria: 0,
        cabMag: 0,
        grandesCuentas: Number(row[30]) || 0,
        mermas: Number(row[31]) || 0,
        activacionCIS: Number(row[32]) || 0,
        gastosDetalle,
        // Componente regional
        tropasRegional: 0,
        cabezasRegional: 0,
        cabzRegVenta: 0,
        cabzRegCompra: 0,
        importeReg: 0,
        resultadoReg: 0,
        bolsaRegion: 0,
        tajadaRegion: 0,
        // Componente oficina
        tropasOficina: 0,
        cabezasOfi: 0,
        cabzRegOfi: 0,
        cabzOfiCompra: 0,
        importeOfi: 0,
        resultadoOfi: 0,
        escalaOficina: 0,
        opOficina: 0,
        // Otros
        cabzGenVenta: 0,
        cabzGenCompra: 0,
        importeGen: 0,
        resultado_final: 0,
        resultado_final_ajustado_regional_venta: 0,
        resultado_final_ajustado_regional_compra: 0,
        rendimientoGen: 0,
        cccGen: 0,
        socOpGen: 0,
        socOpOficina: 0,
        amortizacionAP: 0,
        gastosMovilidad: 0,
        gastosMkt: 0,
        gastosOficina: 0,
        cierreMesM3: 0,
        cierreMesM2: 0,
        cierreMesM1: 0,
        extras: 0,
        fijo: 0,
        sueldoBruto: 0,
        resultado: 0,
        operacionesIds: todasTropas.map(t => t.id_lote),
        operacionesDetalle: todasTropas,
    };
    return result;
}
// ── Eliminar cierre del historial (al descongelar) ───────────────────────────
async function deleteHistoricCierre(year, month, agentName) {
    const periodo = `${year}${String(month).padStart(2, '0')}`;
    // Limpiar Historico_Cierres
    const cierresData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_CIERRES).catch(() => []);
    if (cierresData && cierresData.length > 1) {
        const headers = cierresData[0];
        const remaining = cierresData.slice(1).filter(r => !(String(r[0]) === periodo && String(r[1]).toLowerCase() === agentName.toLowerCase()));
        const colCount = HEADERS_CIERRES.length;
        const endCol = String.fromCharCode(65 + colCount - 1); // A=65
        await (0, sheets_1.clearSheetRange)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A2:${endCol}100000`).catch(() => { });
        if (remaining.length > 0) {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A1`, [headers, ...remaining]);
        }
        else {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A1`, [headers]);
        }
    }
    // Limpiar Historico_Tropas
    const tropasData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, RANGE_TROPAS).catch(() => []);
    if (tropasData && tropasData.length > 1) {
        const headers = tropasData[0];
        const remaining = tropasData.slice(1).filter(r => !(String(r[0]) === periodo && String(r[3]).toLowerCase() === agentName.toLowerCase()));
        await (0, sheets_1.clearSheetRange)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A2:T100000`).catch(() => { });
        if (remaining.length > 0) {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A1`, [headers, ...remaining]);
        }
        else {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_TROPAS}'!A1`, [headers]);
        }
    }
    console.log(`[historico] 🗑️ Cierre de ${agentName} ${periodo} eliminado del historial`);
}
// ── Migrar cierres congelados existentes desde snapshot JSON ─────────────────
async function migrateExistingFrozenCierres(frozenList, loadSnapshot) {
    // Leer qué períodos+agentes ya están en Historico_Cierres
    const existing = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `'${SHEET_CIERRES}'!A:B`).catch(() => []);
    const existingSet = new Set((existing || []).slice(1).map(r => `${String(r[0])}_${String(r[1]).toLowerCase()}`));
    const migrated = [];
    const skipped = [];
    const errors = [];
    for (const { period, agentName } of frozenList) {
        // period viene como "2026_05" (con guion bajo)
        const parts = period.split('_');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const periodo = `${year}${String(month).padStart(2, '0')}`; // "202605"
        const key = `${periodo}_${agentName.toLowerCase()}`;
        if (existingSet.has(key)) {
            skipped.push(`${agentName} ${period}`);
            continue;
        }
        const snap = await loadSnapshot(year, month);
        if (!snap) {
            errors.push(`${agentName} ${period}: no hay snapshot`);
            continue;
        }
        const agentData = snap.find((r) => r.asociadoComercial?.toLowerCase() === agentName.toLowerCase());
        if (!agentData) {
            errors.push(`${agentName} ${period}: agente no en snapshot`);
            continue;
        }
        try {
            await saveHistoricCierre(year, month, agentData);
            migrated.push(`${agentName} ${period}`);
            console.log(`[historico] 📦 Migrado: ${agentName} ${period}`);
        }
        catch (e) {
            errors.push(`${agentName} ${period}: ${e.message}`);
            console.warn(`[historico] ⚠️ Error migrando ${agentName} ${period}:`, e.message);
        }
    }
    console.log(`[historico] 🏁 Migración completada: ${migrated.length} migrados, ${skipped.length} ya existían, ${errors.length} errores`);
    return { migrated, skipped, errors };
}
