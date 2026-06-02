import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { getRoster } from './src/core/normalization';
dotenv.config();

const SPREADSHEET_ID = '1nxrPYMCCHJ_kdsbWFE28bRoqiu0WS0PUAYTKsA-qTKw'; // Base Acuerdos y Liquidaciones (donde están Gastos)
const HUB_TABLERO_ID = process.env.HUB_TABLERO_ID; // Hub central

function parseNumber(val: string): number {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(/,/g, '.');
    return Number(clean) || 0;
}

async function run() {
    console.log("Conectando a Google Sheets para migrar P&L Asoc. Com...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY ? process.env.GOOGLE_KEY.replace(/\\n/g, '\n') : ''
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});

    // 1. Asegurar que la pestaña Config_PL existe en el HUB
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_TABLERO_ID! });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Config_PL');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_TABLERO_ID!,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Config_PL' } }
                    }]
                }
            });
            console.log("Pestaña Config_PL creada en el HUB.");
        }
    } catch (e) {
        console.log("Error verificando/creando pestaña:", e);
    }

    // 2. Leer P&L
    console.log("Leyendo P&L - Asoc. Com (incluye Mendel)...");
    const rawRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "'P&L - Asoc. Com (incluye Mendel)'!A1:AZ"
    });
    const rows = rawRes.data.values || [];
    if (rows.length < 3) return;

    // Row 0 has the AñoMes headers starting at index 2
    const periodos = rows[0];
    const roster = await getRoster();

    const unpivotedRows: any[][] = [];
    const headers = ['Año', 'Mes', 'AñoMes', 'ID Usuario', 'Comercial', 'Email', 'Provincia', 'Oficina', 'Categoría', 'Monto'];

    for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        const comercial = String(row[0] || '').trim();
        const categoria = String(row[1] || '').trim();

        if (!comercial || !categoria) continue;

        for (let j = 2; j < periodos.length; j++) {
            const añoMes = String(periodos[j] || '').trim();
            if (!añoMes) continue;

            const monto = parseNumber(row[j]);
            if (monto !== 0) {
                const año = añoMes.substring(0, 4);
                const mes = añoMes.substring(4, 6);
                
                const r = roster.get(comercial.toLowerCase());
                const idUsuario = r?.codigo || '';
                const mail = r?.mail || '';
                const provincia = r?.provincia || '';
                const oficina = r?.oficina || '';

                unpivotedRows.push([año, mes, añoMes, idUsuario, comercial, mail, provincia, oficina, categoria, monto]);
            }
        }
    }

    // 3. Escribir en HUB
    console.log(`Escribiendo ${unpivotedRows.length} filas unpivoteadas en Config_PL...`);
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_TABLERO_ID!,
        range: 'Config_PL!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_TABLERO_ID!,
        range: 'Config_PL!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers, ...unpivotedRows]
        }
    });

    try {
        const { formatSheetNumbers } = require('./src/api/sheets');
        await formatSheetNumbers(HUB_TABLERO_ID!, 'Config_PL', 5, 6); // Format "Monto"
    } catch(e) { console.log("Formato no aplicado", e); }

    console.log("¡Migración de P&L completada exitosamente!");
}

run().catch(console.error);
