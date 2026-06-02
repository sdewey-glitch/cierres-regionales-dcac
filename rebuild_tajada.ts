import { calculateDynamicMonth } from './src/core/engine';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

const HUB_CIERRES_ID = process.env.HUB_CIERRES_ID;

async function run() {
    console.log("Generando historial de Tajada...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY ? process.env.GOOGLE_KEY.replace(/\\n/g, '\n') : ''
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});

    // Create the sheet if it doesn't exist
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_CIERRES_ID! });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Config_Tajada');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_CIERRES_ID!,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Config_Tajada' } }
                    }]
                }
            });
            console.log("Pestaña Config_Tajada creada.");
        }
    } catch(e) { console.log(e); }

    const headers = ['Año', 'Mes', 'AñoMes', 'Oficina', 'Provincia', 'Modalidad', 'ID Usuario', 'Comercial', 'Email', 'Sociedades Operadas', 'Sociedades Oficina', '% Tajada'];
    const allRows: any[][] = [];

    // Loop from 2024-01 to 2026-05
    for (let y = 2024; y <= 2026; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2026 && m > 5) break;

            const results = await calculateDynamicMonth(y, m);
            
            // Re-calculate the office totals to put in the column
            const officeTotals = new Map<string, number>();
            for (const r of results) {
                const poolKey = r.oficina || r.provincia || 'Sin Zona';
                const isPseudo = r.tipo.includes('Oficina') || r.tipo.includes('City');
                if (!isPseudo) {
                    officeTotals.set(poolKey, (officeTotals.get(poolKey) || 0) + r.socOpGen);
                }
            }

            for (const r of results) {
                const isPseudo = r.tipo.includes('Oficina') || r.tipo.includes('City');
                if (isPseudo) continue; // Don't show virtual agents in Tajada table
                
                const poolKey = r.oficina || r.provincia || 'Sin Zona';
                const totalOficina = officeTotals.get(poolKey) || 0;
                
                allRows.push([
                    y, m, `${y}${String(m).padStart(2, '0')}`,
                    r.oficina || '', r.provincia || '', r.modalidad || '', 
                    r.idUsuario, r.asociadoComercial, r.mail,
                    r.socOpGen, totalOficina, Number(r.tajadaRegion.toFixed(4))
                ]);
            }
            console.log(`Procesado ${y}-${m}`);
            // Sleep 8 seconds to avoid Google Sheets API quota (60 req/min) 
            // since engine.ts makes 8 fetches per month.
            await new Promise(r => setTimeout(r, 8000));
        }
    }

    // Clear and write
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_CIERRES_ID!,
        range: 'Config_Tajada!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_CIERRES_ID!,
        range: 'Config_Tajada!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers, ...allRows]
        }
    });

    try {
        const { formatSheetNumbers } = require('./src/api/sheets');
        await formatSheetNumbers(HUB_CIERRES_ID!, 'Config_Tajada', 9, 11, '#,##0'); // Sociedades
        await formatSheetNumbers(HUB_CIERRES_ID!, 'Config_Tajada', 11, 12, '0.00%'); // Porcentaje
    } catch(e) { console.log("Formato no aplicado", e); }

    console.log(`Historial de Tajada insertado: ${allRows.length} filas.`);
    console.log("¡Historial de Tajada completado exitosamente!");
}

run().catch(console.error);
