require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});
    const oldId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';
    const newId = process.env.HUB_SPREADSHEET_ID;

    console.log("Fetching old sheet data...");
    const oldData = await sheets.spreadsheets.values.get({
        spreadsheetId: oldId,
        range: 'ESCALAS RAC AC!A4:L100' // Data starts at row 4
    });

    const rows = oldData.data.values || [];
    
    // Parse Config_Minimos
    const minimosHeader = ['ID Categoría', 'Nombre Categoría', 'Año', 'Mes', 'AñoMes', 'Sueldo Mínimo', 'Tope / Extra'];
    const minimosValues = [minimosHeader];

    const categorias = [
        { id: 1, name: 'Top AC', colIndex: 2 },
        { id: 2, name: 'Corp', colIndex: 3 },
        { id: 3, name: 'General', colIndex: 4 },
        { id: 4, name: 'Acuerdo', colIndex: 5 },
        { id: 5, name: 'Hibrido', colIndex: 6 },
        { id: 6, name: 'Sin Minimo', colIndex: 7 },
        { id: 7, name: 'Operario Carga', colIndex: 8 },
        { id: 8, name: 'Operario Carga 2', colIndex: 9 },
        { id: 9, name: 'Operario Carga 3', colIndex: 10 },
        { id: 10, name: 'Operario Carga 4', colIndex: 11 },
    ];

    const escalasHeader = ['Tipo de Escala', 'Año', 'Mes', 'AñoMes', 'Mínimo (%)', 'Máximo (%)', 'Tope Cabezas'];
    const escalasValues = [escalasHeader];

    const escalasFixed = [
        { tipo: 'escalaAC', min: 15, max: 30, tope: 4000 },
        { tipo: 'escalaPersonal', min: 14, max: 22, tope: 6000 },
        { tipo: 'escalaProvincial', min: 5, max: 10, tope: 15000 },
        { tipo: 'escalaOficina', min: 5, max: 20, tope: 2000 }
    ];

    let count = 0;
    for (const row of rows) {
        const ano = String(row[0]).trim();
        const anoMes = String(row[1]).trim();
        if (!ano || !anoMes) continue;
        
        const mes = anoMes.substring(4, 6);

        // Populate minimos
        for (const cat of categorias) {
            let valStr = String(row[cat.colIndex] || '0').replace(/,/g, '');
            let valNum = Number(valStr);
            if (isNaN(valNum)) valNum = 0;

            minimosValues.push([
                cat.id.toString(), cat.name, ano, mes, anoMes, valNum.toString(), '0'
            ]);
        }

        // Populate escalas (since old sheet had it fixed, we replicate for each month to normalize)
        for (const esc of escalasFixed) {
            escalasValues.push([
                esc.tipo, ano, mes, anoMes, esc.min.toString(), esc.max.toString(), esc.tope.toString()
            ]);
        }
        count++;
    }
    
    console.log(`Parsed ${count} historical months.`);

    // Prep new sheet
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: newId });
    const existingTitles = sheetMetadata.data.sheets.map(s => s.properties.title);
    
    const requests = [];
    if (!existingTitles.includes('Config_Minimos')) {
        requests.push({ addSheet: { properties: { title: 'Config_Minimos' } } });
    }
    if (!existingTitles.includes('Config_Escalas')) {
        requests.push({ addSheet: { properties: { title: 'Config_Escalas' } } });
    }
    
    const toDelete = ['Config_Mensual', 'Config_Ajustes']; // cleanup previous attempts
    for (const sheet of sheetMetadata.data.sheets) {
        if (toDelete.includes(sheet.properties.title)) {
            requests.push({ deleteSheet: { sheetId: sheet.properties.sheetId } });
        }
    }
    
    if (requests.length > 0) {
        console.log("Creating tabs in new sheet...");
        await sheets.spreadsheets.batchUpdate({ spreadsheetId: newId, requestBody: { requests } });
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("Writing Config_Minimos data...");
    await sheets.spreadsheets.values.update({
        spreadsheetId: newId,
        range: 'Config_Minimos!A1:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: minimosValues }
    });

    console.log("Writing Config_Escalas data...");
    await sheets.spreadsheets.values.update({
        spreadsheetId: newId,
        range: 'Config_Escalas!A1:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: escalasValues }
    });

    console.log("Historical migration complete!");
}

run().catch(console.error);
