import fs from 'fs';
import path from 'path';
import { CommercialResult } from './types';

const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// Asegurarse de que el directorio existe
if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

export function saveMonthSnapshot(year: number, month: number, results: CommercialResult[]) {
    const filename = `cierre_${year}_${month.toString().padStart(2, '0')}.json`;
    const filePath = path.join(SNAPSHOTS_DIR, filename);
    
    // Lo guardamos bonito y formateado (space: 2) para que sea legible
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Snapshot guardado: ${filename}`);
}

export function loadMonthSnapshot(year: number, month: number): CommercialResult[] | null {
    const filename = `cierre_${year}_${month.toString().padStart(2, '0')}.json`;
    const filePath = path.join(SNAPSHOTS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data) as CommercialResult[];
        } catch (e) {
            console.error(`Error leyendo snapshot ${filename}:`, e);
            return null;
        }
    }
    return null;
}
