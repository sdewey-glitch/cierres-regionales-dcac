import { readSheet, appendSheet } from './src/api/sheets';
import { config } from './src/config/env';

async function testMinimos() {
    try {
        console.log("Leyendo mínimos desde el Sheet...");
        const raw = await readSheet(config.HUB_SPREADSHEET_ID, "Config_Minimos!A2:G");
        console.log(`Se encontraron ${raw.length} registros de mínimos.`);
        
        if (raw.length > 0) {
            console.log("Muestra del primer registro:", raw[0]);
            console.log("El flujo de lectura de mínimos en Sheets FUNCIONA CORRECTAMENTE.");
        } else {
            console.log("No hay registros en el Sheet.");
        }
    } catch (error) {
        console.error("Error testeando mínimos:", error);
    }
}

testMinimos();
