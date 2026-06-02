import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function check() {
    // Check the second section of Kms & $ which maps Comercial -> Vehículo
    const data = await readSheet(config.SOURCE_SPREADSHEET_ID, "'Kms & $'!A5:K30");
    data.forEach((r: any[], i: number) => console.log(`Row ${i+5}: ${r.join(' | ')}`));
}

check().catch(console.error);
