import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function main() {
    const data = await readSheet(config.TARGET_SPREADSHEET_ID, "'BDSUELDO_REAL'!A1:Z1");
    console.log(data);
}

main().catch(console.error);
