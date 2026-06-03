import { google } from 'googleapis';
import { config } from '../src/config/env';
import 'dotenv/config';

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
}

async function run() {
    const sheets = getSheetsClient();
    const spreadsheetId = '15m8oNaPo5mmhziv6JQUMkpylTO9gDJjVjFcAd16SWMA';
    const range = "'PLM-Resultados_Ajuste'!A1:Z35";

    const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
    });

    const sheet = response.data.sheets?.[0];
    if (!sheet || !sheet.data || !sheet.data[0].rowData) {
        console.log("No data found.");
        return;
    }

    const rows = sheet.data[0].rowData;
    rows.forEach((row, rowIndex) => {
        const rowValues = row.values?.map(v => {
            if (v.userEnteredValue?.formulaValue) {
                return `[FORMULA: ${v.userEnteredValue.formulaValue}]`;
            } else if (v.formattedValue) {
                return v.formattedValue;
            }
            return '';
        }).join(' | ') || '';
        console.log(`Row ${rowIndex + 1}: ${rowValues}`);
    });
}

run().catch(console.error);
