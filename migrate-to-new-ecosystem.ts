import { readSheet, writeSheet, createSheetIfNotExists, clearSheetRange } from './src/api/sheets';
import { saveMonthSnapshot } from './src/core/snapshot';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const OLD_SPREADSHEET_ID = '1z0zUmbK4ZBSfSD7Qoa8UJeqhiXqCOVfbN8Co9b4Qm2Y';
const NEW_SPREADSHEET_ID = '1zmWxw0BkeuHIh-Ka3IKW5Y7_DF-tcA9QQVZ0_NKzP70'; // HUB_CIERRES_ID (3_Cierres_y_Liquidaciones)

async function run() {
    console.log("Iniciando migración completa al nuevo ecosistema (3_Cierres_y_Liquidaciones)...");

    // 1. Migrar BDSUELDO_REAL
    try {
        console.log("Copiando BDSUELDO_REAL...");
        const oldSueldoRows = await readSheet(OLD_SPREADSHEET_ID, "'BDSUELDO_REAL'!A1:AZ20000");
        console.log(`Leídas ${oldSueldoRows.length} filas de BDSUELDO_REAL.`);
        
        await createSheetIfNotExists(NEW_SPREADSHEET_ID, 'BDSUELDO_REAL');
        await clearSheetRange(NEW_SPREADSHEET_ID, "'BDSUELDO_REAL'!A1:AZ20000");
        await writeSheet(NEW_SPREADSHEET_ID, `'BDSUELDO_REAL'!A1:AZ${oldSueldoRows.length}`, oldSueldoRows);
        console.log("✅ BDSUELDO_REAL copiado exitosamente al nuevo Sheet.");
    } catch (e: any) {
        console.error("❌ Error migrando BDSUELDO_REAL:", e.message);
    }

    // 1b. Migrar BDsueldos
    try {
        console.log("Copiando BDsueldos...");
        const oldDynamicSueldoRows = await readSheet(OLD_SPREADSHEET_ID, "'BDsueldos'!A1:AZ20000");
        console.log(`Leídas ${oldDynamicSueldoRows.length} filas de BDsueldos.`);
        
        await createSheetIfNotExists(NEW_SPREADSHEET_ID, 'BDsueldos');
        await clearSheetRange(NEW_SPREADSHEET_ID, "'BDsueldos'!A1:AZ20000");
        await writeSheet(NEW_SPREADSHEET_ID, `'BDsueldos'!A1:AZ${oldDynamicSueldoRows.length}`, oldDynamicSueldoRows);
        console.log("✅ BDsueldos copiado exitosamente al nuevo Sheet.");
    } catch (e: any) {
        console.error("❌ Error migrando BDsueldos:", e.message);
    }

    // 2. Migrar Sys_Config
    try {
        console.log("Copiando Sys_Config...");
        const oldConfigRows = await readSheet(OLD_SPREADSHEET_ID, "'Sys_Config'!A1:B10");
        console.log(`Leídas ${oldConfigRows.length} filas de Sys_Config.`);
        
        await createSheetIfNotExists(NEW_SPREADSHEET_ID, 'Sys_Config');
        await clearSheetRange(NEW_SPREADSHEET_ID, "'Sys_Config'!A1:B10");
        await writeSheet(NEW_SPREADSHEET_ID, `'Sys_Config'!A1:B${oldConfigRows.length}`, oldConfigRows);
        console.log("✅ Sys_Config copiado exitosamente al nuevo Sheet.");
    } catch (e: any) {
        console.error("❌ Error migrando Sys_Config:", e.message);
    }

    // 3. Migrar Snapshots locales a la nueva planilla
    // Para que saveMonthSnapshot escriba en la nueva, temporalmente pisamos el config.TARGET_SPREADSHEET_ID
    const { config } = require('./src/config/env');
    config.TARGET_SPREADSHEET_ID = NEW_SPREADSHEET_ID;

    try {
        console.log("Migrando snapshots locales...");
        const snapshotsDir = path.join(__dirname, 'src/core/snapshots');
        const files = fs.readdirSync(snapshotsDir);
        const closureFiles = files.filter(f => f.match(/^cierre_\d{4}_\d{2}\.json$/));
        
        for (const file of closureFiles) {
            const match = file.match(/^cierre_(\d{4})_(\d{2})\.json$/);
            if (match) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const filePath = path.join(snapshotsDir, file);
                
                console.log(`Procesando ${file}...`);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                await saveMonthSnapshot(year, month, data);
                console.log(`✅ Snapshot ${file} migrado a la nueva planilla.`);
            }
        }
    } catch (e: any) {
        console.error("❌ Error migrando snapshots:", e.message);
    }

    console.log("🎉 Migración al nuevo ecosistema finalizada exitosamente.");
}

run();
