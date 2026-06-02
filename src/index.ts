import 'dotenv/config';
import { calculateDynamicMonth, calculateRetroactiveAdjustments } from './core/engine';
import { updateDynamicSueldos } from './core/writer';
import { saveMonthSnapshot } from './core/snapshot';

async function main() {
    console.log("Iniciando Cierre Regionales (Motor Completo)...");
    
    const year = 2026;
    const month = 3; // Use March 2026 as a test (matches screenshot)

    console.log(`Calculando mes dinámico: ${year}-${month}...`);
    const results = await calculateDynamicMonth(year, month);
    
    console.log(`Guardando Snapshot en JSON del mes...`);
    saveMonthSnapshot(year, month, results);

    console.log(`Calculando ajustes retroactivos...`);
    const adjustments = await calculateRetroactiveAdjustments(year, month);
    console.log(`Ajustes generados: ${adjustments.length}`);

    console.log(`Escribiendo ${results.length} filas en BD_Sueldos (Dinámica)...`);
    await updateDynamicSueldos(year, month, results);

    console.log("¡Cierre Regionales finalizado con éxito!");
}

main().catch(console.error);
