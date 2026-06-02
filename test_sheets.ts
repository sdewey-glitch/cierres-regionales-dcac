import { google } from 'googleapis';
import { config } from './src/config/env';

async function test() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const res = await sheets.spreadsheets.get({
        spreadsheetId: config.SOURCE_SPREADSHEET_ID
    });
    console.log("SOURCE Title:", res.data.properties?.title);

    const res2 = await sheets.spreadsheets.get({
        spreadsheetId: config.TARGET_SPREADSHEET_ID
    });
    console.log("TARGET Title:", res2.data.properties?.title);
}
test();
