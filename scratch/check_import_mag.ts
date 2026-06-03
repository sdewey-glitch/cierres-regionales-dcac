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
    
    console.log("Reading from Import3599...");
    // Let's read all rows but only columns D (Fecha_op), G (UN), P (resultado_final), AE (Canal_Venta), AF (Canal_compra), AO (Cierre), Y (ESTADO)
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Import3599'!A1:AO", // Col A to AO (index 1 to 41)
        valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = res.data.values || [];
    console.log("Import3599 total rows:", rows.length);
    if (rows.length === 0) return;

    const headers = rows[0];
    
    // Find column indices (0-indexed)
    const idxFechaOp = 3; // Col D
    const idxUN = 6;      // Col G
    const idxResult = 15; // Col P
    const idxCanalV = 30; // Col AE
    const idxCanalC = 31; // Col AF
    const idxEstado = 24; // Col Y
    const idxCierre = 40; // Col AO

    console.log(`Indices: Fecha_op: ${idxFechaOp}, UN: ${idxUN}, result: ${idxResult}, canalV: ${idxCanalV}, canalC: ${idxCanalC}, estado: ${idxEstado}, cierre: ${idxCierre}`);
    
    // Let's filter for 202603
    const p202603 = rows.slice(1).filter(r => String(r[idxFechaOp]) === '202603');
    console.log("202603 total rows in Import3599:", p202603.length);

    const magRows = p202603.filter(r => String(r[idxUN]).trim().toUpperCase() === 'MAG');
    console.log("202603 MAG rows in Import3599:", magRows.length);

    if (magRows.length > 0) {
        console.log("Sample 202603 MAG row:", magRows[0]);
    }
}

main().catch(console.error);
