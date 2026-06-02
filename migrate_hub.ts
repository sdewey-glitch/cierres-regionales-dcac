import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail || process.env.GOOGLE_MAIL,
        private_key: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const OLD_SOURCE = process.env.SOURCE_SPREADSHEET_ID!;
const OLD_TARGET = process.env.TARGET_SPREADSHEET_ID!;
const OLD_HUB = process.env.HUB_SPREADSHEET_ID!;

const NEW_CONFIG = process.env.HUB_CONFIGURACIONES_ID!;
const NEW_GASTOS = process.env.HUB_GASTOS_ID!;
const NEW_CIERRES = process.env.HUB_CIERRES_ID!;
const NEW_TABLERO = process.env.HUB_TABLERO_ID!;
const NEW_HISTORIAL = process.env.HUB_HISTORIAL_ID!;

const mappings = [
    // Configuraciones (RRHH)
    { sourceId: OLD_HUB, tabName: 'Config_Minimos', targetId: NEW_CONFIG },
    { sourceId: OLD_HUB, tabName: 'Config_Escalas', targetId: NEW_CONFIG },
    { sourceId: OLD_TARGET, tabName: 'Ajustes', targetId: NEW_CONFIG },
    
    // Gastos y Movilidad
    { sourceId: OLD_TARGET, tabName: 'BDGASTOS', targetId: NEW_GASTOS },
    { sourceId: OLD_SOURCE, tabName: 'KMS', targetId: NEW_GASTOS },
    { sourceId: OLD_SOURCE, tabName: 'Kms & $', targetId: NEW_GASTOS },
    { sourceId: OLD_SOURCE, tabName: 'Amort_DCAC', targetId: NEW_GASTOS },
    { sourceId: OLD_HUB, tabName: 'Config_GastosOficinas', targetId: NEW_GASTOS },
];

async function copyTabs() {
    try {
        console.log("Comenzando migración de pestañas...");
        for (const mapping of mappings) {
            // Get source spreadsheet metadata to find the sheetId
            const meta = await sheets.spreadsheets.get({ spreadsheetId: mapping.sourceId });
            const sheet = meta.data.sheets?.find(s => s.properties?.title === mapping.tabName);
            if (!sheet || !sheet.properties?.sheetId) {
                console.log(`[WARN] No se encontró la pestaña ${mapping.tabName} en ${mapping.sourceId}`);
                continue;
            }

            console.log(`Copiando ${mapping.tabName}...`);
            const response = await sheets.spreadsheets.sheets.copyTo({
                spreadsheetId: mapping.sourceId,
                sheetId: sheet.properties.sheetId,
                requestBody: {
                    destinationSpreadsheetId: mapping.targetId
                }
            });
            
            // Rename the copied tab to remove "Copy of" or "Copia de"
            const newSheetId = response.data.sheetId;
            if (newSheetId) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: mapping.targetId,
                    requestBody: {
                        requests: [{
                            updateSheetProperties: {
                                properties: {
                                    sheetId: newSheetId,
                                    title: mapping.tabName
                                },
                                fields: "title"
                            }
                        }]
                    }
                });
            }
        }

        // Delete "Hoja 1" or "Sheet1" default tab from all new spreadsheets to clean up
        const targetSpreadsheets = [NEW_CONFIG, NEW_GASTOS, NEW_CIERRES, NEW_TABLERO, NEW_HISTORIAL];
        for (const tid of targetSpreadsheets) {
            try {
                const meta = await sheets.spreadsheets.get({ spreadsheetId: tid });
                const defaultSheet = meta.data.sheets?.find(s => s.properties?.title === 'Hoja 1' || s.properties?.title === 'Sheet1');
                if (defaultSheet && meta.data.sheets && meta.data.sheets.length > 1) {
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId: tid,
                        requestBody: {
                            requests: [{
                                deleteSheet: { sheetId: defaultSheet.properties?.sheetId }
                            }]
                        }
                    });
                }
            } catch(e) {}
        }
        
        console.log("¡Migración estructural completada!");

    } catch (e: any) {
        console.error("Error en migración:", e.message);
    }
}

copyTabs();
