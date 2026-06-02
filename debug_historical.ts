import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function main() {
    const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A1:AZ1000");
    const rows = data.filter(r => Number(r[1]) === 2026 && String(r[4] || '').toLowerCase().includes('valentin'));
    console.log("Valentin 2026 BDSUELDO_REAL rows with regional/office components:");
    for (const row of rows) {
        console.log(`Mes: ${row[2]} | Comercial: ${row[4]}`);
        console.log(`  SUELDO (13): ${row[13]} | CIERRE_REAL (14): ${row[14]}`);
        console.log(`  Componente_P (24): ${row[24]}`);
        console.log(`  Componente_R (34): ${row[34]} | Componente_O (43): ${row[43]}`);
        console.log(`  Ajustes (44): ${row[44]}`);
    }
}

main().catch(console.error);
