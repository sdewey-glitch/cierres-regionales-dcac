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
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("=== Hojas disponibles ===");
        metadata.data.sheets?.forEach(s => console.log(s.properties?.title, "ID:", s.properties?.sheetId));

        // Read the "1. RESUMEN" sheet if it exists
        const summarySheet = metadata.data.sheets?.find(s => s.properties?.title?.toUpperCase().includes('RESUMEN'));
        if (summarySheet) {
            console.log(`\n=== Leyendo: ${summarySheet.properties?.title} ===`);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${summarySheet.properties?.title}'!A1:Z50`, 
            });

            const rows = response.data.values;
            if (rows && rows.length) {
                // Find Valentin Torriglia's row
                const valentinRow = rows.find(r => r.some(cell => String(cell).toLowerCase().includes('valentin torriglia')));
                if (valentinRow) {
                    console.log("Valentin Torriglia Summary Row:");
                    console.log(valentinRow.join(' | '));
                    
                    // Print headers for context
                    const headers = rows.find(r => r.some(cell => String(cell).toLowerCase().includes('comercial')));
                    if (headers) {
                        console.log("\nHeaders:");
                        console.log(headers.join(' | '));
                    }
                } else {
                    console.log("Valentin not found in summary");
                }
            }
        }
    } catch (err: any) {
        console.error('Error al leer la planilla:', err.message);
    }
}
readSheet();
