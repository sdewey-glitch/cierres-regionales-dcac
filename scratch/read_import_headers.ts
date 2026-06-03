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
    
    // Read A11
    const resA11 = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'PLM-Resultados_Ajuste'!A11:B11",
    });
    console.log("A11 value:", resA11.data.values?.[0] || []);

    // Read column headers of Import3599
    const resHeaders = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Import3599'!A1:BA1",
    });
    const headers = resHeaders.data.values?.[0] || [];
    for (let i = 0; i < headers.length; i++) {
        const colLetter = getColumnLetter(i + 1);
        console.log(`Col ${colLetter} (${i+1}): ${headers[i]}`);
    }
}

function getColumnLetter(colNum: number): string {
    let temp: number;
    let letter = '';
    while (colNum > 0) {
        temp = (colNum - 1) % 26;
        letter = String.fromCharCode(65 + temp) + letter;
        colNum = Math.floor((colNum - temp) / 26);
    }
    return letter;
}

main().catch(console.error);
