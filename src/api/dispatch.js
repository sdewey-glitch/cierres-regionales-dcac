"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const env_1 = require("../config/env");
const sheets_1 = require("./sheets");
const pdf_template_1 = require("../core/pdf-template");
const engine_1 = require("../core/engine");
const snapshot_1 = require("../core/snapshot");
const writer_1 = require("../core/writer");
const historico_cierres_1 = require("../core/historico-cierres");
const bajada_1 = require("./bajada");
const calculator_1 = require("../core/calculator");
const router = express_1.default.Router();
// ── Config ──
const IS_VERCEL = !!process.env.VERCEL;
// Force Vercel dependency tracing to bundle ESM-only packages and their sub-dependencies
if (false) {
    // @ts-ignore
    require('@sparticuz/chromium');
    // @ts-ignore
    require('puppeteer-core');
}
const OVERRIDE_DIR = IS_VERCEL ? '/tmp/overrides' : path.join(__dirname, '..', '..', 'data', 'overrides');
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TEST_EMAIL = 'jsineriz@decampoacampo.com';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_MAIL_URL || '';
const ENVIO_SHEET = 'Envio_Reportes';
const HISTORIAL_SHEET = 'Historial_Envios';
/**
 * Auto-congela el cierre de un agente si no está ya congelado.
 * Llamado automáticamente al enviar mail de test o mail real.
 */
async function autoFreezeAgent(year, month, agentName) {
    try {
        const period = `${year}_${String(month).padStart(2, '0')}`;
        const añoMesCierre = `${year}${String(month).padStart(2, '0')}`;
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Cierres_Congelados');
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Ajustes Historico');
        // Verificar si ya está congelado
        const existingRows = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, "'Cierres_Congelados'!A2:C10000").catch(() => []);
        const alreadyFrozen = existingRows.some(r => String(r[0]) === period && String(r[1]).toLowerCase() === agentName.toLowerCase());
        if (alreadyFrozen) {
            console.log(`[auto-freeze] ❄️ ${agentName} ya estaba congelado para ${period}, skip`);
            return;
        }
        // 1. Registrar en Cierres_Congelados
        await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, "'Cierres_Congelados'!A:C", [
            [period, agentName, new Date().toISOString()]
        ]);
        // 2. Guardar tropas del mes actual + últimos 3 meses en Ajustes Historico
        const monthsToProcess = [];
        for (let i = 0; i <= 3; i++) {
            let targetMonth = month - i;
            let targetYear = year;
            while (targetMonth <= 0) {
                targetMonth += 12;
                targetYear -= 1;
            }
            monthsToProcess.push({ y: targetYear, m: targetMonth });
        }
        const allTropaRows = [];
        for (const { y, m } of monthsToProcess) {
            const snap = await (0, snapshot_1.loadMonthSnapshot)(y, m);
            if (!snap)
                continue;
            const agentResult = snap.find((r) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
            if (!agentResult?.operacionesDetalle)
                continue;
            for (const op of agentResult.operacionesDetalle) {
                const opYearMonth = op.fecha_operacion
                    ? op.fecha_operacion.substring(0, 4) + op.fecha_operacion.substring(5, 7)
                    : `${y}${String(m).padStart(2, '0')}`;
                const totalResultado = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
                let ganancia = 0;
                if (op.comercial_venta?.toLowerCase() === agentName.toLowerCase())
                    ganancia += op.ganancia_personal_venta || 0;
                if (op.comercial_compra?.toLowerCase() === agentName.toLowerCase())
                    ganancia += op.ganancia_personal_compra || 0;
                allTropaRows.push([
                    añoMesCierre,
                    opYearMonth,
                    op.id_lote,
                    totalResultado,
                    ganancia,
                    op.comercial_venta || '',
                    op.comercial_compra || '',
                    agentName
                ]);
            }
        }
        if (allTropaRows.length > 0) {
            await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, "'Ajustes Historico'!A:H", allTropaRows);
        }
        // Guardar también en Historico_Cierres para edición desde Sheets
        const snapFull = await (0, snapshot_1.loadMonthSnapshot)(year, month);
        const agentFull = snapFull?.find((r) => r.asociadoComercial.toLowerCase() === agentName.toLowerCase());
        if (agentFull) {
            await (0, historico_cierres_1.initHistoricSheets)().catch(() => { });
            await (0, historico_cierres_1.saveHistoricCierre)(year, month, agentFull).catch((e) => console.warn('[auto-freeze] ⚠️ Error en Historico_Cierres:', e.message));
        }
        console.log(`[auto-freeze] ✅ Cierre de ${agentName} congelado automáticamente tras envío (${allTropaRows.length} tropas en ${monthsToProcess.length} meses)`);
    }
    catch (e) {
        console.warn(`[auto-freeze] ⚠️ Error al auto-congelar ${agentName}:`, e.message);
        // No tiramos error — el envio ya fue exitoso, no queremos rollbackear por esto
    }
}
// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
/** Retorna la fecha y hora local de Argentina formateada amigablemente */
function getLocalTimestamp() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    return formatter.format(now).replace(',', '');
}
/** Lee el snapshot del mes y busca un agente por nombre.
 *  Si el agente está congelado, intenta leer desde Historico_Cierres (Sheets).
 *  Si no lo encuentra ahí (agentes congelados antes de esta feature), usa el snapshot JSON.
 */
