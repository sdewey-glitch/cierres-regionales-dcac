import { readSheet, appendSheet } from './src/api/sheets';
import { config } from './src/config/env';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Iniciando validación cruzada (V3.0 vs V4.0)...");

    // 1. Leer BDSUELDO_REAL (V3.0)
    console.log("-> Obteniendo BDSUELDO_REAL desde Sheets...");
    const v3DataRaw = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
    
    // Mapeamos a algo más fácil de buscar
    // row[3] = AñoMes
    // row[4] = Asociado Comercial
    // row[13] = SUELDO
    // row[14] = CIERRE_REAL (Bruto Total)
    
    const v3Map = new Map<string, number>();
    for (const r of v3DataRaw) {
        if (!r[3] || !r[4]) continue;
        const key = `${r[3]}_${r[4].trim()}`;
        // Extraemos Cierre Real que suele ser el Sueldo Bruto. 
        // Si no está, probamos el Sueldo Neto.
        const sueldoBruto = Number(r[14]) || Number(r[13]) || 0; 
        v3Map.set(key, sueldoBruto);
    }

    console.log(`-> Obtenidos ${v3Map.size} registros reales (V3.0).`);

    // 2. Cargar todos los Snapshots (V4.0)
    const snapshotsDir = path.join(__dirname, 'src', 'core', 'snapshots');
    const files = fs.readdirSync(snapshotsDir).filter(f => f.startsWith('cierre_') && f.endsWith('.json'));

    const resultRows: any[][] = [];

    console.log(`-> Leyendo ${files.length} meses de Snapshots (V4.0)...`);
    for (const file of files) {
        // file format: cierre_2026_04.json
        const parts = file.replace('.json', '').split('_');
        const year = parts[1];
        const month = parts[2];
        const anioMes = `${year}${month}`;

        const dataV4 = JSON.parse(fs.readFileSync(path.join(snapshotsDir, file), 'utf8'));
        
        for (const c of dataV4) {
            const key = `${anioMes}_${c.asociadoComercial.trim()}`;
            const sueldoV3 = v3Map.get(key);

            // Si existe en V3.0, lo validamos
            if (sueldoV3 !== undefined) {
                const sueldoV4 = Math.round(c.sueldoBruto || 0); // V4 motor
                const diff = sueldoV4 - Math.round(sueldoV3);
                
                let status = 'OK';
                if (Math.abs(diff) > 100 && Math.abs(diff) < 50000) status = 'Diferencia Menor (Ajuste/Redondeo)';
                else if (Math.abs(diff) >= 50000) status = '❌ DIFERENCIA MAYOR';

                const diffPct = sueldoV3 > 0 ? (diff / sueldoV3) * 100 : 0;

                resultRows.push([
                    anioMes,
                    c.asociadoComercial,
                    Math.round(sueldoV3),
                    sueldoV4,
                    diff,
                    diffPct.toFixed(2) + '%',
                    status,
                    c.cabezasGeneral,
                    c.resultado_final
                ]);
            }
        }
    }

    // 3. Escribir/Actualizar en Sheets
    console.log(`-> Subiendo ${resultRows.length} validaciones a la solapa 'Validacion_Sueldos'...`);
    
    const headers = [
        ["AñoMes", "Comercial", "Sueldo V3 (PDF)", "Sueldo V4 (Motor)", "Diferencia ($)", "Diferencia (%)", "Estado", "Cabezas V4", "Resultado V4"]
    ];

    try {
        const { google } = require('googleapis');
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'google-credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // Intentar limpiar la hoja si existe
        try {
            await sheets.spreadsheets.values.clear({
                spreadsheetId: config.TARGET_SPREADSHEET_ID,
                range: "'Validacion_Sueldos'!A:Z"
            });
        } catch(e) {
            // Si no existe la hoja, no pasa nada
        }

        // Subir headers y datos
        await appendSheet(config.TARGET_SPREADSHEET_ID, "'Validacion_Sueldos'!A1", headers);
        await appendSheet(config.TARGET_SPREADSHEET_ID, "'Validacion_Sueldos'!A2", resultRows);

        console.log("¡Listo! Hoja 'Validacion_Sueldos' actualizada con éxito.");
    } catch (e) {
        console.error("Error subiendo datos a la hoja Validacion_Sueldos:", e);
    }
}

main().catch(console.error);
