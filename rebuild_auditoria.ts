import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
dotenv.config();

const HUB_HISTORIAL_ID = process.env.HUB_HISTORIAL_ID!;

async function run() {
    console.log("Generando Base de Tropas Congeladas...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_MAIL,
            private_key: process.env.GOOGLE_KEY ? process.env.GOOGLE_KEY.replace(/\\n/g, '\n') : ''
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({version: 'v4', auth});

    // Crear la pestaña si no existe
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_HISTORIAL_ID });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Auditoria_Lotes_Congelados');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_HISTORIAL_ID,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Auditoria_Lotes_Congelados' } }
                    }]
                }
            });
            console.log("Pestaña Auditoria_Lotes_Congelados creada en el HUB.");
        }
    } catch(e) { console.log("Error verificando/creando pestaña:", e); }

    const snapshotsDir = path.join(__dirname, 'src/core/snapshots');
    if (!fs.existsSync(snapshotsDir)) {
        console.log("No hay snapshots guardados aún.");
        return;
    }

    const files = fs.readdirSync(snapshotsDir).filter(f => f.endsWith('.json'));
    const allRows: any[][] = [];
    const headers = [
        'Año', 'Mes', 'AñoMes', 'Comercial (Propietario del Result)', 'Lote ID', 'Fecha Operacion', 
        'Soc. Vendedora', 'Soc. Compradora', 'Cantidad Cabezas', 
        'Categoria', 'Resultado ID', 'Comercial Venta', 'Comercial Compra'
    ];

    for (const file of files) {
        const mesMatch = file.match(/cierre_(\d{4})_(\d{2})\.json/);
        if (!mesMatch) continue;
        const año = mesMatch[1];
        const mes = mesMatch[2];
        const añoMes = `${año}${mes}`;
        
        const data = JSON.parse(fs.readFileSync(path.join(snapshotsDir, file), 'utf8'));
        
        for (const res of data) {
            if (res.operacionesDetalle && Array.isArray(res.operacionesDetalle)) {
                for (const op of res.operacionesDetalle) {
                    allRows.push([
                        año,
                        mes,
                        añoMes,
                        res.asociadoComercial,
                        op.id_lote,
                        op.fecha_operacion,
                        op.sociedad_vendedora,
                        op.sociedad_compradora,
                        op.cantidad,
                        op.categoria,
                        op.resultado_id,
                        op.comercial_venta,
                        op.comercial_compra
                    ]);
                }
            }
        }
    }

    console.log(`Subiendo ${allRows.length} lotes congelados al HUB...`);

    // Limpiar y escribir
    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_HISTORIAL_ID,
        range: 'Auditoria_Lotes_Congelados!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_HISTORIAL_ID,
        range: 'Auditoria_Lotes_Congelados!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [headers, ...allRows]
        }
    });

    console.log("¡Auditoría de lotes completada exitosamente!");

    // ----------------------------------------------------
    // NUEVA LÓGICA: Generar "Snapshots_Agrupados" (Sintetizado)
    // Se guarda en HUB_CIERRES_ID (Liquidaciones)
    // ----------------------------------------------------
    const HUB_CIERRES_ID = process.env.HUB_CIERRES_ID!;
    
    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId: HUB_CIERRES_ID });
        const exists = metadata.data.sheets?.some(s => s.properties?.title === 'Snapshots_Agrupados');
        if (!exists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: HUB_CIERRES_ID,
                requestBody: {
                    requests: [{
                        addSheet: { properties: { title: 'Snapshots_Agrupados' } }
                    }]
                }
            });
            console.log("Pestaña Snapshots_Agrupados creada en el HUB CIERRES.");
        }
    } catch(e) { console.log("Error verificando/creando pestaña Snapshots_Agrupados:", e); }

    const groupedHeaders = [
        'Año', 'Mes', 'AñoMes', 'ID Usuario', 'Comercial', 'Email', 'Provincia', 'Oficina',
        'Sueldo Bruto', 'Mínimo Garantizado', 'Total Cabezas (Gral)', 'Importe Gral'
    ];
    const groupedRows: any[][] = [];

    for (const file of files) {
        const mesMatch = file.match(/cierre_(\d{4})_(\d{2})\.json/);
        if (!mesMatch) continue;
        const año = mesMatch[1];
        const mes = parseInt(mesMatch[2], 10);
        const añoMes = `${año}${mesMatch[2]}`;
        
        const data = JSON.parse(fs.readFileSync(path.join(snapshotsDir, file), 'utf8'));
        
        for (const res of data) {
            groupedRows.push([
                año,
                mes,
                añoMes,
                res.idUsuario || '',
                res.asociadoComercial,
                res.mail || '',
                res.provincia || '',
                res.oficina || '',
                res.sueldoBruto || 0,
                res.minimo || 0,
                res.cabezasGeneral || 0,
                res.importeGen || 0
            ]);
        }
    }

    console.log(`Subiendo ${groupedRows.length} filas agrupadas a Snapshots_Agrupados...`);

    await sheets.spreadsheets.values.clear({
        spreadsheetId: HUB_CIERRES_ID,
        range: 'Snapshots_Agrupados!A1:Z'
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: HUB_CIERRES_ID,
        range: 'Snapshots_Agrupados!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [groupedHeaders, ...groupedRows]
        }
    });

    try {
        const { formatSheetNumbers } = require('./src/api/sheets');
        await formatSheetNumbers(HUB_CIERRES_ID, 'Snapshots_Agrupados', 8, 10); // Sueldo y Minimo
        await formatSheetNumbers(HUB_CIERRES_ID, 'Snapshots_Agrupados', 10, 12); // Cabezas e importe
    } catch(e) { console.log("Formato no aplicado", e); }

    console.log("¡Snapshots agrupados generados exitosamente!");
}

run().catch(console.error);
