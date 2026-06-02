import { google } from 'googleapis';
import { listDriveFolders, listDriveFiles, downloadDriveFile } from '../api/drive';
import { readSheet, writeSheet, appendSheet, clearSheetRange, createSheetIfNotExists } from '../api/sheets';
import { config } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

const pdf = require('pdf-parse');

const CIERRES_ROOT_FOLDER = '1ryE13Qo7C_DAknwFTZq9QWKUhkUOu4Oh';
const MONTH_MAP: Record<string, number> = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    'ac abril': 4, 'ac agosto': 8 // Handle 2025 folder formats
};

function parseCurrency(str: string | null | undefined): number {
    if (!str) return 0;
    const isNegative = str.includes('-');
    // Extract only numbers and comma or dot
    const cleaned = str.replace(/[^0-9,]/g, '').replace(/,/g, '.');
    const num = Number(cleaned) || 0;
    return isNegative ? -num : num;
}

function parsePdfText(text: string, filename: string, folderYear: number, folderMonth: number) {
    const nameWithoutExt = filename.replace(/\.pdf$/i, '').trim();
    const dashIndex = nameWithoutExt.lastIndexOf(' - ');
    const asociado = dashIndex !== -1 ? nameWithoutExt.substring(0, dashIndex).trim() : nameWithoutExt;

    const anioMes = `${folderYear}${String(folderMonth).padStart(2, '0')}`;

    // 1. Componente Personal
    let compP = 0;
    const matchP1 = text.match(/Componente Personal\s+.*?\$\s*([\d.,-]+)/i);
    const matchP2 = text.match(/([\d.,-]+)\s+SUELDO TOTAL/i);
    if (matchP1) {
        compP = parseCurrency(matchP1[1]);
    } else if (matchP2) {
        compP = parseCurrency(matchP2[1]);
    }

    // 2. Componente Regional
    let compR = 0;
    const matchR1 = text.match(/Componente Regional\s+.*?\$\s*([\d.,-]+)/i);
    if (matchR1) {
        compR = parseCurrency(matchR1[1]);
    }

    // 3. Componente Oficina
    let compO = 0;
    const matchO1 = text.match(/Componente Oficina\s+.*?\$\s*([\d.,-]+)/i);
    if (matchO1) {
        compO = parseCurrency(matchO1[1]);
    }

    // 4. Mínimo Garantizado
    let minimo = 0;
    const matchMin1 = text.match(/M(?:í|i)nimo Garantizado\s+.*?\$\s*([\d.,-]+)/i);
    const matchMin2 = text.match(/Minimo\s+Ajuste\s+.*?\$\s*([\d.,-]+)/i);
    const matchMin3 = text.match(/Minimo\s+.*?\$([\d.,-]+)/i);
    if (matchMin1) {
        minimo = parseCurrency(matchMin1[1]);
    } else if (matchMin2) {
        minimo = parseCurrency(matchMin2[1]);
    } else if (matchMin3) {
        minimo = parseCurrency(matchMin3[1]);
    }

    // 5. Sueldo Total
    let sueldo = 0;
    const matchSueldo = text.match(/SUELDO TOTAL\s+.*?\$\s*([\d.,-]+)/i);
    if (matchSueldo) {
        sueldo = parseCurrency(matchSueldo[1]);
    } else {
        sueldo = Math.max(compP + compR + compO, minimo);
    }

    // 6. Cierre Real (Total a Facturar)
    let cierreReal = 0;
    const matchCierre1 = text.match(/T\s*O\s*T\s*A\s*L\s*A\s*F\s*A\s*C\s*T\s*U\s*R\s*A\s*R\s*\n\s*\$\s*([\d.,-]+)/i);
    const matchCierre2 = text.match(/Monto Total Facturar\s+.*?\$\s*([\d.,-]+)/i);
    const matchCierre3 = text.match(/Total a Facturar\s+.*?\$\s*([\d.,-]+)/i);
    const matchCierre4 = text.match(/TOTAL A FACTURAR\s+.*?\$\s*([\d.,-]+)/i);
    if (matchCierre1) {
        cierreReal = parseCurrency(matchCierre1[1]);
    } else if (matchCierre2) {
        cierreReal = parseCurrency(matchCierre2[1]);
    } else if (matchCierre3) {
        cierreReal = parseCurrency(matchCierre3[1]);
    } else if (matchCierre4) {
        cierreReal = parseCurrency(matchCierre4[1]);
    }

    // 7. Gastos (Rendiciones / Reintegro Movilidad, etc.)
    let gastos = 0;
    const matchGastos1 = text.match(/Total Rendiciones\s+.*?(-?\$\s*[\d.,]+)/i);
    const matchGastos2 = text.match(/Total Descuentos\s+.*?(-?\$\s*[\d.,]+)/i);
    const matchGastos3 = text.match(/Gastos de Movilidad\s+.*?([+-]\s*[\d.,]+)/i);
    if (matchGastos1) {
        gastos = parseCurrency(matchGastos1[1]);
    } else if (matchGastos2) {
        gastos = parseCurrency(matchGastos2[1]);
    } else if (matchGastos3) {
        gastos = parseCurrency(matchGastos3[1]);
    }

    // 8. Cabezas
    let cabezas = 0;
    const matchCab1 = text.match(/Cabezas\s+([\d.]+)/i);
    const matchCab2 = text.match(/([\d.]+)\s*cab/i);
    const matchCab3 = text.match(/(\d+)\s+CABEZAS/i);
    if (matchCab1) {
        cabezas = Number(matchCab1[1].replace(/\./g, ''));
    } else if (matchCab2) {
        cabezas = Number(matchCab2[1].replace(/\./g, ''));
    } else if (matchCab3) {
        cabezas = Number(matchCab3[1]);
    }

    // 9. Tropas
    let tropas = 0;
    const matchTrop1 = text.match(/(\d+)\s+TROPAS/i);
    const matchTrop2 = text.match(/Operaciones\s+(\d+)/i);
    const matchTrop3 = text.match(/(\d+)\s+registros/i);
    if (matchTrop1) {
        tropas = Number(matchTrop1[1]);
    } else if (matchTrop2) {
        tropas = Number(matchTrop2[1]);
    } else if (matchTrop3) {
        tropas = Number(matchTrop3[1]);
    }

    // 10. Oficina y Modalidad
    let oficina = '';
    const matchOfi = text.match(/O F I C I N A\s*\n\s*([^\n]+)/i);
    if (matchOfi) oficina = matchOfi[1].trim();

    let modalidad = '';
    const matchMod = text.match(/M O D A L I D A D\s*\n\s*([^\n]+)/i);
    if (matchMod) modalidad = matchMod[1].trim();

    // 11. Ajustes
    let ajustes = 0;
    const matchAju = text.match(/Ajustes? Retroactivos?\s+.*?\$\s*([\d.,-]+)/i);
    const matchAju2 = text.match(/Ajustes?\s+Manuales?\s+.*?\$\s*([\d.,-]+)/i);
    if (matchAju) {
        ajustes = parseCurrency(matchAju[1]);
    } else if (matchAju2) {
        ajustes = parseCurrency(matchAju2[1]);
    } else {
        // Fallback: Total Facturar - Sueldo - Gastos (reintegros)
        ajustes = cierreReal - sueldo - gastos;
    }

    return {
        anioMes,
        asociado,
        oficina,
        modalidad,
        compP,
        compR,
        compO,
        sueldo,
        cierreReal,
        minimo,
        gastos,
        ajustes,
        cabezas,
        tropas
    };
}

