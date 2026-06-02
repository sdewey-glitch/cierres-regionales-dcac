import { google } from 'googleapis';
import { config } from './src/config/env';

async function main() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // List all tabs in both spreadsheets
    const source = await sheets.spreadsheets.get({ spreadsheetId: config.SOURCE_SPREADSHEET_ID });
    console.log('=== SOLAPAS SOURCE (V3.0) ===');
    source.data.sheets?.forEach(s => console.log('  -', s.properties?.title));

    const target = await sheets.spreadsheets.get({ spreadsheetId: config.TARGET_SPREADSHEET_ID });
    console.log('\n=== SOLAPAS TARGET (V4) ===');
    target.data.sheets?.forEach(s => console.log('  -', s.properties?.title));

    // Now read formulas from key calculation tabs  
    // Read with FORMULA render option to see formulas
    const formulaSheets = sheets.spreadsheets.values;
    
    // Try to read the main calculation sheet - look for something like "Cierre" or "Liquidacion"
    for (const tabName of ['Cierre', 'Liquidacion', 'Calculo', 'CIERRES', 'Comp Personal', 'Comp Regional', 'Comp Oficina']) {
        try {
            const res = await formulaSheets.get({
                spreadsheetId: config.SOURCE_SPREADSHEET_ID,
                range: `'${tabName}'!A1:AZ5`,
                valueRenderOption: 'FORMULA',
            });
            console.log(`\n=== FORMULAS: ${tabName} (primeras 5 filas) ===`);
            res.data.values?.forEach((row, i) => {
                const nonEmpty = row.filter(c => c && String(c).startsWith('='));
                if (nonEmpty.length > 0) {
                    console.log(`  Fila ${i+1}:`, nonEmpty.slice(0, 5).join(' | '));
                }
            });
        } catch {
            // Tab doesn't exist, skip
        }
    }

    // Read the ESCALAS tab with formulas
    try {
        const escalas = await formulaSheets.get({
            spreadsheetId: config.SOURCE_SPREADSHEET_ID,
            range: `'ESCALAS RAC AC'!A1:L5`,
            valueRenderOption: 'FORMULA',
        });
        console.log('\n=== ESCALAS RAC AC (headers + first rows) ===');
        escalas.data.values?.forEach((row, i) => console.log(`  Fila ${i+1}:`, row.join(' | ')));
    } catch { console.log('No se pudo leer ESCALAS RAC AC'); }
}

main().catch(console.error);
