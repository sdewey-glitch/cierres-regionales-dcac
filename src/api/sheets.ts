import { google } from 'googleapis';
import { config } from '../config/env';

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
}

export async function readSheet(spreadsheetId: string, range: string): Promise<any[][]> {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
    });
    return res.data.values || [];
}

export async function writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
}

export async function appendSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
    });
}

export async function clearSheetRange(spreadsheetId: string, range: string): Promise<void> {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
    });
}


export async function createSheetIfNotExists(spreadsheetId: string, sheetName: string): Promise<void> {
    const sheets = getSheetsClient();
    
    // Check if sheet already exists
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = metadata.data.sheets?.some(s => s.properties?.title === sheetName);
    
    if (exists) {
        console.log(`[sheets] Hoja '${sheetName}' ya existe`);
        return;
    }
    
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                addSheet: {
                    properties: {
                        title: sheetName
                    }
                }
            }]
        }
    });
    
    console.log(`[sheets] ✅ Hoja '${sheetName}' creada`);
}
