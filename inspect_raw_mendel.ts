import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function test() {
    console.log("Reading raw Config_Mendel sheet rows...");
    const data = await readSheet(config.HUB_GASTOS_ID, "'Config_Mendel'!A1:J15");
    console.log("Headers & first few rows:");
    console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
