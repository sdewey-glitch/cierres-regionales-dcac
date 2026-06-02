import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function main() {
    const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
    const v = data.find(r => r[4] === 'Valentin Torriglia' && Number(r[1]) === 2026 && Number(r[2]) === 4);
    if (v) {
        console.log('Sueldo Neto:', v[13], 'Cierre Real:', v[14], 'Resultado Gen:', v[22], 'Escala Gen:', v[23], 'Componente_P (Y):', v[24], 'Componente_P_Aju (Z):', v[25]);
    } else {
        console.log('Not found');
    }
}

main().catch(console.error);