async function getAgentData(year, month, agentName) {
    // Verificar si está congelado
    let isFrozen = false;
    const period = `${year}_${String(month).padStart(2, '0')}`;
    try {
        const frozenRows = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, "'Cierres_Congelados'!A2:C10000");
        isFrozen = (frozenRows || []).some(r => String(r[0]) === period && String(r[1]).toLowerCase() === agentName.trim().toLowerCase());
    }
    catch {
        isFrozen = false;
    }
    if (isFrozen) {
        // Intentar leer desde Historico_Cierres (nueva fuente de verdad)
        try {
            const historicData = await (0, historico_cierres_1.loadHistoricCierre)(year, month, agentName);
            if (historicData) {
                console.log(`[getAgentData] ❄️ Leyendo cierre congelado de Historico_Cierres: ${agentName} ${year}-${month}`);
                return historicData;
            }
        }
        catch (e) {
            console.warn(`[getAgentData] ⚠️ Error leyendo Historico_Cierres, fallback a snapshot JSON:`, e.message);
        }
        // Fallback: snapshot JSON (para cierres congelados antes de esta feature)
        console.log(`[getAgentData] 📦 Fallback a snapshot JSON para ${agentName} (no está en Historico_Cierres)`);
    }
    const data = await (0, snapshot_1.loadMonthSnapshot)(year, month);
    if (!data)
        return null;
    return data.find(d => d.asociadoComercial?.toString().trim().toLowerCase() === agentName.trim().toLowerCase()) || null;
}
/**
 * Recalcula escalaGen, componenteP y cierreReal para un agente
 * basándose en las cabezas ACTIVAS (excluye las tropas con excluida=true).
 * Llama después de aplicar cualquier exclusión o adición manual de tropas.
 */
