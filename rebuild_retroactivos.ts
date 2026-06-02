import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { calculateRetroactiveAdjustments } from './src/core/engine';
dotenv.config();

const HUB_CIERRES_ID = process.env.HUB_CIERRES_ID;

async function run() {
    console.log("Calculando Ajustes Retroactivos y subiendo al HUB...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY ? process.env.GOOGLE_KEY.replace(/\\n/g, '\n') : ''
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});

    // 1. Asegurar pestaa Reporte_Retroactivos
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_CIERRES_ID! });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Reporte_Retroactivos');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_CIERRES_ID!,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Reporte_Retroactivos' } }
                    }]
                }
            });
            console.log("Pestaña Reporte_Retroactivos creada en el HUB.");
        }
    } catch (e) {
        console.log("Error verificando/creando pestaña:", e);
    }

    // 2. Correr motor para el mes en curso (ej: 2026-05)
    // Asumimos que queremos revisar retroactivos para Mayo 2026
    const currentYear = 2026;
    const currentMonth = 5;
    
    console.log(`Corriendo motor de retroactivos para el mes ${currentYear}-${currentMonth}...`);
    const adjustments = await calculateRetroactiveAdjustments(currentYear, currentMonth);

    const unpivotedRows: any[][] = [];
    const headers = ['Año Actual', 'Mes Actual', 'ID Usuario', 'Comercial', 'Email', 'Provincia', 'Oficina', 'Año Ajustado', 'Mes Ajustado', 'Diferencia Generada $', 'Motivos Principales'];

    for (const adj of adjustments) {
        unpivotedRows.push([
            adj.año,
            adj.mes,
            adj.idUsuario,
            adj.comercial,
            adj.mail,
            adj.provincia,
            adj.oficina,
            adj.añoAjustado,
            adj.mesAjustado,
            adj.diferenciaGenerada,
            adj.motivos
        ]);
    }

    // 3. Escribir en HUB
    console.log(`Escribiendo ${unpivotedRows.length} ajustes en Reporte_Retroactivos...`);
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_CIERRES_ID!,
        range: 'Reporte_Retroactivos!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_CIERRES_ID!,
        range: 'Reporte_Retroactivos!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers, ...unpivotedRows]
        }
    });

    try {
        const { formatSheetNumbers } = require('./src/api/sheets');
        await formatSheetNumbers(HUB_CIERRES_ID!, 'Reporte_Retroactivos', 9, 10); // Format "Diferencia Generada $"
    } catch(e) { console.log("Formato no aplicado", e); }

    console.log("¡Cálculo de retroactivos completado exitosamente!");
}

run().catch(console.error);
