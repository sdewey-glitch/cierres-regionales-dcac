import { google } from 'googleapis';
import { config } from './src/config/env';

async function main() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const SID = config.SOURCE_SPREADSHEET_ID;

    // Reporte Mensual Oficina AC - COMPLETE
    console.log('=== Reporte Mensual Oficina AC - COMPLETO ===');
    const ofi = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SID, 
        range: "'Reporte Mensual Oficina AC'!A1:T30", 
        valueRenderOption: 'FORMULA' 
    });
    ofi.data.values?.forEach((row, i) => {
        const cells = row.map((c: any, j: number) => {
            if (!c || String(c).length < 2) return null;
            return `[Col${j}] ${c}`;
        }).filter(Boolean);
        if (cells.length > 0) console.log(`\nFila ${i+1}:\n  ${cells.join('\n  ')}`);
    });

    // Also read the Oficina component formula in Reporte Mensual AC more carefully
    console.log('\n\n=== Reporte Mensual AC - Filas 5-18 (Componentes) ===');
    const rep = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SID, 
        range: "'Reporte Mensual AC'!A5:R18", 
        valueRenderOption: 'FORMULA' 
    });
    rep.data.values?.forEach((row, i) => {
        const cells = row.map((c: any, j: number) => {
            if (!c || String(c).length < 2) return null;
            return `[Col${j}] ${c}`;
        }).filter(Boolean);
        if (cells.length > 0) console.log(`\nFila ${i+5}:\n  ${cells.join('\n  ')}`);
    });

    // Read the Roster structure to understand tipo/modalidad
    console.log('\n\n=== Roster Headers ===');
    const roster = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SID, 
        range: "'Import Roster'!A1:AA1", 
        valueRenderOption: 'FORMATTED_VALUE' 
    });
    roster.data.values?.[0]?.forEach((c: any, j: number) => {
        if (c) console.log(`  Col${j}: ${c}`);
    });

    // Read a few roster entries for Rio 4to to check tipo
    console.log('\n\n=== Roster - Agentes con Oficina ===');
    const rdata = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SID, 
        range: "'Import Roster'!A2:G50", 
        valueRenderOption: 'FORMATTED_VALUE' 
    });
    rdata.data.values?.forEach((row, i) => {
        if (row[4] && (row[4].includes('Rio') || row[4].includes('Entre') || row[4].includes('Buenos'))) {
            console.log(`  ${row[0]} | Tipo: ${row[5]} | Oficina: ${row[4]} | Modalidad: ${row[6]}`);
        }
    });
}

main().catch(console.error);