async function main() {
    console.log("Iniciando Sincronización de Históricos desde PDFs en Drive...");
    const yearFolders = await listDriveFolders(CIERRES_ROOT_FOLDER);
    const allResults: any[] = [];

    for (const yFolder of yearFolders) {
        const yearMatch = yFolder.name.match(/(\d{4})/);
        if (!yearMatch) continue;
        const year = parseInt(yearMatch[1], 10);
        console.log(`\nProcesando carpeta de año: ${yFolder.name}...`);

        const monthFolders = await listDriveFolders(yFolder.id);
        for (const mFolder of monthFolders) {
            const folderLower = mFolder.name.toLowerCase();
            let month = 0;
            for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
                if (folderLower.includes(mName)) {
                    month = mNum;
                    break;
                }
            }
            if (!month) {
                console.log(`[drive] No se pudo deducir mes para carpeta: "${mFolder.name}"`);
                continue;
            }

            console.log(`  Procesando carpeta de mes: "${mFolder.name}" (Año: ${year}, Mes: ${month})...`);
            const files = await listDriveFiles(mFolder.id);
            console.log(`  Encontrados ${files.length} archivos PDF.`);

            for (const file of files) {
                try {
                    console.log(`    Descargando y parseando: "${file.name}"...`);
                    const buffer = await downloadDriveFile(file.id);
                    const p = new pdf.PDFParse({ data: buffer });
                    const textData = await p.getText();
                    
                    const parsed = parsePdfText(textData.text, file.name, year, month);
                    
                    // Verify totals: compP + compR + compO + gastos + ajustes === cierreReal
                    const sumComponents = parsed.compP + parsed.compR + parsed.compO;
                    const calculatedTotal = parsed.sueldo + parsed.gastos + parsed.ajustes;
                    const diff = Math.abs(calculatedTotal - parsed.cierreReal);
                    
                    if (diff > 10) {
                        console.warn(`    ⚠️ Discrepancia de total en "${file.name}": CierreReal PDF: ${parsed.cierreReal} vs Calculado: ${calculatedTotal} (Diff: ${diff})`);
                    }

                    allResults.push({
                        ...parsed,
                        link: file.webViewLink
                    });

                } catch (e: any) {
                    console.error(`    ❌ Error procesando archivo "${file.name}":`, e.message);
                }
            }
        }
    }

    console.log(`\nSincronizados ${allResults.length} registros de PDFs.`);

    // 2. Escribir en Google Sheets
    const sheetName = 'Historicos_PDF';
    console.log(`\nCreando/Limpiando solapa '${sheetName}' en Google Sheets...`);
    await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, sheetName);
    await clearSheetRange(config.TARGET_SPREADSHEET_ID, `'${sheetName}'!A:P`);

    const headers = [
        [
            "AñoMes",
            "Comercial",
            "Oficina",
            "Modalidad",
            "Componente Personal",
            "Componente Regional",
            "Componente Oficina",
            "Sueldo Bruto",
            "Ajustes",
            "Gastos/Rendiciones",
            "Cierre Real (Facturar)",
            "Minimo",
            "Cabezas",
            "Tropas",
            "Diferencia Verificación",
            "PDF Link"
        ]
    ];

    const rows = allResults.map(r => {
        const diff = (r.sueldo + r.gastos + r.ajustes) - r.cierreReal;
        return [
            r.anioMes,
            r.asociado,
            r.oficina || "—",
            r.modalidad || "—",
            r.compP,
            r.compR,
            r.compO,
            r.sueldo,
            r.ajustes,
            r.gastos,
            r.cierreReal,
            r.minimo,
            r.cabezas,
            r.tropas,
            Math.round(diff),
            r.link
        ];
    });

    console.log(`Subiendo ${rows.length} filas a '${sheetName}'...`);
    await writeSheet(config.TARGET_SPREADSHEET_ID, `'${sheetName}'!A1`, headers);
    await appendSheet(config.TARGET_SPREADSHEET_ID, `'${sheetName}'!A2`, rows);
    console.log("Sincronización completada con éxito!");
}

if (require.main === module) {
    main().catch(console.error);
}
