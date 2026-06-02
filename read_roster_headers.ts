import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function run() {
    try {
        const data = await readSheet(config.SOURCE_SPREADSHEET_ID, "'Import Roster'!A1:Z1");
        console.log("HEADERS DE ROSTER:");
        console.log(data[0]);
    } catch(e) {
        console.error("Error", e);
    }
}
run();
