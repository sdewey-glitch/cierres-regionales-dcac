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
    const range = "'PLM-Resultados_Ajuste'!A20:Z35";

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: 'FORMULA', // We want to see the formulas as requested!
        });
        console.log("Formula values:");
        console.log(JSON.stringify(res.data.values, null, 2));

        const resRaw = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: 'UNFORMATTED_VALUE',
        });
        console.log("Raw values:");
        console.log(JSON.stringify(resRaw.data.values, null, 2));
    } catch (err: any) {
        console.error("Error reading PLM sheet:", err.message);
    }
}

main().catch(console.error);
