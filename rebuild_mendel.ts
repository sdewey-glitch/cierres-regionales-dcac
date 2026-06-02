import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getRoster, normalizeName } from './src/core/normalization';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const MENDEL_SHEET_ID = '1nxrPYMCCHJ_kdsbWFE28bRoqiu0WS0PUAYTKsA-qTKw';
const HUB_GASTOS_ID = process.env.HUB_GASTOS_ID!;
const HUB_SPREADSHEET_ID = process.env.HUB_SPREADSHEET_ID!;

function parseNumber(val: any): number {
    if (!val) return 0;
    const str = String(val).replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    return Number(str) || 0;
}

async function run() {
    console.log("Conectando a Google Sheets para migrar Mendel...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.Google_mail || process.env.GOOGLE_MAIL,
            private_key: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({version: 'v4', auth});

    // 1. Crear Config_Mendel si no existe en el HUB
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_GASTOS_ID });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Config_Mendel');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_GASTOS_ID,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Config_Mendel' } }
                    }]
                }
            });
            console.log("Pestaña Config_Mendel creada en el HUB.");
        }
    } catch(e) { console.log("Error verificando/creando pestaña:", e); }

    // Roster para enriquecer datos
    const roster = await getRoster();

    // 2. Leer base mendel cruda
    console.log("Leyendo Base Mendel...");
    const rawRes = await sheets.spreadsheets.values.get({
        spreadsheetId: MENDEL_SHEET_ID,
        range: "'Base Mendel'!A2:BD" 
    });
    const rows = rawRes.data.values || [];

    // Estructura de agrupación:
    // Key: YYYYMM_Comercial_Categoria -> Total
    const grouped = new Map<string, number>();

    for (const row of rows) {
        if (!row[0]) continue; // ID Transaccion vacío
        const estado = String(row[15] || '').trim().toUpperCase();
        if (estado !== 'CONFIRMADA') continue; // Solo aprobadas

        // BA = 52 (Usuario normalizado), BB = 53 (Categoria normalizada), BC = 54 (Periodo normalizado)
        const comercialOriginal = String(row[52] || '').trim();
        const categoria = String(row[53] || '').trim();
        const añoMes = String(row[54] || '').trim();
        
        // Si no tiene usuario normalizado, se descarta por completo
        if (!añoMes || !comercialOriginal) continue;

        const comercial = await normalizeName(comercialOriginal);
        if (!comercial) continue;
        const importe = parseNumber(row[5]); // Importe total

        const key = `${añoMes}|${comercial}|${categoria}`;
        grouped.set(key, (grouped.get(key) || 0) + importe);
    }

    // 3. Preparar filas para escribir
    const headers = ['Año', 'Mes', 'AñoMes', 'ID Usuario', 'Comercial', 'Email', 'Provincia', 'Oficina', 'Categoría', 'Monto Agrupado'];
    const allRows: any[][] = [];

    for (const [key, total] of grouped.entries()) {
        const [añoMes, comercial, categoria] = key.split('|');
        const año = añoMes.substring(0, 4);
        const mes = añoMes.substring(4, 6);
        
        const r = roster.get(comercial.toLowerCase());
        const idUsuario = r?.codigo || '';
        const mail = r?.mail || '';
        const provincia = r?.provincia || '';
        const oficina = r?.oficina || '';

        allRows.push([año, mes, añoMes, idUsuario, comercial, mail, provincia, oficina, categoria, total]);
    }

    // Ordenar cronológicamente y por comercial
    allRows.sort((a, b) => {
        if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]));
        return String(a[4]).localeCompare(String(b[4]));
    });

    console.log(`Escribiendo ${allRows.length} filas agrupadas en Config_Mendel...`);

    // 4. Limpiar y escribir
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_GASTOS_ID,
        range: 'Config_Mendel!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_GASTOS_ID,
        range: 'Config_Mendel!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers, ...allRows]
        }
    });

    try {
        const { formatSheetNumbers } = require('./src/api/sheets');
        await formatSheetNumbers(HUB_GASTOS_ID!, 'Config_Mendel', 5, 6); // Format "Monto Agrupado"
    } catch(e) { console.log("Formato no aplicado", e); }

    console.log("¡Migración de Mendel completada exitosamente!");
}

run().catch(console.error);
