import { google } from 'googleapis';
import { config } from './src/config/env';
import * as fs from 'fs';

async function compareLotes() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: config.GOOGLE_MAIL,
            private_key: config.GOOGLE_KEY
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';

    // Read the main report sheet "Reporte Mensual Oficina AC" - all rows
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'Reporte Mensual Oficina AC'!A1:Z500`,
    });

    const rows = response.data.values || [];
    console.log(`Total rows in sheet: ${rows.length}`);
    
    // Find the header row and Valentín's section
    // The sheet has a structure: first row is "202604 | Valentin Torriglia | ..."
    // Then lote rows with numeric IDs > 30000 (Invernada) or > 100000 (Faena)
    
    const sheetLotes: { id: number, tipo: string, fecha: string, vendedora: string, compradora: string, cant: number, cat: string, impVend: string, impComp: string, resultado: string, acVend: string, acComp: string }[] = [];
    
    let inValentinSection = false;
    
    for (const row of rows) {
        const col0 = String(row[0] || '').trim();
        const col1 = String(row[1] || '').trim();
        
        // Detect if we're in Valentín's section
        if (col1.toLowerCase().includes('valentin torriglia')) {
            inValentinSection = true;
            console.log(`\nDetectada sección Valentín en fila: ${col0} | ${col1}`);
            continue;
        }
        
        // Only process if we're in Valentín's section
        if (!inValentinSection) continue;
        
        // A real lote ID is > 30000
        const id = Number(col0);
        if (!isNaN(id) && id >= 30000) {
            sheetLotes.push({
                id,
                tipo: col1,
                fecha: String(row[2] || ''),
                vendedora: String(row[3] || ''),
                compradora: String(row[4] || ''),
                cant: Number(String(row[5] || '0').replace(/,/g, '')) || 0,
                cat: String(row[6] || ''),
                impVend: String(row[7] || ''),
                impComp: String(row[8] || ''),
                resultado: String(row[9] || ''),
                acVend: String(row[10] || ''),
                acComp: String(row[11] || ''),
            });
        }
        
        // Stop when we hit an empty row or a new section header
        if (!col0 && !col1 && !String(row[2] || '').trim()) {
            // Check if it's really empty or just a blank row  
            if (sheetLotes.length > 10) {
                // We likely hit the end of Valentín's section
                break;
            }
        }
    }

    const sheetIds = sheetLotes.map(l => l.id).sort((a, b) => a - b);
    console.log(`\nSheet lotes (${sheetLotes.length}):`, JSON.stringify(sheetIds));
    
    const sheetCabezas = sheetLotes.reduce((s, l) => s + l.cant, 0);
    console.log(`Sheet cabezas total: ${sheetCabezas}`);

    // 2. Load web app lotes from snapshot
    const snapshot = JSON.parse(fs.readFileSync('./src/core/snapshots/cierre_2026_04.json', 'utf8'));
    const valentin = snapshot.find((x: any) => x.asociadoComercial.toLowerCase().includes('valentin'));
    const webLotes = valentin.operacionesDetalle.map((l: any) => ({
        id: Number(l.id_lote),
        tipo: l.tipo,
        fecha: l.fecha_operacion,
        vendedora: l.sociedad_vendedora,
        compradora: l.sociedad_compradora,
        cant: l.cantidad,
    }));
    const webIds = webLotes.map((l: any) => l.id).sort((a: number, b: number) => a - b);
    console.log(`Web lotes (${webLotes.length}):`, JSON.stringify(webIds));
    
    const webCabezas = webLotes.reduce((s: number, l: any) => s + l.cant, 0);
    console.log(`Web cabezas total: ${webCabezas}`);

    // 3. Compare
    const sheetSet = new Set(sheetIds);
    const webSet = new Set(webIds);

    const soloEnSheet = sheetLotes.filter(l => !webSet.has(l.id));
    const soloEnWeb = webLotes.filter((l: any) => !sheetSet.has(l.id));
    const enAmbos = sheetIds.filter(id => webSet.has(id));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULTADO DE COMPARACIÓN`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ En ambos: ${enAmbos.length} lotes`);
    console.log(`🔴 Solo en Sheet (faltan en web): ${soloEnSheet.length} lotes`);
    console.log(`🟡 Solo en Web (extras): ${soloEnWeb.length} lotes`);

    if (soloEnSheet.length > 0) {
        console.log(`\n--- LOTES FALTANTES EN WEB APP (están en el Sheet) ---`);
        console.log('ID\t| Tipo\t\t| Fecha\t\t\t| Cant\t| Cat\t\t| Vendedora\t\t\t\t| Compradora');
        console.log('-'.repeat(140));
        let cabFaltantes = 0;
        soloEnSheet.forEach(l => {
            cabFaltantes += l.cant;
            console.log(`${l.id}\t| ${l.tipo}\t| ${l.fecha}\t| ${l.cant}\t| ${l.cat}\t| ${l.vendedora.substring(0,35)}\t| ${l.compradora.substring(0,35)}`);
        });
        console.log(`\nTotal cabezas faltantes: ${cabFaltantes}`);
    }

    if (soloEnWeb.length > 0) {
        console.log(`\n--- LOTES EXTRAS EN WEB APP (no en Sheet) ---`);
        soloEnWeb.forEach((l: any) => {
            console.log(`${l.id}\t| ${l.tipo}\t| ${l.fecha}\t| ${l.cant} cab\t| ${l.vendedora} → ${l.compradora}`);
        });
    }
}

compareLotes().catch(e => console.error(e));
