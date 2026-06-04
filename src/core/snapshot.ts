import { CommercialResult } from './types';
import { readSheet, writeSheet, appendSheet, createSheetIfNotExists } from '../api/sheets';
import { config } from '../config/env';

export async function saveMonthSnapshot(year: number, month: number, results: CommercialResult[]) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:B');
        
        const periodo = `${year}_${month.toString().padStart(2, '0')}`;
        const jsonStr = JSON.stringify(results);

        const rowIndex = rows.findIndex(r => r[0] === periodo);
        if (rowIndex >= 0) {
            const range = `Sys_Snapshots!A${rowIndex + 1}:B${rowIndex + 1}`;
            await writeSheet(config.TARGET_SPREADSHEET_ID, range, [[periodo, jsonStr]]);
        } else {
            await appendSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:B', [[periodo, jsonStr]]);
        }
        console.log(`Snapshot guardado en Sheets: ${periodo}`);
    } catch (e) {
        console.error('Error guardando snapshot a sheets', e);
    }
}

export async function loadMonthSnapshot(year: number, month: number): Promise<CommercialResult[] | null> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:B');
        
        const periodo = `${year}_${month.toString().padStart(2, '0')}`;
        const row = rows.find(r => r[0] === periodo);
        if (row && row[1]) {
            return JSON.parse(row[1]) as CommercialResult[];
        }
    } catch (e) {
        console.error('Error leyendo snapshot de sheets', e);
    }
    return null;
}
