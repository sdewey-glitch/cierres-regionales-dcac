import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';
import { readSheet, writeSheet, appendSheet, createSheetIfNotExists, clearSheetRange } from './sheets';
import { generateClosureHtml } from '../core/pdf-template';
import { CommercialResult } from '../core/types';
import { calculateDynamicMonth, calculateRetroactiveAdjustments } from '../core/engine';
import { saveMonthSnapshot, loadMonthSnapshot } from '../core/snapshot';
import { updateDynamicSueldos } from '../core/writer';

const router = express.Router();

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
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TEST_EMAIL = 'sdewey@decampoacampo.com';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_MAIL_URL || '';
const ENVIO_SHEET = 'Envio_Reportes';
const HISTORIAL_SHEET = 'Historial_Envios';

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════

/** Retorna la fecha y hora local de Argentina formateada amigablemente */
function getLocalTimestamp(): string {
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

/** Lee el snapshot del mes y busca un agente por nombre */
async function getAgentData(year: number, month: number, agentName: string): Promise<CommercialResult | null> {
    const data = await loadMonthSnapshot(year, month);
    if (!data) return null;
    return data.find(d => d.asociadoComercial?.toString().trim().toLowerCase() === agentName.trim().toLowerCase()) || null;
}

/** Obtiene la configuración de envío para un agente específico, incluyendo ajustes manuales customizados */
async function getAgentConfig(year: number, month: number, agentName: string) {
    let configData: any[][] = [];
    try {
        configData = await readSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
    } catch { return null; }
    
    const row = configData.find((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agentName.trim().toLowerCase());
    if (!row) return null;

    let defaultManualMonto = 0;
    const snapshot = await loadMonthSnapshot(year, month);
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
function adjustAgentDataWithConfig(agentData: CommercialResult, c: any) {
    if (!agentData) return;
    
    const totalRetro = agentData.retroactivosDetalle?.reduce((sum, a) => sum + a.ajusteComponenteP, 0) || 0;
    
    if (c.incluirAjustesManuales) {
        agentData.ajustes = totalRetro + Number(c.ajustesManualesMonto);
        agentData.ajustesManuales = Number(c.ajustesManualesMonto);
    } else {
        agentData.ajustes = totalRetro;
        agentData.ajustesManuales = 0;
    }

    const totalComponentes = agentData.componenteP + agentData.componenteR + agentData.componenteO;
    const sueldoFinal = Math.max(agentData.minimo, totalComponentes + agentData.ajustes);
    
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

/** Genera PDF buffer para un agente */
async function generatePdfBuffer(agentData: CommercialResult, overrideHtml?: string): Promise<Buffer | null> {
    if (IS_VERCEL) {
        // En Vercel (serverless), delegamos la generación de PDF completamente a Apps Script para evitar el límite de tamaño de la función
        return null;
    }

    try {
        const html = overrideHtml || generateClosureHtml(agentData);
        let browser: any;

        const dynamicImport = new Function('specifier', 'return import(specifier)');

        // Local: puppeteer normal con Chrome instalado
        const puppeteerModule = await dynamicImport('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
        });
        await browser.close();
        return Buffer.from(pdfBuffer);
    } catch (err: any) {
        console.error('[generatePdfBuffer] Error local al generar PDF con Puppeteer:', err.message);
        return null;
    }
}


/** 
 * Envía mail + guarda PDF en Drive via Apps Script web app
 * El Apps Script corre como el usuario → tiene cuota de Drive
 * En Vercel: manda htmlContent para que Apps Script genere el PDF vía DriveApp (o pdfBase64 si se generó local)
 */
async function sendViaAppsScript(params: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
    pdfBuffer?: Buffer | null;
    htmlContent?: string;
    pdfFileName?: string;
    year: string;
    month: string;
    isTest?: boolean;
    testEmail?: string;
    sender?: string;
}): Promise<{ success: boolean; error?: string; sender?: string; driveLink?: string }> {
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
        const payload: any = {
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
        } else if (params.htmlContent) {
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
        } catch {
            // Si la respuesta no es JSON (ej: página de auth de Google)
            return { success: false, error: `Respuesta inesperada del Apps Script: ${text.substring(0, 200)}` };
        }
    } catch (e: any) {
        return { success: false, error: `Error conectando con Apps Script: ${e.message}` };
    }
}

/** Genera el cuerpo del mail a partir del template */
function renderEmailBody(template: string, agentName: string, month: string, year: string, senderName: string): string {
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
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const y = Number(year), m = Number(month);
        const añoMes = `${y}${String(m).padStart(2, '0')}`;

        // Asegurar que las hojas existen (no-fatal si falla)
        try {
            await createSheetIfNotExists(config.HUB_CIERRES_ID, ENVIO_SHEET);
            await createSheetIfNotExists(config.HUB_CIERRES_ID, HISTORIAL_SHEET);
        } catch (sheetErr: any) {
            console.warn(`[dispatch] ⚠️ No se pudieron crear hojas: ${sheetErr.message}`);
        }

        // Leer config de envío
        let configData: any[][] = [];
        try {
            configData = await readSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
        } catch (e: any) { console.warn('[dispatch] No se pudo leer config de envío:', e.message); }

        // Si está vacía, inicializar desde el snapshot
        if (configData.length <= 1) {
            const snapshot = await loadMonthSnapshot(y, m);
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
                
                await writeSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A1`, [header, ...rows]);
                configData = [header, ...rows];
                console.log(`[dispatch] ✅ Hoja ${ENVIO_SHEET} inicializada con ${rows.length} comerciales`);
            }
        }

        let snapshot: CommercialResult[] = await loadMonthSnapshot(y, m) || [];

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
        let historialData: any[][] = [];
        try {
            historialData = await readSheet(config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`);
        } catch (e: any) { console.warn('[dispatch] No se pudo leer historial:', e.message); }

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

    } catch (e: any) {
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
        if (!envioConfig) return res.status(400).json({ error: 'config requerida' });

        // 1. Guardar la configuración de envío en Envio_Reportes
        const header = ['Nombre', 'Codigo', 'Email', 'Enviar', 'CC', 'Ultimo_Envio', 'Estado', 'Ajustes_Manuales_Monto', 'Incluir_Ajustes_Manuales'];
        const rows = envioConfig.map((c: any) => [
            c.nombre, c.codigo, c.email,
            c.enviar ? 'Si' : 'No',
            c.cc || '', c.ultimoEnvio || '', c.estado || '',
            c.ajustesManualesMonto !== undefined ? Number(c.ajustesManualesMonto) : 0,
            c.incluirAjustesManuales ? 'Si' : 'No',
        ]);

        await writeSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A1`, [header, ...rows]);

        // 2. Sincronizar ajustes manuales en la pestaña 'Ajustes' de HUB_CONFIGURACIONES_ID si se pasaron el año y mes
        if (year && month) {
            const targetYear = Number(year);
            const targetMonth = Number(month);
            const targetYearMonth = `${targetYear}${String(targetMonth).padStart(2, '0')}`;
            const configId = config.HUB_CONFIGURACIONES_ID;

            console.log(`[dispatch/config] Sincronizando ajustes manuales para ${targetYear}-${targetMonth} con la pestaña Ajustes...`);

            // Leer todos los ajustes manuales actuales
            const rawAjustes = await readSheet(configId, "'Ajustes'!A2:F");
            const otherAdjustments: any[][] = [];
            const currentPeriodAdjustments = new Map<string, number>();
            const currentPeriodMotivos = new Map<string, string>();

            for (const row of rawAjustes) {
                if (!row[0]) continue;
                const rowYear = Number(row[0]);
                const rowMonth = Number(row[1]);
                const rowComercial = String(row[3] || '').trim();

                if (rowYear === targetYear && rowMonth === targetMonth) {
                    const key = rowComercial.toLowerCase();
                    currentPeriodAdjustments.set(key, Number(row[5]) || 0);
                    currentPeriodMotivos.set(key, String(row[4] || '').trim());
                } else {
                    otherAdjustments.push(row);
                }
            }

            // Construir la nueva lista de ajustes para el período actual
            const newCurrentAdjustments: any[][] = [];
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
                await clearSheetRange(configId, "'Ajustes'!A2:F2000");

                // Reescribir
                if (allNewRows.length > 0) {
                    await writeSheet(configId, `'Ajustes'!A2:F${allNewRows.length + 1}`, allNewRows);
                }

                // Recalcular dinámicamente y guardar en el snapshot local
                console.log(`[dispatch/config] Recalculando snapshot de cierre para ${targetYear}-${targetMonth}...`);
                const results = await calculateDynamicMonth(targetYear, targetMonth);
                const retros = await calculateRetroactiveAdjustments(targetYear, targetMonth);

                // Guardar retroactivos en Sheets temporalmente? O quizÃ¡s no sea necesario guardarlo local.
                // En este script sÃ³lo procesamos y mostramos.
                // Si la lÃ³gica de retroactivos es la misma que engine.ts, el cierre es puramente en Sheets.
                // Comentado para evitar FS local.
                // const retroFile = path.join(SNAPSHOTS_DIR, `retro_${targetYear}_${String(targetMonth).padStart(2, '0')}.json`);
                // fs.writeFileSync(retroFile, JSON.stringify(retros, null, 2));

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
                try {
                    await updateDynamicSueldos(targetYear, targetMonth, results);
                } catch (err: any) {
                    console.warn(`[dispatch/config] ⚠️ Error escribiendo cierre al Google Sheet: ${err.message}`);
                }
                console.log(`[dispatch/config] ✅ Cierre recalculado y guardado`);
            }
        }

        res.json({ success: true });

    } catch (e: any) {
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
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const agentData = await getAgentData(Number(year), Number(month), agentName);
        if (!agentData) return res.status(404).json({ error: `No se encontró datos para ${agentName}` });

        const c = await getAgentConfig(Number(year), Number(month), agentName);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }

        let pdfBuffer = await generatePdfBuffer(agentData);
        
        if (!pdfBuffer && IS_VERCEL) {
            console.log(`[dispatch/preview] Generando PDF en Vercel vía Apps Script para ${agentName}...`);
            const html = generateClosureHtml(agentData);
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
            const result = await response.json() as any;
            if (result.success && result.pdfBase64) {
                pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
            } else {
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

    } catch (e: any) {
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
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const agentData = await getAgentData(Number(year), Number(month), agentName);
        if (!agentData) return res.status(404).json({ error: `No se encontró datos para ${agentName}` });

        const c = await getAgentConfig(Number(year), Number(month), agentName);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }

        // Check if there is already an override
        let finalHtml = '';
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        
        if (fs.existsSync(overrideFile)) {
            finalHtml = fs.readFileSync(overrideFile, 'utf8');
        } else {
            finalHtml = generateClosureHtml(agentData);
        }

        res.send(finalHtml);
    } catch (e: any) {
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
        if (!year || !month) return res.status(400).json({ error: 'year y month requeridos' });

        const agentData = await getAgentData(Number(year), Number(month), agentName);
        if (!agentData) return res.status(404).json({ error: `No se encontró datos para ${agentName}` });

        const c = await getAgentConfig(Number(year), Number(month), agentName);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }

        let finalHtml = '';
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        
        if (fs.existsSync(overrideFile)) {
            finalHtml = fs.readFileSync(overrideFile, 'utf8');
        } else {
            finalHtml = generateClosureHtml(agentData);
        }

        res.send(finalHtml);
    } catch (e: any) {
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
        if (!year || !month || !html) return res.status(400).json({ error: 'Faltan parámetros' });

        if (!fs.existsSync(OVERRIDE_DIR)) {
            fs.mkdirSync(OVERRIDE_DIR, { recursive: true });
        }

        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agentName.replace(/[^a-z0-9]/gi, '_')}.html`);
        fs.writeFileSync(overrideFile, html, 'utf8');

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


