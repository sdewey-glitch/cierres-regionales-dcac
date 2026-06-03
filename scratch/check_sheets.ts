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
    const spreadsheetId = config.TARGET_SPREADSHEET_ID;

    try {
        const resSueldos = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "'BDsueldos'!A1:AZ1",
        });
        console.log("BDsueldos full headers:", resSueldos.data.values?.[0] || "No values found");
    } catch (err: any) {
        console.error("Error reading BDsueldos headers:", err.message);
    }
}

main().catch(console.error);
