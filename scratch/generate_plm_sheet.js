require('dotenv').config();
const { google } = require('googleapis');
const { config } = require('../src/config/env');
const { fetchQ95 } = require('../src/api/metabase');

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

async function createSheetIfNotExists(spreadsheetId, sheetName) {
    const sheets = getSheetsClient();
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

async function writeSheet(spreadsheetId, range, values) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
}

async function clearSheetRange(spreadsheetId, range) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
    });
}

async function main() {
    console.log("Iniciando generación de la hoja 'Metricas PLM'...");
    
    // 1. Obtener datos Q95 de Metabase
    const data = await fetchQ95();
    console.log(`Leídos ${data.length} registros de Metabase`);

    // 2. Agrupar por Periodo (Fecha_op) y UN
    const results = {}; // period -> UN -> regionalResult
    const UN_LIST = ['Faena', 'Invernada', 'Invernada Neo', 'Cria', 'MAG'];

    for (const row of data) {
        const estado = String(row.ESTADO || row.estado || '').trim().toUpperCase();
        const cierre = Number(row.Cierre !== undefined ? row.Cierre : (row.cierre || 0));
        
        if (estado !== 'CONCRETADA' || cierre !== 1) {
            continue;
        }

        let period = String(row.Fecha_op || '').trim();
        if (!period && row.fecha_operacion) {
            const dateStr = String(row.fecha_operacion);
            if (dateStr.includes('-')) {
                period = dateStr.substring(0, 4) + dateStr.substring(5, 7);
            }
        }
        
        if (!period) continue;

        const un = String(row.UN || row.un || '').trim();
        const resultadoFinal = Number(row.resultado_final || row.resultado_final_ajustado || 0);

        const canalVenta = String(row.Canal_Venta || row.canal_venta || '').trim().toUpperCase();
        const canalCompra = String(row.Canal_compra || row.canal_compra || '').trim().toUpperCase();

        let regionalAlloc = 0;
        if (canalVenta === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (2/3);
        }
        if (canalCompra === 'REGIONAL') {
            regionalAlloc += resultadoFinal * (1/3);
        }

        if (regionalAlloc === 0) {
            continue;
        }

        if (!results[period]) {
            results[period] = {
                'Faena': 0,
                'Invernada': 0,
                'Invernada Neo': 0,
                'Cria': 0,
                'MAG': 0
            };
        }

        let mappedUn = un;
        if (un.toLowerCase().includes('faena')) mappedUn = 'Faena';
        else if (un.toLowerCase() === 'invernada neo') mappedUn = 'Invernada Neo';
        else if (un.toLowerCase().includes('invernada')) mappedUn = 'Invernada';
        else if (un.toLowerCase().includes('cria') || un.toLowerCase().includes('cría')) mappedUn = 'Cria';
        else if (un.toLowerCase().includes('mag')) mappedUn = 'MAG';

        if (results[period][mappedUn] !== undefined) {
            results[period][mappedUn] += regionalAlloc;
        }
    }

    // 3. Generar la secuencia de columnas
    // Años: 2023, 2024, 2025, 2026
    const columns = []; // { type: 'month'|'ytd', value: '202301'|'2023 YTD', year: 2023, month?: 1 }
    
    for (let year = 2023; year <= 2026; year++) {
        for (let month = 1; month <= 12; month++) {
            const pStr = `${year}${String(month).padStart(2, '0')}`;
            columns.push({ type: 'month', value: pStr, year, month });
        }
        columns.push({ type: 'ytd', value: `${year} YTD`, year });
    }

    // 4. Calcular los shares para cada columna
    const headerRow = ['Item', ...columns.map(c => c.value)];
    const shareRows = UN_LIST.map(unName => [unName]);

    // Para cada columna (mes o YTD)
    for (const col of columns) {
        if (col.type === 'month') {
            const p = col.value;
            const pData = results[p];
            
            let total = 0;
            if (pData) {
                total = Object.values(pData).reduce((a, b) => a + b, 0);
            }

            for (let i = 0; i < UN_LIST.length; i++) {
                const unName = UN_LIST[i];
                const val = pData ? (pData[unName] || 0) : 0;
                const share = total > 0 ? val / total : 0;
                // Guardar como número decimal, redondeado a 6 decimales
                shareRows[i].push(total > 0 ? Math.round(share * 1000000) / 1000000 : 0);
            }
        } else if (col.type === 'ytd') {
            const targetYear = col.year;
            
            // Sumar los resultados regionales de todo el año
            const ytdTotals = { 'Faena': 0, 'Invernada': 0, 'Invernada Neo': 0, 'Cria': 0, 'MAG': 0 };
            
            for (let month = 1; month <= 12; month++) {
                const p = `${targetYear}${String(month).padStart(2, '0')}`;
                const pData = results[p];
                if (pData) {
                    for (const unName of UN_LIST) {
                        ytdTotals[unName] += (pData[unName] || 0);
                    }
                }
            }

            const total = Object.values(ytdTotals).reduce((a, b) => a + b, 0);
            for (let i = 0; i < UN_LIST.length; i++) {
                const unName = UN_LIST[i];
                const val = ytdTotals[unName] || 0;
                const share = total > 0 ? val / total : 0;
                shareRows[i].push(total > 0 ? Math.round(share * 1000000) / 1000000 : 0);
            }
        }
    }

    const sheetName = 'Metricas PLM';
    console.log(`Asegurando la existencia de la hoja '${sheetName}'...`);
    await createSheetIfNotExists(config.HUB_CIERRES_ID, sheetName);
    
    console.log(`Limpiando hoja '${sheetName}'...`);
    await clearSheetRange(config.HUB_CIERRES_ID, `'${sheetName}'!A1:BC100`);

    const finalRows = [
        ['Share - Regional por Unidad de Negocio (Calculado directo desde Q95)'],
        headerRow,
        ...shareRows
    ];

    console.log(`Escribiendo ${finalRows.length} filas en la hoja '${sheetName}'...`);
    await writeSheet(config.HUB_CIERRES_ID, `'${sheetName}'!A1:BC${finalRows.length}`, finalRows);

    // 5. Aplicar formato de porcentaje en Google Sheets
    const sheets = getSheetsClient();
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: config.HUB_CIERRES_ID });
    const sheetId = metadata.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;

    if (sheetId !== undefined) {
        console.log(`Aplicando formato de porcentaje a los datos...`);
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: config.HUB_CIERRES_ID,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: 2, // Fila 3 en adelante (0-indexed)
                            endRowIndex: 2 + UN_LIST.length,
                            startColumnIndex: 1, // Columna B en adelante (0-indexed)
                            endColumnIndex: 1 + columns.length
                        },
                        cell: {
                            userEnteredFormat: {
                                numberFormat: {
                                    type: 'PERCENT',
                                    pattern: '0.00%'
                                }
                            }
                        },
                        fields: 'userEnteredFormat.numberFormat'
                    }
                }]
            }
        });
        console.log(`✅ Formato de porcentaje aplicado con éxito.`);
    }

    console.log(`🎉 ¡Hoja '${sheetName}' generada y guardada con éxito!`);
}

main().catch(console.error);
