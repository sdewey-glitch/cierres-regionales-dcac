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
        range: "'PLM-Resultados_Ajuste'!A2:AZ2",
        valueRenderOption: 'UNFORMATTED_VALUE',
    });

    console.log("Row 2 (Periods):", JSON.stringify(res.data.values?.[0] || []));
}

main().catch(console.error);
