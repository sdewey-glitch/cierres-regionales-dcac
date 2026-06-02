const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail || process.env.GOOGLE_MAIL,
        private_key: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

async function migrateData() {
    const sheets = google.sheets({ version: 'v4', auth });
    const sourceSpreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';
    const targetSpreadsheetId = process.env.HUB_SPREADSHEET_ID;

    try {
        console.log("Reading source data...");
        // Read Escalas
        const escalasRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sourceSpreadsheetId,
            range: "'ESCALAS RAC AC'!A1:F30"
        });
        
        // Read Ajustes
        const ajustesRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sourceSpreadsheetId,
            range: "'Ajustes'!A1:D30"
        });

        console.log("Escalas from Source:");
        console.log(escalasRes.data.values.slice(0, 10));

        console.log("\nAjustes from Source:");
        console.log(ajustesRes.data.values ? ajustesRes.data.values.slice(0, 10) : "No data or sheet");

        // Write to Target
        // We will do a generic copy for now to just get the data in there.
        // If they have complex structures, the user will adjust them in the new sheet anyway.
        
        // We need to know what they actually use. From Simulator.tsx we know they need:
        // Categoria (string), Minimo (number), Porcentaje Bolsa (number).
        
        // Let's just write the raw data we found to the Config_Escalas so the user can see it
        await sheets.spreadsheets.values.update({
            spreadsheetId: targetSpreadsheetId,
            range: 'Config_Escalas!A1:F30',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: escalasRes.data.values
            }
        });

        if (ajustesRes.data.values) {
            await sheets.spreadsheets.values.update({
                spreadsheetId: targetSpreadsheetId,
                range: 'Config_Ajustes!A1:D30',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: ajustesRes.data.values
                }
            });
        }
        
        console.log("Data migrated to new Master Sheet!");

    } catch (error) {
        console.error('Error:', error.message);
    }
}

migrateData();