/**
 * POST /api/dispatch/test — Genera PDF, sube a Drive via Apps Script, manda mail de test
 */
router.post('/dispatch/test', async (req, res) => {
    try {
        const { agent, year, month, sender, senderName, template } = req.body;
        if (!agent || !year || !month) return res.status(400).json({ error: 'Faltan parámetros' });

        const mesNombre = MONTHS[month - 1];
        const agentData = await getAgentData(year, month, agent);
        if (!agentData) return res.status(404).json({ error: `No hay datos de ${agent}` });

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
        const htmlContent = IS_VERCEL ? (overrideHtml || generateClosureHtml(agentData)) : undefined;
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

        // 3. Registrar en historial
        const timestamp = getLocalTimestamp();
        const añoMes = `${year}${String(month).padStart(2, '0')}`;
        try {
            await appendSheet(config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`, [[
                timestamp, añoMes, agent, TEST_EMAIL, '', sender || 'test', 'Test', result.driveLink || '', ''
            ]]);
        } catch (e: any) { console.warn('[dispatch] Error registrando en historial:', e.message); }

        // 4. Actualizar estado en config
        try {
            const configData = await readSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:G`);
            const rowIndex = configData.findIndex((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
            if (rowIndex > 0) {
                await writeSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!F${rowIndex + 1}:G${rowIndex + 1}`, [[timestamp, 'Test enviado']]);
            }
        } catch (e: any) { console.warn('[dispatch] Error actualizando estado:', e.message); }

        res.json({ 
            success: result.success, 
            pdfUrl: result.driveLink || '', 
            mailSent: result.success,
            mailError: result.error,
            sender: result.sender,
        });

    } catch (e: any) {
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
        if (!agent || !year || !month) return res.status(400).json({ error: 'Faltan parámetros' });

        const mesNombre = MONTHS[month - 1];
        const agentData = await getAgentData(year, month, agent);
        if (!agentData) return res.status(404).json({ error: `No hay datos de ${agent}` });

        const c = await getAgentConfig(Number(year), Number(month), agent);
        if (c) {
            adjustAgentDataWithConfig(agentData, c);
        }

        // Leer config para obtener email y CC
        const configData = await readSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!A:I`);
        const agentRow = configData.find((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
        if (!agentRow) return res.status(404).json({ error: `${agent} no encontrado en config de envío` });

        const email = agentRow[2];
        const cc = agentRow[4] || '';

        if (!email) return res.status(400).json({ error: `${agent} no tiene email configurado` });

        console.log(`[dispatch/send] Enviando cierre a ${agent} (${email})...`);

        // Check for override HTML
        const overrideFile = path.join(OVERRIDE_DIR, `${year}_${month}_${agent.replace(/[^a-z0-9]/gi, '_')}.html`);
        let overrideHtml = undefined;
        if (fs.existsSync(overrideFile)) {
            overrideHtml = fs.readFileSync(overrideFile, 'utf8');
        }

        // 1. Generar PDF (local) o preparar HTML (Vercel)
        const pdfBuffer = await generatePdfBuffer(agentData, overrideHtml);
        const htmlContent = IS_VERCEL ? (overrideHtml || generateClosureHtml(agentData)) : undefined;
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

        // 3. Registrar en historial
        const timestamp = getLocalTimestamp();
        const añoMes = `${year}${String(month).padStart(2, '0')}`;
        const estado = result.success ? 'Enviado' : 'Error';
        try {
            await appendSheet(config.HUB_CIERRES_ID, `${HISTORIAL_SHEET}!A:I`, [[
                timestamp, añoMes, agent, email, cc, sender || '', estado, result.driveLink || '', result.error || ''
            ]]);
        } catch (e: any) { console.warn('[dispatch] Error registrando en historial:', e.message); }

        // 4. Actualizar estado en config
        try {
            const rowIndex = configData.findIndex((r, i) => i > 0 && r[0]?.toString().trim().toLowerCase() === agent.trim().toLowerCase());
            if (rowIndex > 0) {
                await writeSheet(config.HUB_CIERRES_ID, `${ENVIO_SHEET}!F${rowIndex + 1}:G${rowIndex + 1}`, [[timestamp, estado]]);
            }
        } catch (e: any) { console.warn('[dispatch] Error actualizando estado:', e.message); }

        console.log(`[dispatch/send] ${estado}: ${agent} → ${email}`);

        res.json({
            success: result.success,
            pdfUrl: result.driveLink || '',
            mailSent: result.success,
            mailError: result.error,
            sender: result.sender,
        });

    } catch (e: any) {
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
    } catch (e: any) {
        res.json({ ok: false, error: e.message });
    }
});

export default router;
