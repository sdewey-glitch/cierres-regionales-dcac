"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const engine_1 = require("./core/engine");
const writer_1 = require("./core/writer");
const snapshot_1 = require("./core/snapshot");
async function main() {
    console.log("Iniciando Cierre Regionales (Motor Completo)...");
    const year = 2026;
    const month = 3; // Use March 2026 as a test (matches screenshot)
    console.log(`Calculando mes dinámico: ${year}-${month}...`);
    const results = await (0, engine_1.calculateDynamicMonth)(year, month);
    console.log(`Guardando Snapshot en JSON del mes...`);
    (0, snapshot_1.saveMonthSnapshot)(year, month, results);
    console.log(`Calculando ajustes retroactivos...`);
    const adjustments = await (0, engine_1.calculateRetroactiveAdjustments)(year, month);
    console.log(`Ajustes generados: ${adjustments.length}`);
    console.log(`Escribiendo ${results.length} filas en BD_Sueldos (Dinámica)...`);
    await (0, writer_1.updateDynamicSueldos)(year, month, results);
    console.log("¡Cierre Regionales finalizado con éxito!");
}
main().catch(console.error);
