const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail,
        private_key: (process.env.Google_key || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

async function setupHeaders() {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.HUB_SPREADSHEET_ID;

    console.log(`Setting up headers for ${spreadsheetId}...`);

    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        
        function getSheetId(title) {
            const sheet = metadata.data.sheets.find(s => s.properties.title === title);
            return sheet ? sheet.properties.sheetId : null;
        }

        const requests = [
            {
                updateCells: {
                    range: { sheetId: getSheetId('Config_Ajustes'), startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
                    rows: [{ values: [{ userEnteredValue: { stringValue: 'Clave' } }, { userEnteredValue: { stringValue: 'Valor' } }] }],
                    fields: 'userEnteredValue'
                }
            },
            {
                updateCells: {
                    range: { sheetId: getSheetId('Config_Escalas'), startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
                    rows: [{ values: [{ userEnteredValue: { stringValue: 'Categoria' } }, { userEnteredValue: { stringValue: 'Minimo_Base' } }, { userEnteredValue: { stringValue: 'Porcentaje_Bolsa' } }] }],
                    fields: 'userEnteredValue'
                }
            },
            {
                updateCells: {
                    range: { sheetId: getSheetId('Perfiles_Accesos'), startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
                    rows: [{ values: [{ userEnteredValue: { stringValue: 'Email' } }, { userEnteredValue: { stringValue: 'Rol' } }] }],
                    fields: 'userEnteredValue'
                }
            },
            {
                updateCells: {
                    range: { sheetId: getSheetId('Historial_Envios'), startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
                    rows: [{ values: [
                        { userEnteredValue: { stringValue: 'ID' } },
                        { userEnteredValue: { stringValue: 'Fecha' } },
                        { userEnteredValue: { stringValue: 'Mes_Año' } },
                        { userEnteredValue: { stringValue: 'Agente' } },
                        { userEnteredValue: { stringValue: 'Cabezas' } },
                        { userEnteredValue: { stringValue: 'Sueldo_Final' } },
                        { userEnteredValue: { stringValue: 'Ajustes' } },
                        { userEnteredValue: { stringValue: 'Minimo_Exigido' } },
                        { userEnteredValue: { stringValue: 'PDF_Link' } },
                        { userEnteredValue: { stringValue: 'Estado_Email' } }
                    ] }],
                    fields: 'userEnteredValue'
                }
            }
        ];

        // Filter out any missing sheets if user didn't create them perfectly
        const validRequests = requests.filter(r => r.updateCells.range.sheetId !== null);

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests: validRequests }
        });
        
        console.log("Headers setup successfully!");

        // Write some initial data to Escalas
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Config_Escalas!A2:C6',
            valueInputOption: 'RAW',
            resource: {
                values: [
                    ['General', 3200000, 0.175],
                    ['Hibrido', 3500000, 0.190],
                    ['Hibrido Plus', 3550000, 0.190],
                    ['Top AC', 3850000, 0.220],
                    ['VIP', 4850000, 0.225]
                ]
            }
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Config_Ajustes!A2:B2',
            valueInputOption: 'RAW',
            resource: {
                values: [
                    ['aumento_minimos_pct', 0]
                ]
            }
        });
        
        console.log("Initial data seeded!");

    } catch (error) {
        console.error('Error:', error.message);
    }
}

setupHeaders();