async function recalcularEscalaAgente(agentData, year, month) {
    if (!agentData)
        return;
    // Recalcular cabezas y resultado sólo con las tropas activas
    const opsActivas = (agentData.operacionesDetalle || []).filter((op) => !op.excluida);
    let cabezasActivas = 0;
    let resultadoActivo = 0;
    const lotesSeen = new Set();
    for (const op of opsActivas) {
        const id = Number(op.id_lote);
        if (!lotesSeen.has(id)) {
            lotesSeen.add(id);
            cabezasActivas += Number(op.cantidad) || 0;
        }
        resultadoActivo += (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
    }
    // Determinar tipo de escala
    const esOperario = (agentData.tipo || '').toLowerCase().includes('operario');
    const esFijo = (agentData.modalidad || '').toLowerCase() === 'fijo';
    let nuevaEscala;
    if (esOperario || esFijo) {
        nuevaEscala = 0.10;
    }
    else if ((agentData.escalasTexto || '') === 'Oficina') {
        nuevaEscala = await (0, calculator_1.getExactScale)(cabezasActivas, 'escalaPersonal', year, month);
    }
    else {
        nuevaEscala = await (0, calculator_1.getExactScale)(cabezasActivas, 'escalaAC', year, month);
    }
    agentData.cabezasGeneral = cabezasActivas;
    agentData.tropasGeneral = lotesSeen.size;
    agentData.resultado_final_ajustado = resultadoActivo;
    agentData.escalaGen = nuevaEscala;
    agentData.componenteP = Math.round(resultadoActivo * nuevaEscala);
    agentData.componentePAju = agentData.componenteP;
    agentData.variable_personal = agentData.componenteP;
    // Actualizar ganancia_personal por tropa
    for (const op of opsActivas) {
        op.escala_aplicada = nuevaEscala;
        op.ganancia_personal_venta = Math.round((op.resultado_topeado_venta || 0) * nuevaEscala);
        op.ganancia_personal_compra = Math.round((op.resultado_topeado_compra || 0) * nuevaEscala);
    }
    // Recalcular cierreReal
    const totalComponentes = (agentData.componenteP || 0) + (agentData.componenteR || 0) + (agentData.componenteO || 0);
    const isOperarioCarga = (agentData.tipo || '').toLowerCase().includes('operario');
    const sueldoFinal = isOperarioCarga
        ? (agentData.minimo || 0) + (agentData.componenteP || 0) + (agentData.ajustes || 0)
        : Math.max(agentData.minimo || 0, totalComponentes + (agentData.ajustes || 0));
    let reintegroNeto = agentData.reintegroMovilidad || 0;
    if (reintegroNeto > 0)
        reintegroNeto -= (agentData.gastosMendelMovilidad || 0);
    let ajusteEspecial = 0;
    if (agentData.asociadoComercial.toLowerCase() === 'pablo cieri') {
        ajusteEspecial = (agentData.componenteP || 0) * -0.20;
    }
    agentData.cierreReal = Math.round(sueldoFinal + reintegroNeto - (agentData.amortizacioneDcac || 0) + ajusteEspecial);
}
/** Obtiene la configuración de envío para un agente específico, incluyendo ajustes manuales customizados */
async function getAgentConfig(year, month, agentName) {
    let configData = [];
    try {
        configData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
    }
    catch {
        return null;
    }
    const row = configData.find((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agentName.trim().toLowerCase());
    if (!row)
        return null;
    let defaultManualMonto = 0;
    const snapshot = await (0, snapshot_1.loadMonthSnapshot)(year, month);
    if (snapshot) {
        const agentSnap = snapshot.find(s => s.asociadoComercial?.toString().trim().toLowerCase() === agentName.trim().toLowerCase());
        if (agentSnap) {
            const totalRetro = agentSnap.retroactivosDetalle?.reduce((s, a) => s + a.ajusteComponenteP, 0) || 0;
            defaultManualMonto = Math.round(agentSnap.ajustesManuales !== undefined ? agentSnap.ajustesManuales : (agentSnap.ajustes - totalRetro));
        }
    }
    return {
        nombre: row[0] || '',
        codigo: row[1] || '',
        email: row[2] || '',
        enviar: (row[3] || '').toString().toLowerCase() === 'si',
        cc: row[4] || '',
        ultimoEnvio: row[5] || '',
        estado: row[6] || '',
        ajustesManualesMonto: row[7] !== undefined ? Number(row[7]) : defaultManualMonto,
        incluirAjustesManuales: row[8] !== undefined ? (row[8].toString().toLowerCase() === 'si') : true,
    };
}
/** Modifica los ajustes y totales del agente en base a su configuración de envío (ajustes opcionales / editados) */
function adjustAgentDataWithConfig(agentData, c) {
    if (!agentData)
        return;
    const totalRetro = agentData.retroactivosDetalle?.reduce((sum, a) => sum + a.ajusteComponenteP, 0) || 0;
    if (c.incluirAjustesManuales) {
        agentData.ajustes = totalRetro + Number(c.ajustesManualesMonto);
        agentData.ajustesManuales = Number(c.ajustesManualesMonto);
    }
    else {
        agentData.ajustes = totalRetro;
        agentData.ajustesManuales = 0;
    }
    const totalComponentes = agentData.componenteP + agentData.componenteR + agentData.componenteO;
    const isOperario = (agentData.tipo || '').toLowerCase().includes('operario');
    const sueldoFinal = isOperario
        ? (agentData.minimo || 0) + (agentData.componenteP || 0) + agentData.ajustes
        : Math.max(agentData.minimo, totalComponentes + agentData.ajustes);
    let reintegroNeto = agentData.reintegroMovilidad || 0;
    const tieneAutoPropio = (agentData.reintegroMovilidad || 0) > 0;
    if (tieneAutoPropio) {
        reintegroNeto = reintegroNeto - (agentData.gastosMendelMovilidad || 0);
    }
    let ajusteEspecial = 0;
    if (agentData.asociadoComercial.toLowerCase() === 'pablo cieri') {
        ajusteEspecial = agentData.componenteP * -0.20;
    }
    agentData.sueldoBruto = sueldoFinal;
    agentData.cierreReal = sueldoFinal + reintegroNeto - (agentData.amortizacioneDcac || 0) + ajusteEspecial;
}
async function generatePdfBuffer(agentData, overrideHtml) {
    const html = overrideHtml || (0, pdf_template_1.generateClosureHtml)(agentData);
    let browser;
    try {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        if (IS_VERCEL) {
            console.log("[generatePdfBuffer] Ejecutando en Vercel. Cargando @sparticuz/chromium y puppeteer-core...");
            const chromiumModule = await dynamicImport('@sparticuz/chromium');
            const puppeteerCoreModule = await dynamicImport('puppeteer-core');
            const chromium = chromiumModule.default || chromiumModule;
            const puppeteer = puppeteerCoreModule.default || puppeteerCoreModule;
            // Configurar path de ejecutables si no están listos
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        }
        else {
            console.log("[generatePdfBuffer] Ejecutando localmente. Cargando puppeteer estándar...");
            const puppeteerModule = await dynamicImport('puppeteer');
            const puppeteer = puppeteerModule.default || puppeteerModule;
            browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        }
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
        });
        await browser.close();
        return Buffer.from(pdfBuffer);
    }
    catch (e) {
        console.warn('Puppeteer/Chromium no está disponible:', e.message);
        if (browser)
            await browser.close().catch(() => { });
        return null;
    }
}
/**
 * Envía mail + guarda PDF en Drive via Apps Script web app
 * El Apps Script corre como el usuario → tiene cuota de Drive
 * En Vercel: manda htmlContent para que Apps Script genere el PDF vía DriveApp (o pdfBase64 si se generó local)
 */
