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
    const spreadsheetId = process.env.HUB_SPREADSHEET_ID;

    // 1. Clear everything
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = sheetMetadata.data.sheets.map(s => s.properties.title);
    
    // Recreate basic sheets
    const requests = [];
    if (!existingSheets.includes('Config_Mensual')) {
        requests.push({ addSheet: { properties: { title: 'Config_Mensual' } } });
    }
    if (!existingSheets.includes('Historial_Envios')) {
        requests.push({ addSheet: { properties: { title: 'Historial_Envios' } } });
    }
    
    const sheetsToDelete = ['Config_Ajustes', 'Config_Escalas'];
    for (const sheet of sheetMetadata.data.sheets) {
        if (sheetsToDelete.includes(sheet.properties.title)) {
            requests.push({ deleteSheet: { sheetId: sheet.properties.sheetId } });
        }
    }
    
    try {
        if (requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
            // wait a sec for propagation
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch(e) {
        console.error('Error during recreation', e.message);
    }

    // Populate Config_Mensual
    const headers = [
        'Periodo (YYYYMM)', 'Min Top AC', 'Min Corp', 'Min General', 'Min Acuerdo', 
        'Min Hibrido', 'Min Sin Minimo', 'Min Operario', 
        'Esc Personal Min', 'Esc Personal Max', 'Esc Personal Tope', 
        'Esc Provincial Min', 'Esc Provincial Max', 'Esc Provincial Tope', 
        'Esc Oficina Min', 'Esc Oficina Max', 'Esc Oficina Tope', 
        'Esc AC Min', 'Esc AC Max', 'Esc AC Tope', 
        'Tope Faena Max', 'Tope Faena Min', 'Tope Invernada Max', 'Tope Invernada Min'
    ];
    
    const values = [
        headers,
        [
            '202604', '1000000', '1000000', '1000000', '1000000', '1000000', '0', '0',
            '14', '22', '6000', '5', '10', '15000', '5', '20', '2000', '15', '30', '4000',
            '6', '-2', '8', '-4.5'
        ],
        [
            '202605', '1000000', '1000000', '1000000', '1000000', '1000000', '0', '0',
            '14', '22', '6000', '5', '10', '15000', '5', '20', '2000', '15', '30', '4000',
            '6', '-2', '8', '-4.5'
        ]
    ];
    
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Config_Mensual!A1:Z10',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
    });
    console.log('Successfully initialized Config_Mensual');
}

run().catch(console.error);
