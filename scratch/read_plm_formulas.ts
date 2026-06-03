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
    const spreadsheetId = '15m8oNaPo5mmhziv6JQUMkpylTO9gDJjVjFcAd16SWMA';
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'PLM-Resultados_Ajuste'!A13:O24", // Let's check cols A to O
        valueRenderOption: 'FORMULA',
    });

    const values = res.data.values || [];
    for (let i = 0; i < values.length; i++) {
        const rowNum = 20 + i;
        console.log(`Row ${rowNum}:`, JSON.stringify(values[i]));
    }
}

main().catch(console.error);
