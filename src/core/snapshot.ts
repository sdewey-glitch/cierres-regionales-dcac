import { CommercialResult } from './types';
import { readSheet, writeSheet, appendSheet, createSheetIfNotExists, clearSheetRange } from '../api/sheets';
import { config } from '../config/env';

const CHUNK_SIZE = 45000;

export async function saveMonthSnapshot(year: number, month: number, results: CommercialResult[]) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const periodo = `${year}_${month.toString().padStart(2, '0')}`;
        const jsonStr = JSON.stringify(results);

        // Dividir el JSON en partes menores al límite de celda de Google Sheets (50k caracteres)
        const chunks: string[] = [];
        for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
            chunks.push(jsonStr.substring(i, i + CHUNK_SIZE));
        }

        // Leer registros existentes
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:C').catch(() => []);
        
        // Conservar registros de otros periodos
        const otherRows = rows.filter(r => r[0] && r[0] !== periodo && r[0] !== 'Periodo');
        
        // Crear nuevas filas para el periodo actual
        const newPeriodRows = chunks.map((chunk, idx) => [periodo, String(idx), chunk]);
        const allRows = [...otherRows, ...newPeriodRows];
        
        // Limpiar el rango viejo y rescribir
        await clearSheetRange(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A2:C100000').catch(() => {});
        
        const headers = [['Periodo', 'ChunkIndex', 'Content']];
        const dataToWrite = [...headers, ...allRows];
        await writeSheet(config.TARGET_SPREADSHEET_ID, `Sys_Snapshots!A1:C${dataToWrite.length}`, dataToWrite);
        
        console.log(`Snapshot guardado en Sheets: ${periodo} (${chunks.length} chunks)`);
    } catch (e) {
        console.error('Error guardando snapshot a sheets', e);
    }
}

export async function loadMonthSnapshot(year: number, month: number): Promise<CommercialResult[] | null> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:C');
        
        const periodo = `${year}_${month.toString().padStart(2, '0')}`;
        const matching = rows
            .filter(r => r[0] === periodo)
            .sort((a, b) => parseInt(a[1], 10) - parseInt(b[1], 10));
            
        if (matching.length > 0) {
            const jsonStr = matching.map(r => r[2] || '').join('');
            return JSON.parse(jsonStr) as CommercialResult[];
        }
    } catch (e) {
        console.error('Error leyendo snapshot de sheets', e);
    }
    return null;
}

export async function loadAllSnapshots(): Promise<Record<string, CommercialResult[]>> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:C');
        
        const groups: Record<string, any[][]> = {};
        for (const r of rows) {
            const period = r[0];
            if (!period || period === 'Periodo') continue;
            if (!groups[period]) {
                groups[period] = [];
            }
            groups[period].push(r);
        }
        
        const out: Record<string, CommercialResult[]> = {};
        for (const [period, chunkRows] of Object.entries(groups)) {
            chunkRows.sort((a, b) => parseInt(a[1], 10) - parseInt(b[1], 10));
            const jsonStr = chunkRows.map(r => r[2] || '').join('');
            try {
                out[period] = JSON.parse(jsonStr);
            } catch (err: any) {
                console.error(`[snapshot] Error parsing JSON for period ${period}:`, err.message);
            }
        }
        return out;
    } catch (e) {
        console.error('Error leyendo todos los snapshots de sheets', e);
        return {};
    }
}


