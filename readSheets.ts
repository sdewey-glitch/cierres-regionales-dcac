import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        const data = await readSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F");
        const may = data.filter(r => r[0] == '2026' && r[1] == '5');
        console.log('--- Ajustes de Mayo 2026 ---');
        console.log(may);
    } catch (e) {
        console.error(e);
    }
}
main();
