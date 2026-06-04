import { readSheet, writeSheet, clearSheetRange } from './src/api/sheets';
import { config } from './src/config/env';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    try {
        const data = await readSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F");
        
        // Filtramos para sacar TODOS los de Mayo 2026 que tengan el error de retroactivos migrados
        const newData = data.filter(r => !(r[0] == '2026' && r[1] == '5' && String(r[4]).includes('Retroactivo')));
        
        await clearSheetRange(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F3000");
        if (newData.length > 0) {
            await writeSheet(config.HUB_CONFIGURACIONES_ID, "'Ajustes'!A2:F" + (newData.length + 1), newData);
        }
        console.log("Limpieza exitosa. Quedaron " + newData.length + " filas de historial.");
    } catch (e) {
        console.error(e);
    }
}
main();
