import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';
import * as fs from 'fs';

async function main() {
    const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
    const v = data.find((r: any) => r[4] === 'Valentin Torriglia' && Number(r[1]) === 2026 && Number(r[2]) === 4);
    if (v) {
        console.log('Excel Cabezas Gen:', v[18]);
    } else {
        console.log('Not found in Excel');
    }

    const d = JSON.parse(fs.readFileSync('src/core/snapshots/cierre_2026_04.json', 'utf8'));
    const vE = d.find((x: any) => x.asociadoComercial.toLowerCase().includes('valentin'));
    console.log('Engine Cabezas Gen:', vE.cabezasGeneral);
}

main().catch(console.error);
