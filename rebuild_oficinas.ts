import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

const MENDEL_SHEET_ID = '1nxrPYMCCHJ_kdsbWFE28bRoqiu0WS0PUAYTKsA-qTKw';
const HUB_SPREADSHEET_ID = process.env.HUB_SPREADSHEET_ID!;

function parseNumber(val: any): number {
    if (!val) return 0;
    const str = String(val).replace(/\./g, '').replace(/,/g, '.');
    return Number(str) || 0;
}

async function run() {
    console.log("Conectando a Google Sheets para migrar Gastos de Oficinas...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY ? process.env.GOOGLE_KEY.replace(/\\n/g, '\n') : ''
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});

    // 1. Crear Config_GastosOficinas si no existe en el HUB
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_SPREADSHEET_ID });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Config_GastosOficinas');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_SPREADSHEET_ID,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Config_GastosOficinas' } }
                    }]
                }
            });
            console.log("Pestaña Config_GastosOficinas creada en el HUB.");
        }
    } catch(e) { console.log("Error verificando/creando pestaña:", e); }

    // 2. Leer Gastos_Oficinas de Mendel
    console.log("Leyendo Gastos_Oficinas...");
    const rawRes = await sheets.spreadsheets.values.get({
        spreadsheetId: MENDEL_SHEET_ID,
        range: "'Gastos_Oficinas'!A2:ZZ"
    });
    const rows = rawRes.data.values || [];
    if (rows.length < 1) {
        console.log("No se encontraron datos.");
        return;
    }

    const headers = rows[0]; // ['Oficina', 'Categoría', '202401', '202402', ...]
    const unpivotedRows: any[][] = [];

    // Fila 0 son headers. Fila 1 en adelante son datos
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const oficina = String(row[0] || '').trim();
        const categoria = String(row[1] || '').trim();
        
        if (!oficina || !categoria) continue;

        for (let col = 2; col < headers.length; col++) {
            const añoMes = String(headers[col]).trim();
            if (!añoMes) continue;
            
            const monto = parseNumber(row[col]);
            if (monto !== 0) {
                unpivotedRows.push([añoMes, oficina, categoria, monto]);
            }
        }
    }

    // Ordenar cronológicamente y por oficina
    unpivotedRows.sort((a, b) => {
        if (a[0] !== b[0]) return String(a[0]).localeCompare(String(b[0]));
        if (a[1] !== b[1]) return String(a[1]).localeCompare(String(b[1]));
        return String(a[2]).localeCompare(String(b[2]));
    });

    console.log(`Escribiendo ${unpivotedRows.length} filas unpivoteadas en Config_GastosOficinas...`);

    const finalHeaders = ['AñoMes', 'Oficina', 'Categoría', 'Monto'];

    // 4. Limpiar y escribir en el HUB
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_SPREADSHEET_ID,
        range: 'Config_GastosOficinas!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_SPREADSHEET_ID,
        range: 'Config_GastosOficinas!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [finalHeaders, ...unpivotedRows]
        }
    });

    console.log("¡Migración de Gastos_Oficinas completada exitosamente!");
}

run().catch(console.error);
