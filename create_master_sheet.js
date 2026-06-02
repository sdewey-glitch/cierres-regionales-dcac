const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail,
        private_key: (process.env.Google_key || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

async function createMasterSheet() {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        console.log("Creating new Spreadsheet...");
        const spreadsheet = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: 'Hub Cierres - Base de Datos Maestra'
                }
            }
        });
        console.log("Created", spreadsheet.data.spreadsheetId);
    } catch (error) {
        console.error('Error creating spreadsheet:', error.errors ? JSON.stringify(error.errors) : error.message);
    }
}

createMasterSheet();
