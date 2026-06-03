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
    
    // Read periods row
    const resPeriods = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'PLM-Resultados_Ajuste'!AA2:AZ2",
    });
    const periods = resPeriods.data.values?.[0] || [];

    // Read Faena share row
    const resFaena = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'PLM-Resultados_Ajuste'!AA24:AZ28",
    });
    const rows = resFaena.data.values || [];

    console.log("Periods from AA:", periods);
    const labels = ["Faena", "Invernada", "Invernada Neo", "Cria", "MAG"];
    for (let i = 0; i < rows.length; i++) {
        console.log(`\nRow ${labels[i]}:`);
        for (let j = 0; j < periods.length; j++) {
            console.log(`  ${periods[j]}: ${rows[i][j]}`);
        }
    }
}

main().catch(console.error);
