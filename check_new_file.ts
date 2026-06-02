import { readSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function main() {
    console.log("Checking the new file...");
    const data = await readSheet('1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA', "'BDSUELDO_REAL'!A1:Z1");
    console.log(data);
}

main().catch(console.error);
