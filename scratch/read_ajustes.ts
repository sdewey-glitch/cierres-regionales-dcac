import { google } from 'googleapis';
import { config } from '../src/config/env';
import 'dotenv/config';

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

async function main() {
    const sheets = getSheetsClient();
    const spreadsheetId = config.HUB_CONFIGURACIONES_ID;

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'Ajustes'!A1:G1000",
        });
        const rows = res.data.values || [];
        console.log(`Leídas ${rows.length} filas de Ajustes:`);
        
        // Mostrar cabecera
        console.log("Cabecera:", rows[0]);
        
        let found = 0;
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            // Mostrar filas de 2026 y mes 5
            if (row[0] === '2026' && row[1] === '5') {
                console.log(`Fila ${i + 1}:`, row);
                found++;
            }
        }
        console.log(`Encontradas ${found} filas para Mayo 2026.`);
    } catch (err: any) {
        console.error("Error reading Ajustes:", err.message);
    }
}

main().catch(console.error);
