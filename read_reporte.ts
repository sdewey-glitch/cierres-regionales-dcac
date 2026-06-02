import { google } from 'googleapis';
import { config } from './src/config/env';

async function readSheet() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: config.GOOGLE_MAIL,
            private_key: config.GOOGLE_KEY
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'Reporte Mensual Oficina AC'!A1:Z100`, 
        });

        const rows = response.data.values;
        if (rows && rows.length) {
            const torrigliaRows = rows.filter(r => r.some(c => String(c).toLowerCase().includes('valentin torriglia')));
            console.log("Valentin Torriglia in Reporte Mensual Oficina AC:");
            torrigliaRows.forEach(r => console.log(r.join(' | ')));
            
            // Also print row 1 and 2 for context/headers
            console.log("\nHeaders:");
            console.log(rows[0].join(' | '));
            console.log(rows[1]?.join(' | '));
        }
    } catch (err: any) {
        console.error('Error al leer la planilla:', err.message);
    }
}
readSheet();
