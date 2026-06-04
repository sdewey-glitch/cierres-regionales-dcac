import { config } from './src/config/env';
import { readSheet, writeSheet, clearSheetRange } from './src/api/sheets';

async function fixAll() {
    console.log('Buscando a todos los comerciales en Envio_Reportes...');
    const data = await readSheet(config.HUB_CIERRES_ID, 'Envio_Reportes!A:I');
    
    // Armamos un bloque masivo de falsos y ceros para pisar todo
    const updates = [];
    for (let i = 1; i < data.length; i++) {
        updates.push(['', '']); // Usamos vacío para limpiar
    }
    
    if (updates.length > 0) {
        console.log(`Limpiando ${updates.length} ajustes manuales residuales...`);
        // Usamos clearSheetRange o escribimos strings vacíos
        await writeSheet(config.HUB_CIERRES_ID, `Envio_Reportes!H2:I${data.length}`, updates);
        console.log('¡Todos los ajustes manuales fueron eliminados de Google Sheets de manera masiva!');
    } else {
        console.log('No hay filas para limpiar.');
    }
}

fixAll();