async function sendViaAppsScript(params) {
    // Resolve which Apps Script URL to use based on sender
    let appScriptUrl = APPS_SCRIPT_URL;
    if (params.sender) {
        const senderKey = params.sender.trim().toLowerCase();
        const prefix = senderKey.split('@')[0].toUpperCase();
        const envVarName = `APPS_SCRIPT_MAIL_URL_${prefix}`;
        if (process.env[envVarName]) {
            appScriptUrl = process.env[envVarName];
            console.log(`[dispatch] Usando URL de Apps Script específica para remitente ${params.sender}: ${envVarName}`);
        }
    }
    if (!appScriptUrl) {
        return { success: false, error: 'APPS_SCRIPT_MAIL_URL no configurada en .env' };
    }
    try {
        const payload = {
            action: params.isTest ? 'test' : 'send',
            to: params.to,
            cc: params.cc || '',
            subject: params.subject,
            body: params.body,
            year: params.year,
            month: params.month,
            testEmail: params.testEmail || TEST_EMAIL,
        };
        // Adjuntar PDF como base64 (local o Vercel con chromium) o HTML para que Apps Script genere el PDF
        if (params.pdfBuffer) {
            payload.pdfBase64 = params.pdfBuffer.toString('base64');
            payload.pdfFileName = params.pdfFileName || 'cierre.pdf';
        }
        else if (params.htmlContent) {
            // Apps Script convierte HTML → PDF usando DriveApp
            payload.htmlContent = params.htmlContent;
            payload.pdfFileName = params.pdfFileName || 'cierre.pdf';
        }
        const response = await fetch(appScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            redirect: 'follow',
        });
        // Apps Script devuelve texto, a veces con redirect
        const text = await response.text();
        try {
            return JSON.parse(text);
        }
        catch {
            // Si la respuesta no es JSON (ej: página de auth de Google)
            return { success: false, error: `Respuesta inesperada del Apps Script: ${text.substring(0, 200)}` };
        }
    }
    catch (e) {
        return { success: false, error: `Error conectando con Apps Script: ${e.message}` };
    }
}
/** Genera el cuerpo del mail a partir del template */
function renderEmailBody(template, agentName, month, year, senderName) {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : 'Buenas tardes';
    const primerNombre = agentName.split(' ')[0];
    return template
        .replace(/\{saludo\}/g, saludo)
        .replace(/\{nombre\}/g, primerNombre)
        .replace(/\{mes\}/g, month)
        .replace(/\{año\}/g, year)
        .replace(/\{remitente_nombre\}/g, senderName.split(' ')[0]);
}
// ═══════════════════════════════════════════════
//  ENDPOINTS
// ═══════════════════════════════════════════════
/**
 * GET /api/dispatch/config — Carga config de envío + historial del mes
 */
