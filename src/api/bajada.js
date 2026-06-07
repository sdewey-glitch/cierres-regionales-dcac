"use strict";
/**
 * bajada.ts
 * Comparación entre la "Bajada" (bajada vieja del sistema anterior)
 * y el snapshot actual de Metabase.
 *
 * Permite detectar tropas con diferencias de resultado y aplicar
 * los valores de la bajada para congelar cierres consistentes.
 *
 * Estructura de la hoja "Bajada":
 *   idx 0  = id_lote
 *   idx 4  = cantidad
 *   idx 21 = Tipo (Faena/Invernada)
 *   idx 24 = AC_Vendedor
 *   idx 25 = AC_Comprador
 *   idx 28 = Resultado_Topeado
 *   idx 33 = Fecha
 *   idx 34 = AñoMes (ej: 202606)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readBajada = readBajada;
exports.loadAgentDataFromBajada = loadAgentDataFromBajada;
const express_1 = __importDefault(require("express"));
const sheets_1 = require("./sheets");
const snapshot_1 = require("../core/snapshot");
const env_1 = require("../config/env");
const calculator_1 = require("../core/calculator");
const router = express_1.default.Router();
const BAJADA_SHEET = 'Bajada';
// ── Helpers de columna ───────────────────────────────────────────────────────
const col = (row, idx) => String(row[idx] ?? '').trim();
const num = (row, idx) => {
    const raw = row[idx];
    if (raw === null || raw === undefined || raw === '')
        return 0;
    // Si ya es un número (Google Sheets API devuelve floats crudos, ej: 1595781.41)
    if (typeof raw === 'number')
        return raw;
    const s = String(raw).trim();
    if (!s)
        return 0;
    // Si tiene coma (formato argentino "1.595.781,41"): quitar puntos de miles, reemplazar coma
    if (s.includes(',')) {
        return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Si no tiene coma (número como string "1595781.41"): parsear directo sin tocar el punto
    return parseFloat(s) || 0;
};
async function readBajada(sheetName = BAJADA_SHEET, filterYear, filterMonth) {
    const rows = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `'${sheetName}'!A:AU`);
    if (!rows || rows.length < 2)
        throw new Error(`Hoja "${sheetName}" vacía o no encontrada`);
    const map = new Map();
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const idLote = parseInt(col(r, 0));
        if (!idLote || isNaN(idLote))
            continue;
        // Filtrar por AñoMes (idx 33 = AH = AñoMes del período de operación)
        // IMPORTANTE: La columna AH contiene el período en formato YYYYMM (ej: 202605 = mayo 2026).
        // readSheet usa UNFORMATTED_VALUE, así que puede venir como:
        //   a) Número YYYYMM (ej: 202605) — identificable porque >= 100000
        //   b) String texto "YYYY-MM-DD" (si la celda está formateada como texto)
        //   c) Número serial de Google Sheets (40000-99999, días desde 1899-12-30)
        if (filterYear !== undefined && filterMonth !== undefined) {
            const fechaRaw = r[33];
            let rowYear, rowMonth;
            if (typeof fechaRaw === 'number' && !isNaN(fechaRaw) && fechaRaw >= 100000) {
                // Formato YYYYMM (ej: 202605 = mayo 2026, 202606 = junio 2026)
                rowYear = Math.floor(fechaRaw / 100);
                rowMonth = fechaRaw % 100;
            }
            else if (typeof fechaRaw === 'string' && fechaRaw.includes('-')) {
                // Formato texto: "2026-05-29"
                const parts = fechaRaw.split('-');
                rowYear = parseInt(parts[0]);
                rowMonth = parseInt(parts[1]);
            }
            else if (typeof fechaRaw === 'number' && !isNaN(fechaRaw) && fechaRaw > 40000) {
                // Número serial de Google Sheets (días desde 1899-12-30)
                const date = new Date((fechaRaw - 25569) * 86400 * 1000);
                rowYear = date.getUTCFullYear();
                rowMonth = date.getUTCMonth() + 1;
            }
            if (rowYear !== undefined && rowMonth !== undefined) {
                if (rowYear !== filterYear || rowMonth !== filterMonth)
                    continue;
            }
            // Si no se pudo parsear la fecha, se incluye el lote (mejor incluir que excluir)
        }
        const resultado = num(r, 28); // Resultado_Topeado (col AC)
        const existing = map.get(idLote);
        if (existing) {
            existing.filas++;
            if (col(r, 24) && !existing.acVendedor)
                existing.acVendedor = col(r, 24);
            if (col(r, 25) && !existing.acComprador)
                existing.acComprador = col(r, 25);
            if (col(r, 26) && !existing.provACVend)
                existing.provACVend = col(r, 26);
            if (col(r, 27) && !existing.provACComp)
                existing.provACComp = col(r, 27);
            if (col(r, 31) && !existing.ofVendedora)
                existing.ofVendedora = col(r, 31);
            if (col(r, 32) && !existing.ofCompradora)
                existing.ofCompradora = col(r, 32);
        }
        else {
            map.set(idLote, {
                id_lote: idLote,
                tipo: col(r, 21),
                cantidad: num(r, 4),
                fecha: col(r, 33),
                añoMes: col(r, 34),
                acVendedor: col(r, 24),
                acComprador: col(r, 25),
                provACVend: col(r, 26), // AA - Prov_AC_Vendedor
                provACComp: col(r, 27), // AB - Prov_AC_Comprador
                ofVendedora: col(r, 31), // AF - Ofi_Vendedora
                ofCompradora: col(r, 32), // AG - Ofi_Compradora
                resultadoTopeado: resultado,
                filas: 1,
            });
        }
    }
    return map;
}
// ── Construir CommercialResult desde Bajada para un agente ───────────────────
// Toma el snapshot del agente como base de configuración (escala, mínimo,
// ajustes, movilidad, etc.) y reemplaza los resultados de tropa con los
// valores de la hoja "Bajada". Así el cierre queda = al que se usó para
// el envío del mes.
async function loadAgentDataFromBajada(year, month, agentName, sheetName = BAJADA_SHEET) {
    const [bajadaMap, snapshot] = await Promise.all([
        readBajada(sheetName, year, month), // solo lotes del período por fecha de operación
        (0, snapshot_1.loadMonthSnapshot)(year, month),
    ]);
    console.log(`[bajada] 📌 Mapa bajada cargado: ${bajadaMap.size} lotes para ${year}/${month}`);
    if (!snapshot)
        return null;
    const agentData = snapshot.find((d) => d.asociadoComercial?.toString().trim().toLowerCase() === agentName.trim().toLowerCase());
    if (!agentData)
        return null;
    // Deep clone para no mutar el snapshot
    const result = JSON.parse(JSON.stringify(agentData));
    const escala = result.escalaGen || 0;
    let resultadoFinalBajada = 0;
    let cabezasBajada = 0;
    let tropasBajadaSet = new Set();
    // Parchear cada tropa con el resultado de la bajada
    for (const op of (result.operacionesDetalle || [])) {
        const idLote = Number(op.id_lote);
        const bajadaLote = bajadaMap.get(idLote);
        if (bajadaLote) {
            // Usar resultado de la bajada
            const resultadoBajadaTotal = bajadaLote.resultadoTopeado;
            // En la Bajada, Resultado_Topeado es el resultado TOTAL del lote (100%).
            // La regla de reparto es: venta = 2/3, compra = 1/3.
            // Si fue agregado manualmente, respetar el rol asignado por el usuario
            // (basado en resultado_topeado_venta/compra del snapshot)
            let esVenta;
            let esCompra;
            if (op._addedManually) {
                esVenta = (op.resultado_topeado_venta || 0) > 0;
                esCompra = (op.resultado_topeado_compra || 0) > 0;
            }
            else {
                esVenta = op.comercial_venta?.toLowerCase() === agentName.toLowerCase();
                esCompra = op.comercial_compra?.toLowerCase() === agentName.toLowerCase();
            }
            const resVenta = Math.round(resultadoBajadaTotal * (2 / 3));
            const resCompra = Math.round(resultadoBajadaTotal * (1 / 3));
            if (esVenta && !esCompra) {
                // Solo venta → 2/3 del resultado total
                op.resultado_topeado_venta = resVenta;
                op.resultado_topeado_compra = 0;
                op.ganancia_personal_venta = Math.round(resVenta * escala);
                op.ganancia_personal_compra = 0;
            }
            else if (esCompra && !esVenta) {
                // Solo compra → 1/3 del resultado total
                op.resultado_topeado_venta = 0;
                op.resultado_topeado_compra = resCompra;
                op.ganancia_personal_venta = 0;
                op.ganancia_personal_compra = Math.round(resCompra * escala);
            }
            else {
                // En ambos lados → resultado completo (2/3 + 1/3)
                op.resultado_topeado_venta = resVenta;
                op.resultado_topeado_compra = resCompra;
                op.ganancia_personal_venta = Math.round(resVenta * escala);
                op.ganancia_personal_compra = Math.round(resCompra * escala);
            }
            const resultadoBajada = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
            resultadoFinalBajada += resultadoBajada;
            if (!tropasBajadaSet.has(idLote)) {
                tropasBajadaSet.add(idLote);
                cabezasBajada += bajadaLote.cantidad || op.cantidad || 0;
            }
            op._fromBajada = true; // marcar para trazabilidad
        }
        else {
            // El lote no está en la bajada → excluirlo del cálculo de este cierre
            op._fromBajada = false;
            op._excludedByBajada = true;
        }
    }
    // ── Guard: si el agente no tiene ningún lote en la bajada, retornar snapshot sin modificar ──
    // Esto ocurre cuando se usa source=bajada para agentes de otra región que no están cubiertos
    // por la bajada (ej: La Pampa, Entre Ríos). En ese caso no tiene sentido poner todo en cero.
    if (tropasBajadaSet.size === 0) {
        console.log(`[bajada] ⚠️ ${agentName}: sin lotes en bajada (mapa=${bajadaMap.size} lotes). Retornando snapshot sin modificar.`);
        return result;
    }
    // Filtrar operaciones: dejar solo las que están en la bajada
    result.operacionesDetalle = (result.operacionesDetalle || []).filter((op) => !op._excludedByBajada);
    // Recalcular totales usando SOLO las operaciones de la bajada
    result.resultado_final_ajustado = resultadoFinalBajada;
    result.cabezasGeneral = cabezasBajada || result.cabezasGeneral;
    result.tropasGeneral = tropasBajadaSet.size || result.tropasGeneral;
    // Recalcular escalaGen según las nuevas cabezas (puede haber cambiado por exclusiones/adiciones)
    const esOperario = (result.tipo || '').toLowerCase().includes('operario');
    const esFijo = (result.modalidad || '').toLowerCase() === 'fijo';
    let nuevaEscala;
    if (esOperario || esFijo) {
        nuevaEscala = 0.10;
    }
    else if ((result.escalasTexto || '') === 'Oficina') {
        nuevaEscala = await (0, calculator_1.getExactScale)(result.cabezasGeneral, 'escalaPersonal', year, month);
    }
    else {
        nuevaEscala = await (0, calculator_1.getExactScale)(result.cabezasGeneral, 'escalaAC', year, month);
    }
    result.escalaGen = nuevaEscala;
    // Recalcular componenteP con la escala actualizada
    result.componenteP = Math.round(result.resultado_final_ajustado * nuevaEscala);
    result.componentePAju = result.componenteP;
    result.variable_personal = result.componenteP;
    // Recalcular ganancia_personal por tropa con la nueva escala
    for (const op of (result.operacionesDetalle || [])) {
        if (op._fromBajada) {
            op.escala_aplicada = nuevaEscala;
            op.ganancia_personal_venta = Math.round((op.resultado_topeado_venta || 0) * nuevaEscala);
            op.ganancia_personal_compra = Math.round((op.resultado_topeado_compra || 0) * nuevaEscala);
        }
    }
    // Recalcular cierreReal (misma fórmula del engine)
    const totalComponentes = (result.componenteP || 0) + (result.componenteR || 0) + (result.componenteO || 0);
    const isOperarioCarga = (result.tipo || '').toLowerCase().includes('operario');
    const sueldoFinal = isOperarioCarga
        ? (result.minimo || 0) + (result.componenteP || 0) + (result.ajustes || 0)
        : Math.max(result.minimo || 0, totalComponentes + (result.ajustes || 0));
    let reintegroNeto = result.reintegroMovilidad || 0;
    if (reintegroNeto > 0)
        reintegroNeto -= (result.gastosMendelMovilidad || 0);
    let ajusteEspecial = 0;
    if (result.asociadoComercial.toLowerCase() === 'pablo cieri') {
        ajusteEspecial = (result.componenteP || 0) * -0.20;
    }
    result.cierreReal = Math.round(sueldoFinal + reintegroNeto - (result.amortizacioneDcac || 0) + ajusteEspecial);
    // ── Recalcular bloque REGIONAL desde la bajada ──────────────────────────────
    //
    // Según biblia_planilla.md (secc. 4 - Arquitectura de Bolsas):
    //   Regional = todos los lotes cuyos ACs pertenecen a la misma Provincia
    //              (columna AA=Prov_AC_Ve idx26, AB=Prov_AC_Co idx27)
    //   Oficina  = sólo tropas directas del pseudo-usuario "Oficina X"
    //              (columnas AF=Ofi_Vendedora idx31, AG=Ofi_Compradora idx32
    //               donde el valor coincide con result.oficina)
    //
    // El bajadaMap ya está filtrado por período (targetAñoMes).
    const provinciaNombre = (result.provincia || '').trim().toLowerCase();
    const oficinaNombre = (result.oficina || '').trim().toLowerCase();
    if (provinciaNombre) {
        // ── REGIONAL: filtrar por provincia del AC (AA o AB) ────────────────
        let regTropas = 0, regCabezas = 0, regResultado = 0;
        let regResInv = 0, regCabInv = 0, regResFaena = 0, regCabFaena = 0;
        let regResCria = 0, regCabCria = 0, regResMag = 0, regCabMag = 0;
        let regResNeo = 0, regCabNeo = 0;
        for (const [, lote] of bajadaMap) {
            const pVend = (lote.provACVend || '').trim().toLowerCase();
            const pComp = (lote.provACComp || '').trim().toLowerCase();
            if (pVend !== provinciaNombre && pComp !== provinciaNombre)
                continue;
            regTropas++;
            regCabezas += lote.cantidad;
            regResultado += lote.resultadoTopeado;
            const tipoLow = (lote.tipo || '').toLowerCase();
            if (tipoLow.includes('neo')) {
                regResNeo += lote.resultadoTopeado;
                regCabNeo += lote.cantidad;
            }
            else if (tipoLow.includes('invernada')) {
                regResInv += lote.resultadoTopeado;
                regCabInv += lote.cantidad;
            }
            else if (tipoLow.includes('faena')) {
                regResFaena += lote.resultadoTopeado;
                regCabFaena += lote.cantidad;
            }
            else if (tipoLow.includes('cria') || tipoLow.includes('cría')) {
                regResCria += lote.resultadoTopeado;
                regCabCria += lote.cantidad;
            }
            else {
                regResMag += lote.resultadoTopeado;
                regCabMag += lote.cantidad;
            }
        }
        result.tropasRegional = regTropas;
        result.cabezasRegional = regCabezas;
        result.resultadoReg = regResultado;
        result.resInvReg = regResInv;
        result.cabInvReg = regCabInv;
        result.resFaenaReg = regResFaena;
        result.cabFaenaReg = regCabFaena;
        result.resCriaReg = regResCria;
        result.cabCriaReg = regCabCria;
        result.resMagReg = regResMag;
        result.cabMagReg = regCabMag;
        result.resInvNeoReg = regResNeo;
        result.cabInvNeoReg = regCabNeo;
        const bolsaScale = await (0, calculator_1.getExactScale)(regCabezas, 'escalaProvincial', year, month);
        result.bolsaRegion = bolsaScale;
        result.componenteR = Math.round(regResultado * bolsaScale * (result.tajadaRegion || 0));
        console.log(`[bajada] 🏢 Regional (${result.provincia}): tropas=${regTropas}, cab=${regCabezas}, res=${regResultado} → componenteR=${result.componenteR}`);
    }
    if (oficinaNombre) {
        // ── OFICINA: filtrar por oficina directa (AF/AG) ───────────────────
        let ofiTropas = 0, ofiCabezas = 0, ofiResultado = 0;
        let ofiResInv = 0, ofiCabInv = 0, ofiResFaena = 0, ofiCabFaena = 0;
        let ofiResCria = 0, ofiCabCria = 0, ofiResMag = 0, ofiCabMag = 0;
        let ofiResNeo = 0, ofiCabNeo = 0;
        for (const [, lote] of bajadaMap) {
            const ofVend = (lote.ofVendedora || '').trim().toLowerCase();
            const ofComp = (lote.ofCompradora || '').trim().toLowerCase();
            // Sólo donde la OFICINA es la que opera (pseudo-usuario directo)
            if (ofVend !== oficinaNombre && ofComp !== oficinaNombre)
                continue;
            ofiTropas++;
            ofiCabezas += lote.cantidad;
            ofiResultado += lote.resultadoTopeado;
            const tipoLow = (lote.tipo || '').toLowerCase();
            if (tipoLow.includes('neo')) {
                ofiResNeo += lote.resultadoTopeado;
                ofiCabNeo += lote.cantidad;
            }
            else if (tipoLow.includes('invernada')) {
                ofiResInv += lote.resultadoTopeado;
                ofiCabInv += lote.cantidad;
            }
            else if (tipoLow.includes('faena')) {
                ofiResFaena += lote.resultadoTopeado;
                ofiCabFaena += lote.cantidad;
            }
            else if (tipoLow.includes('cria') || tipoLow.includes('cría')) {
                ofiResCria += lote.resultadoTopeado;
                ofiCabCria += lote.cantidad;
            }
            else {
                ofiResMag += lote.resultadoTopeado;
                ofiCabMag += lote.cantidad;
            }
        }
        result.tropasOficina = ofiTropas;
        result.cabezasOfi = ofiCabezas;
        result.resultadoOfi = ofiResultado;
        result.resInvOfi = ofiResInv;
        result.cabInvOfi = ofiCabInv;
        result.resFaenaOfi = ofiResFaena;
        result.cabFaenaOfi = ofiCabFaena;
        result.resCriaOfi = ofiResCria;
        result.cabCriaOfi = ofiCabCria;
        result.resMagOfi = ofiResMag;
        result.cabMagOfi = ofiCabMag;
        result.resInvNeoOfi = ofiResNeo;
        result.cabInvNeoOfi = ofiCabNeo;
        const escalaOfi = await (0, calculator_1.getExactScale)(ofiCabezas, 'escalaOficina', year, month);
        result.escalaOficina = escalaOfi;
        result.componenteO = Math.round(ofiResultado * escalaOfi * (result.opOficina || 0));
        console.log(`[bajada] 🏢 Oficina (${result.oficina}): tropas=${ofiTropas}, cab=${ofiCabezas}, res=${ofiResultado} → componenteO=${result.componenteO}`);
    }
    console.log(`[bajada] ✅ ${agentName}: resultado_bajada=${result.resultado_final_ajustado} → componenteP=${result.componenteP} → cierreReal=${result.cierreReal}`);
    return result;
}
// ── GET /api/bajada/debug-lote/:id — ver valores raw de una fila ────────────
router.get('/bajada/debug-lote/:id', async (req, res) => {
    try {
        const idBuscado = Number(req.params.id);
        const rows = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `'Bajada'!A:AU`);
        if (!rows || rows.length < 2)
            return res.json({ error: 'Hoja vacía' });
        const header = rows[0] || [];
        const found = rows.filter((r, i) => i > 0 && Number(r[0]) === idBuscado);
        if (found.length === 0)
            return res.json({ error: `Lote ${idBuscado} no encontrado` });
        const resultado = [];
        for (const r of found) {
            const obj = {};
            header.forEach((h, i) => {
                const colName = String.fromCharCode(65 + (i >= 26 ? Math.floor(i / 26) - 1 : 0)) +
                    (i >= 26 ? String.fromCharCode(65 + (i % 26)) : String.fromCharCode(65 + i));
                obj[`${i}_${h || colName}`] = r[i];
            });
            // Mostrar específicamente los índices clave
            obj['__idx0_id_lote'] = r[0];
            obj['__idx4_cantidad'] = r[4];
            obj['__idx21_tipo'] = r[21];
            obj['__idx24_AC_Vend'] = r[24];
            obj['__idx25_AC_Comp'] = r[25];
            obj['__idx28_Res_Topeado_RAW'] = r[28];
            obj['__idx28_parsed'] = parseFloat(String(r[28] || '0').replace(/\./g, '').replace(',', '.'));
            obj['__idx12_resultado_total_RAW'] = r[12];
            obj['__idx16_resultado_final_RAW'] = r[16];
            resultado.push(obj);
        }
        res.json({ lote: idBuscado, filas: resultado });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ── GET /api/bajada/comparar?year=2026&month=5[&sheet=Bajada 2] ──────────────
router.get('/bajada/comparar', async (req, res) => {
    try {
        const year = Number(req.query.year);
        const month = Number(req.query.month);
        const sheetName = String(req.query.sheet || BAJADA_SHEET);
        if (!year || !month)
            return res.status(400).json({ error: 'Falta year o month' });
        const [bajadaMap, snapshot] = await Promise.all([
            readBajada(sheetName),
            (0, snapshot_1.loadMonthSnapshot)(year, month),
        ]);
        if (!snapshot)
            return res.status(404).json({ error: 'No hay snapshot para ese período' });
        // Construir mapa de snapshot: id_lote → { agente, resultadoTopeado, ... }
        const snapMap = new Map();
        for (const agentData of snapshot) {
            for (const op of (agentData.operacionesDetalle || [])) {
                const id = Number(op.id_lote);
                if (!snapMap.has(id)) {
                    snapMap.set(id, {
                        agente: agentData.asociadoComercial,
                        resultadoTopeado: (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0),
                        tipo: op.tipo || '',
                        cantidad: op.cantidad || 0,
                    });
                }
            }
        }
        // Comparar
        const diffs = [];
        const soloEnBajada = [];
        const soloEnSnapshot = [];
        for (const [idLote, lote] of bajadaMap) {
            const snap = snapMap.get(idLote);
            if (!snap) {
                const { id_lote: _skip, ...loteRest } = lote;
                soloEnBajada.push({ id_lote: idLote, ...loteRest });
                continue;
            }
            const delta = lote.resultadoTopeado - snap.resultadoTopeado;
            if (Math.abs(delta) > 1) { // tolerancia de $1 por redondeo
                diffs.push({
                    id_lote: idLote,
                    tipo: lote.tipo || snap.tipo,
                    cantidad: lote.cantidad || snap.cantidad,
                    fecha: lote.fecha,
                    acVendedor: lote.acVendedor,
                    acComprador: lote.acComprador,
                    agente: snap.agente,
                    resultado_bajada: Math.round(lote.resultadoTopeado),
                    resultado_snapshot: Math.round(snap.resultadoTopeado),
                    delta: Math.round(delta),
                    delta_pct: snap.resultadoTopeado !== 0
                        ? ((delta / Math.abs(snap.resultadoTopeado)) * 100).toFixed(1) + '%'
                        : 'N/A',
                });
            }
        }
        for (const [idLote, snap] of snapMap) {
            if (!bajadaMap.has(idLote)) {
                const { ...snapRest } = snap;
                soloEnSnapshot.push({ id_lote: idLote, ...snapRest });
            }
        }
        res.json({
            resumen: {
                totalEnBajada: bajadaMap.size,
                totalEnSnapshot: snapMap.size,
                conDiferencias: diffs.length,
                soloEnBajada: soloEnBajada.length,
                soloEnSnapshot: soloEnSnapshot.length,
            },
            diferencias: diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
            soloEnBajada,
            soloEnSnapshot,
        });
    }
    catch (e) {
        console.error('[bajada/comparar]', e.message);
        res.status(500).json({ error: e.message });
    }
});
// ── POST /api/bajada/aplicar — usar valores de bajada para congelar ──────────
// Recalcula la ganancia de cada agente usando el Resultado_Topeado de la bajada
// y actualiza Historico_Cierres + Historico_Tropas
router.post('/bajada/aplicar', async (req, res) => {
    try {
        const { year, month, agentNames } = req.body; // agentNames = array o null (todos)
        if (!year || !month)
            return res.status(400).json({ error: 'Falta year o month' });
        const [bajadaMap, snapshot] = await Promise.all([
            readBajada(),
            (0, snapshot_1.loadMonthSnapshot)(Number(year), Number(month)),
        ]);
        if (!snapshot)
            return res.status(404).json({ error: 'No hay snapshot para ese período' });
        const resultados = [];
        for (const agentData of snapshot) {
            const agente = agentData.asociadoComercial;
            if (agentNames && agentNames.length > 0 &&
                !agentNames.some((n) => n.toLowerCase() === agente.toLowerCase())) {
                continue;
            }
            const escala = agentData.escalaGen || 0;
            let componentePNuevo = 0;
            let cantidadActualizada = 0;
            const tropasActualizadas = [];
            const tropasNoEncontradas = [];
            for (const op of (agentData.operacionesDetalle || [])) {
                const idLote = Number(op.id_lote);
                const loteEnBajada = bajadaMap.get(idLote);
                if (loteEnBajada) {
                    const resultadoBajada = loteEnBajada.resultadoTopeado;
                    // Calcular ganancia personal proporcional según escala
                    // La bajada tiene el resultado topeado total del lote
                    // Determinamos qué parte corresponde a venta vs compra
                    const esVenta = op.comercial_venta?.toLowerCase() === agente.toLowerCase();
                    const esCompra = op.comercial_compra?.toLowerCase() === agente.toLowerCase();
                    const ganancia = Math.round(resultadoBajada * escala);
                    componentePNuevo += esVenta || esCompra ? ganancia : 0;
                    cantidadActualizada += loteEnBajada.cantidad || op.cantidad || 0;
                    tropasActualizadas.push({
                        id_lote: idLote,
                        resultado_bajada: resultadoBajada,
                        resultado_anterior: (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0),
                        ganancia,
                    });
                }
                else {
                    tropasNoEncontradas.push(idLote);
                }
            }
            resultados.push({
                agente,
                escala,
                componenteP_anterior: agentData.componenteP,
                componenteP_nuevo: componentePNuevo,
                delta: componentePNuevo - (agentData.componenteP || 0),
                tropasActualizadas: tropasActualizadas.length,
                tropasNoEncontradas,
            });
        }
        res.json({
            año: year,
            mes: month,
            resultados,
            mensaje: 'Simulación completada. Para aplicar los cambios, use /bajada/aplicar-confirmar'
        });
    }
    catch (e) {
        console.error('[bajada/aplicar]', e.message);
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
