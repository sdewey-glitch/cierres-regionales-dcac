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
    
    console.log("Reading all columns from Import3599...");
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Import3599'!A1:AO",
        valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = res.data.values || [];
    console.log("Import3599 rows:", rows.length);
    if (rows.length === 0) return;

    const idxFechaOp = 3; // Col D
    const idxUN = 6;      // Col G
    const idxResult = 15; // Col P
    const idxCanalV = 30; // Col AE
    const idxCanalC = 31; // Col AF
    const idxEstado = 24; // Col Y
    const idxCierre = 40; // Col AO

    const p202603 = rows.slice(1).filter(r => {
        const period = String(r[idxFechaOp]).trim();
        return period === '202603';
    });

    console.log("202603 rows:", p202603.length);

    const totals: Record<string, number> = {
        'Faena': 0,
        'Invernada': 0,
        'Invernada Neo': 0,
        'Cria': 0,
        'MAG': 0
    };

    for (const r of p202603) {
        const estado = String(r[idxEstado] || '').trim().toUpperCase();
        const cierre = Number(r[idxCierre] || 0);

        if (estado !== 'CONCRETADA' || cierre !== 1) {
            continue;
        }

        const un = String(r[idxUN] || '').trim();
        const resultadoFinal = Number(r[idxResult] || 0);
        const canalVenta = String(r[idxCanalV] || '').trim().toUpperCase();
        const canalCompra = String(r[idxCanalC] || '').trim().toUpperCase();

        let regionalAlloc = 0;
        if (canalVenta === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (2/3);
        }
        if (canalCompra === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (1/3);
        }

        if (regionalAlloc === 0) continue;

        let mappedUn = un;
        if (un.toLowerCase().includes('faena')) mappedUn = 'Faena';
        else if (un.toLowerCase() === 'invernada neo') mappedUn = 'Invernada Neo';
        else if (un.toLowerCase().includes('invernada')) mappedUn = 'Invernada';
        else if (un.toLowerCase().includes('cria') || un.toLowerCase().includes('cría')) mappedUn = 'Cria';
        else if (un.toLowerCase().includes('mag')) mappedUn = 'MAG';

        if (totals[mappedUn] !== undefined) {
            totals[mappedUn] += regionalAlloc;
        }
    }

    console.log("\n202603 Results calculated from Import3599:");
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    console.log("Sum:", sum);
    for (const [un, val] of Object.entries(totals)) {
        const share = sum > 0 ? val / sum : 0;
        console.log(`UN ${un}: Val: ${Math.round(val)} -> Share: ${(share * 100).toFixed(2)}%`);
    }
}

main().catch(console.error);