router.get('/dispatch/config', async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month)
            return res.status(400).json({ error: 'year y month requeridos' });
        const y = Number(year), m = Number(month);
        const añoMes = `${y}${String(m).padStart(2, '0')}`;
        // Asegurar que las hojas existen (no-fatal si falla)
        try {
            await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, ENVIO_SHEET);
            await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, HISTORIAL_SHEET);
        }
        catch (sheetErr) {
            console.warn(`[dispatch] ⚠️ No se pudieron crear hojas: ${sheetErr.message}`);
        }
        // Leer config de envío
        let configData = [];
        try {
            configData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
        }
        catch (e) {
            console.warn('[dispatch] No se pudo leer config de envío:', e.message);
        }
        // Si está vacía, inicializar desde el snapshot
        if (configData.length <= 1) {
            const snapshot = await (0, snapshot_1.loadMonthSnapshot)(y, m);
            if (snapshot) {
                const header = ['Nombre', 'Codigo', 'Email', 'Enviar', 'CC', 'Ultimo_Envio', 'Estado', 'Ajustes_Manuales_Monto', 'Incluir_Ajustes_Manuales'];
                const rows = snapshot.map(r => {
                    const totalRetro = r.retroactivosDetalle?.reduce((s, a) => s + a.ajusteComponenteP, 0) || 0;
                    const defaultManualMonto = Math.round(r.ajustesManuales !== undefined ? r.ajustesManuales : (r.ajustes - totalRetro));
                    return [
                        r.asociadoComercial,
                        r.codigo,
                        r.mail || '',
                        'Si',
                        '',
                        '',
                        '',
                        defaultManualMonto,
                        'Si',
                    ];
                });
                await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A1`, [header, ...rows]);
                configData = [header, ...rows];
                console.log(`[dispatch] ✅ Hoja ${ENVIO_SHEET} inicializada con ${rows.length} comerciales`);
            }
        }
        let snapshot = await (0, snapshot_1.loadMonthSnapshot)(y, m) || [];
        // Parsear config (skip header)
        const envioConfig = configData.slice(1).map(row => {
            const agentName = row[0] || '';
            const agentSnap = snapshot.find(s => s.asociadoComercial === agentName);
            let defaultManualMonto = 0;
            if (agentSnap) {
                const totalRetro = agentSnap.retroactivosDetalle?.reduce((s, a) => s + a.ajusteComponenteP, 0) || 0;
                defaultManualMonto = Math.round(agentSnap.ajustesManuales !== undefined ? agentSnap.ajustesManuales : (agentSnap.ajustes - totalRetro));
            }
            return {
                nombre: agentName,
                codigo: row[1] || '',
                email: row[2] || '',
                enviar: (row[3] || '').toString().toLowerCase() === 'si',
                cc: row[4] || '',
                ultimoEnvio: row[5] || '',
                estado: row[6] || '',
                ajustesManualesMonto: row[7] !== undefined && row[7] !== '' ? Number(row[7]) : defaultManualMonto,
                incluirAjustesManuales: row[8] !== undefined && row[8] !== '' ? (row[8].toString().toLowerCase() === 'si') : true,
                pdfLink: '',
            };
        });
        // Leer historial y enriquecer config con último estado
        let historialData = [];
        try {
            historialData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`);
        }
        catch (e) {
            console.warn('[dispatch] No se pudo leer historial:', e.message);
        }
        const historial = historialData.slice(1)
            .filter(row => row[1] === añoMes)
            .map(row => ({
            timestamp: row[0] || '',
            añoMes: row[1] || '',
            comercial: row[2] || '',
            email: row[3] || '',
            cc: row[4] || '',
            remitente: row[5] || '',
            estado: row[6] || '',
            pdfLink: row[7] || '',
            emailId: row[8] || '',
        }));
        // Enriquecer config con último PDF link del historial
        for (const entry of historial) {
            const match = envioConfig.find(c => c.nombre === entry.comercial);
            if (match && entry.pdfLink) {
                match.pdfLink = entry.pdfLink;
            }
        }
        res.json({ config: envioConfig, historial });
    }
    catch (e) {
        console.error('[dispatch/config] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/dispatch/config — Guarda config de envío al sheet
 */
router.post('/dispatch/config', async (req, res) => {
    try {
        const { config: envioConfig, year, month } = req.body;
        if (!envioConfig)
            return res.status(400).json({ error: 'config requerida' });
        // 1. Guardar la configuración de envío en Envio_Reportes
        const header = ['Nombre', 'Codigo', 'Email', 'Enviar', 'CC', 'Ultimo_Envio', 'Estado', 'Ajustes_Manuales_Monto', 'Incluir_Ajustes_Manuales'];
        const rows = envioConfig.map((c) => [
            c.nombre, c.codigo, c.email,
            c.enviar ? 'Si' : 'No',
            c.cc || '', c.ultimoEnvio || '', c.estado || '',
            c.ajustesManualesMonto !== undefined ? Number(c.ajustesManualesMonto) : 0,
            c.incluirAjustesManuales ? 'Si' : 'No',
        ]);
        await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A1`, [header, ...rows]);
        // 2. Sincronizar ajustes manuales en la pestaña 'Ajustes' de HUB_CONFIGURACIONES_ID si se pasaron el año y mes
        if (year && month) {
            const targetYear = Number(year);
            const targetMonth = Number(month);
            const targetYearMonth = `${targetYear}${String(targetMonth).padStart(2, '0')}`;
            const configId = env_1.config.HUB_CONFIGURACIONES_ID;
            console.log(`[dispatch/config] Sincronizando ajustes manuales para ${targetYear}-${targetMonth} con la pestaña Ajustes...`);
            // Leer todos los ajustes manuales actuales
            const rawAjustes = await (0, sheets_1.readSheet)(configId, "'Ajustes'!A2:F");
            const otherAdjustments = [];
            const currentPeriodAdjustments = new Map();
            const currentPeriodMotivos = new Map();
            for (const row of rawAjustes) {
                if (!row[0])
                    continue;
                const rowYear = Number(row[0]);
                const rowMonth = Number(row[1]);
                const rowComercial = String(row[3] || '').trim();
                if (rowYear === targetYear && rowMonth === targetMonth) {
                    const key = rowComercial.toLowerCase();
                    currentPeriodAdjustments.set(key, Number(row[5]) || 0);
                    currentPeriodMotivos.set(key, String(row[4] || '').trim());
                }
                else {
                    otherAdjustments.push(row);
                }
            }
            // Construir la nueva lista de ajustes para el período actual
            const newCurrentAdjustments = [];
            let didChange = false;
            for (const c of envioConfig) {
                const key = c.nombre.toLowerCase();
                const newMonto = c.incluirAjustesManuales ? Number(c.ajustesManualesMonto || 0) : 0;
                const oldMonto = currentPeriodAdjustments.get(key) || 0;
                if (newMonto !== oldMonto) {
                    didChange = true;
                }
                if (newMonto !== 0) {
                    const motivo = currentPeriodMotivos.get(key) || 'Editado desde Envíos';
                    newCurrentAdjustments.push([
                        targetYear,
                        targetMonth,
                        targetYearMonth,
                        c.nombre,
                        motivo,
                        newMonto
                    ]);
                }
            }
            // Si se detectaron cambios, actualizar la pestaña Ajustes y regenerar el cierre
            if (didChange) {
                console.log(`[dispatch/config] Se detectaron cambios en los montos de Ajustes Manuales. Actualizando planilla...`);
                const allNewRows = [...otherAdjustments, ...newCurrentAdjustments];
                // Limpiar rango viejo
                await (0, sheets_1.clearSheetRange)(configId, "'Ajustes'!A2:F2000");
                // Reescribir
                if (allNewRows.length > 0) {
                    await (0, sheets_1.writeSheet)(configId, `'Ajustes'!A2:F${allNewRows.length + 1}`, allNewRows);
                }
                // Recalcular dinámicamente y guardar en el snapshot local
                console.log(`[dispatch/config] Recalculando snapshot de cierre para ${targetYear}-${targetMonth}...`);
                const results = await (0, engine_1.calculateDynamicMonth)(targetYear, targetMonth);
                const retros = await (0, engine_1.calculateRetroactiveAdjustments)(targetYear, targetMonth);
                // Guardar retroactivos en Sheets temporalmente? O quizÃ¡s no sea necesario guardarlo local.
                // En este script sÃ³lo procesamos y mostramos.
                // Si la lÃ³gica de retroactivos es la misma que engine.ts, el cierre es puramente en Sheets.
                // Comentado para evitar FS local.
                // const retroFile = path.join(SNAPSHOTS_DIR, `retro_${targetYear}_${String(targetMonth).padStart(2, '0')}.json`);
                // fs.writeFileSync(retroFile, JSON.stringify(retros, null, 2));
                // Consolidar manuales + retroactivos
                const ajustesPorAgente = new Map();
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
                    const isOperarioCarga = (res.tipo || '').toLowerCase().includes('operario');
                    const sueldoFinal = isOperarioCarga
                        ? (res.minimo || 0) + (res.componenteP || 0) + res.ajustes
                        : Math.max(res.minimo || 0, totalComponentes + res.ajustes);
                    res.cierreReal = sueldoFinal + reintegroNeto - (res.amortizacioneDcac || 0) + ajusteEspecial;
                }
                (0, snapshot_1.saveMonthSnapshot)(targetYear, targetMonth, results);
                try {
                    await (0, writer_1.updateDynamicSueldos)(targetYear, targetMonth, results);
                }
                catch (err) {
                    console.warn(`[dispatch/config] ⚠️ Error escribiendo cierre al Google Sheet: ${err.message}`);
                }
                console.log(`[dispatch/config] ✅ Cierre recalculado y guardado`);
            }
        }
        res.json({ success: true });
    }
    catch (e) {
        console.error('[dispatch/config] Error guardando config:', e.message);
        res.status(500).json({ error: e.message });
    }
});
/**
 * GET /api/dispatch/preview-pdf/:agent — Genera PDF y devuelve como descarga
 */
router.get('/dispatch/preview-pdf/:agent', async (req, res) => {
    try {
        const agentName = decodeURIComponent(req.params.agent);
        const { year, month } = req.query;
        if (!year || !month)
            return res.status(400).json({ error: 'year y month requeridos' });
        const src = String(req.query.source || '');
        const agentData = src === 'bajada' || src === 'bajada2'
            ? await (0, bajada_1.loadAgentDataFromBajada)(Number(year), Number(month), agentName, src === 'bajada2' ? 'Bajada 2' : 'Bajada')
            : await getAgentData(Number(year), Number(month), agentName);
        if (!agentData)
            return res.status(404).json({ error: `No se encontró datos para ${agentName}` });
        // Si es Metabase, recalcular escala según cabezas activas (considera exclusiones)
        if (src !== 'bajada' && src !== 'bajada2') {
            await recalcularEscalaAgente(agentData, Number(year), Number(month));
        }
        const c = await getAgentConfig(Number(year), Number(month), agentName);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }
        let pdfBuffer = await generatePdfBuffer(agentData);
        if (!pdfBuffer && IS_VERCEL) {
            console.log(`[dispatch/preview] Generando PDF en Vercel vía Apps Script para ${agentName}...`);
            const html = (0, pdf_template_1.generateClosureHtml)(agentData);
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'preview',
                    htmlContent: html,
                    pdfFileName: `${agentName} - Cierre.pdf`,
                    to: 'dummy@decampoacampo.com',
                    subject: 'Preview PDF',
                    body: 'Preview PDF'
                })
            });
            const result = await response.json();
            if (result.success && result.pdfBase64) {
                pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            }
            else {
                throw new Error(result.error || 'Error al generar vista previa del PDF en Apps Script');
            }
        }
        if (!pdfBuffer) {
            return res.status(500).json({ error: 'No se pudo generar el PDF' });
        }
        const mesNombre = MONTHS[Number(month) - 1];
        const fileName = `${agentName} - ${mesNombre} ${year}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.send(pdfBuffer);
    }
    catch (e) {
        console.error('[dispatch/preview] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
/**
 * GET /api/dispatch/preview-html/:agent — Devuelve el HTML final para el editor WYSIWYG
 */
router.get('/dispatch/preview', async (req, res) => {
    try {
        const agentName = String(req.query.agent);
        const { year, month } = req.query;
        if (!year || !month)
            return res.status(400).json({ error: 'year y month requeridos' });
        const src = String(req.query.source || '');
        const agentData = src === 'bajada' || src === 'bajada2'
            ? await (0, bajada_1.loadAgentDataFromBajada)(Number(year), Number(month), agentName, src === 'bajada2' ? 'Bajada 2' : 'Bajada')
            : await getAgentData(Number(year), Number(month), agentName);
        if (!agentData)
            return res.status(404).json({ error: `No se encontró datos para ${agentName}` });
        // Si es Metabase, recalcular escala según cabezas activas (considera exclusiones)
        if (src !== 'bajada' && src !== 'bajada2') {
            await recalcularEscalaAgente(agentData, Number(year), Number(month));
        }
        let c = null;
        try {
            c = await getAgentConfig(Number(year), Number(month), agentName);
        }
        catch (configErr) {
            console.warn('[preview] getAgentConfig falló, usando datos del snapshot:', configErr.message);
        }
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }
        // Check if there is already an override
        let finalHtml = '';
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        if (fs.existsSync(overrideFile)) {
            finalHtml = fs.readFileSync(overrideFile, 'utf8');
        }
        else {
            finalHtml = (0, pdf_template_1.generateClosureHtml)(agentData);
        }
        res.send(finalHtml);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * GET /api/dispatch/preview-html/:agent — Alias con param en la URL
 */
router.get('/dispatch/preview-html/:agent', async (req, res) => {
    try {
        const agentName = decodeURIComponent(req.params.agent);
        const { year, month } = req.query;
        if (!year || !month)
            return res.status(400).json({ error: 'year y month requeridos' });
        const src = String(req.query.source || '');
        const agentData = src === 'bajada' || src === 'bajada2'
            ? await (0, bajada_1.loadAgentDataFromBajada)(Number(year), Number(month), agentName, src === 'bajada2' ? 'Bajada 2' : 'Bajada')
            : await getAgentData(Number(year), Number(month), agentName);
        if (!agentData)
            return res.status(404).send(`<html><body style="font-family:sans-serif;padding:24px;color:#c0392b"><h3>⚠️ No se encontraron datos para ${agentName}</h3><p>El agente no está en el snapshot del período ${year}-${month}. Hacé clic en <strong>Actualizar</strong> para regenerar el cierre.</p></body></html>`);
        // Si es Metabase, recalcular escala según cabezas activas (considera exclusiones)
        if (src !== 'bajada' && src !== 'bajada2') {
            await recalcularEscalaAgente(agentData, Number(year), Number(month));
        }
        let c2 = null;
        try {
            c2 = await getAgentConfig(Number(year), Number(month), agentName);
        }
        catch (configErr) {
            console.warn('[preview-html] getAgentConfig falló, usando datos del snapshot:', configErr.message);
        }
        if (c2) {
            adjustAgentDataWithConfig(agentData, c2);
        }
        let finalHtml = '';
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        if (fs.existsSync(overrideFile)) {
            finalHtml = fs.readFileSync(overrideFile, 'utf8');
        }
        else {
            finalHtml = (0, pdf_template_1.generateClosureHtml)(agentData);
        }
        res.send(finalHtml);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/dispatch/override/:agent — Guarda el HTML modificado a mano
 */
router.post('/dispatch/override/:agent', async (req, res) => {
    try {
        const agentName = decodeURIComponent(req.params.agent);
        const year = req.body.year || req.query.year;
        const month = req.body.month || req.query.month;
        const html = req.body.html;
        if (!year || !month || !html)
            return res.status(400).json({ error: 'Faltan parámetros' });
        if (!fs.existsSync(OVERRIDE_DIR)) {
            fs.mkdirSync(OVERRIDE_DIR, { recursive: true });
        }
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        fs.writeFileSync(overrideFile, html, 'utf8');
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/dispatch/test — Genera PDF, sube a Drive via Apps Script, manda mail de test
 */
router.post('/dispatch/test', async (req, res) => {
    try {
        const { agent, year, month, sender, senderName, template } = req.body;
        if (!agent || !year || !month)
            return res.status(400).json({ error: 'Faltan parámetros' });
        const mesNombre = MONTHS[month - 1];
        const agentData = await getAgentData(year, month, agent);
        if (!agentData)
            return res.status(404).json({ error: `No hay datos de ${agent}` });
        const c = await getAgentConfig(Number(year), Number(month), agent);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }
        console.log(`[dispatch/test] Generando PDF de ${agent}...`);
        // Check for override HTML
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agent.replace(/[^a-z0-9]/gi, '_')}.html`);
        let overrideHtml = undefined;
        if (fs.existsSync(overrideFile)) {
            overrideHtml = fs.readFileSync(overrideFile, 'utf8');
        }
        // 1. Generar PDF (local) o preparar HTML (Vercel)
        const pdfBuffer = await generatePdfBuffer(agentData, overrideHtml);
        const htmlContent = IS_VERCEL ? (overrideHtml || (0, pdf_template_1.generateClosureHtml)(agentData)) : undefined;
        const pdfFileName = `${agent} - ${mesNombre} ${year}.pdf`;
        // 2. Enviar via Apps Script (guarda en Drive + manda mail)
        const defaultTemplate = `{saludo} {nombre}!\n\nTe comparto el cierre del mes de {mes} {año}.\nAvisame cualquier cosa que falte o se necesite aclarar.\n\nSaludos,\n{remitente_nombre}.`;
        const body = renderEmailBody(template || defaultTemplate, agent, mesNombre, String(year), senderName || 'Santos');
        const result = await sendViaAppsScript({
            to: TEST_EMAIL,
            subject: `🧪 [TEST] Cierre de ${mesNombre} ${year} - ${agent}`,
            body,
            pdfBuffer: pdfBuffer ?? undefined,
            htmlContent,
            pdfFileName,
            year: String(year),
            month: String(month),
            isTest: true,
            testEmail: TEST_EMAIL,
            sender: sender || '',
        });
        console.log(`[dispatch/test] Resultado:`, result.success ? '✅' : '❌', result.error || '');
        // 3. Auto-congelar tras envío exitoso
        await autoFreezeAgent(Number(year), Number(month), agent);
        // 4. Registrar en historial
        const timestamp = getLocalTimestamp();
        const añoMes = `${year}${String(month).padStart(2, '0')}`;
        try {
            await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`, [[
                    timestamp, añoMes, agent, TEST_EMAIL, '', sender || 'test', 'Test', result.driveLink || '', ''
                ]]);
        }
        catch (e) {
            console.warn('[dispatch] Error registrando en historial:', e.message);
        }
        // 4. Actualizar estado en config
        try {
            const configData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:G`);
            const rowIndex = configData.findIndex((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
            if (rowIndex > 0) {
                await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!F${rowIndex + 1}:G${rowIndex + 1}`, [[timestamp, 'Test enviado']]);
            }
        }
        catch (e) {
            console.warn('[dispatch] Error actualizando estado:', e.message);
        }
        res.json({
            success: result.success,
            pdfUrl: result.driveLink || '',
            mailSent: result.success,
            mailError: result.error,
            sender: result.sender,
        });
    }
    catch (e) {
        console.error('[dispatch/test] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
/**
 * POST /api/dispatch/send — Envía a un agente individual (mail real + CC)
 */
router.post('/dispatch/send', async (req, res) => {
    try {
        const { agent, year, month, sender, senderName, template } = req.body;
        if (!agent || !year || !month)
            return res.status(400).json({ error: 'Faltan parámetros' });
        const mesNombre = MONTHS[month - 1];
        const agentData = await getAgentData(year, month, agent);
        if (!agentData)
            return res.status(404).json({ error: `No hay datos de ${agent}` });
        const c = await getAgentConfig(Number(year), Number(month), agent);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }
        // Leer config para obtener email y CC
        const configData = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
        const agentRow = configData.find((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
        if (!agentRow)
            return res.status(404).json({ error: `${agent} no encontrado en config de envío` });
        const email = agentRow[2];
        const cc = agentRow[4] || '';
        if (!email)
            return res.status(400).json({ error: `${agent} no tiene email configurado` });
        console.log(`[dispatch/send] Enviando cierre a ${agent} (${email})...`);
        // Check for override HTML
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agent.replace(/[^a-z0-9]/gi, '_')}.html`);
        let overrideHtml = undefined;
        if (fs.existsSync(overrideFile)) {
            overrideHtml = fs.readFileSync(overrideFile, 'utf8');
        }
        // 1. Generar PDF (local) o preparar HTML (Vercel)
        const pdfBuffer = await generatePdfBuffer(agentData, overrideHtml);
        const htmlContent = IS_VERCEL ? (overrideHtml || (0, pdf_template_1.generateClosureHtml)(agentData)) : undefined;
        const pdfFileName = `${agent} - ${mesNombre} ${year}.pdf`;
        // 2. Enviar via Apps Script (guarda en Drive + manda mail)
        const defaultTemplate = `{saludo} {nombre}!\n\nTe comparto el cierre del mes de {mes} {año}.\nAvisame cualquier cosa que falte o se necesite aclarar.\n\nSaludos,\n{remitente_nombre}.`;
        const body = renderEmailBody(template || defaultTemplate, agent, mesNombre, String(year), senderName || 'Santos');
        const result = await sendViaAppsScript({
            to: email,
            cc,
            subject: `Cierre de ${mesNombre} ${year} - ${agent}`,
            body,
            pdfBuffer: pdfBuffer ?? undefined,
            htmlContent,
            pdfFileName,
            year: String(year),
            month: String(month),
            sender: sender || '',
        });
        // 3. Auto-congelar tras envío exitoso (solo si el mail se envió bien)
        if (result.success) {
            await autoFreezeAgent(Number(year), Number(month), agent);
        }
        // 4. Registrar en historial
        const timestamp = getLocalTimestamp();
        const añoMes = `${year}${String(month).padStart(2, '0')}`;
        const estado = result.success ? 'Enviado' : 'Error';
        try {
            await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`, [[
                    timestamp, añoMes, agent, email, cc, sender || '', estado, result.driveLink || '', result.error || ''
                ]]);
        }
        catch (e) {
            console.warn('[dispatch] Error registrando en historial:', e.message);
        }
        // 4. Actualizar estado en config
        try {
            const rowIndex = configData.findIndex((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
            if (rowIndex > 0) {
                await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `${ENVIO_SHEET}!F${rowIndex + 1}:G${rowIndex + 1}`, [[timestamp, estado]]);
            }
        }
        catch (e) {
            console.warn('[dispatch] Error actualizando estado:', e.message);
        }
        console.log(`[dispatch/send] ${estado}: ${agent} → ${email}`);
        res.json({
            success: result.success,
            pdfUrl: result.driveLink || '',
            mailSent: result.success,
            mailError: result.error,
            sender: result.sender,
        });
    }
    catch (e) {
        console.error('[dispatch/send] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
/**
 * GET /api/dispatch/health — Verifica conexión con Apps Script
 */
router.get('/dispatch/health', async (req, res) => {
    const { sender } = req.query;
    let url = APPS_SCRIPT_URL;
    if (sender) {
        const prefix = String(sender).trim().toLowerCase().split('@')[0].toUpperCase();
        const envVarName = `APPS_SCRIPT_MAIL_URL_${prefix}`;
        if (process.env[envVarName]) {
            url = process.env[envVarName];
        }
    }
    if (!url) {
        return res.json({ ok: false, error: 'APPS_SCRIPT_MAIL_URL no configurada' });
    }
    try {
        const response = await fetch(url, { redirect: 'follow' });
        const data = await response.json();
        res.json({ ok: true, ...data });
    }
    catch (e) {
        res.json({ ok: false, error: e.message });
    }
});
exports.default = router;
