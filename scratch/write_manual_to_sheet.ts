import { createSheetIfNotExists, clearSheetRange, writeSheet } from '../src/api/sheets';
import { config } from '../src/config/env';

async function run() {
    const sheetName = 'Funcionamiento_Cierres';
    console.log(`Verificando y creando pestaña '${sheetName}'...`);
    await createSheetIfNotExists(config.HUB_CIERRES_ID, sheetName);
    
    console.log(`Limpiando contenido existente...`);
    await clearSheetRange(config.HUB_CIERRES_ID, `'${sheetName}'!A1:Z100`);

    const values = [
        ["INSTRUCTIVO DE FUNCIONAMIENTO - PROCESO DE CIERRES REGIONALES"],
        [""],
        ["¿Qué sucede en el sistema cuando se presiona el botón 'Generar Cierre'?"],
        ["Al ejecutar el cierre, la aplicación realiza de forma automática y secuencial las siguientes tres etapas críticas:"],
        [""],
        ["1. RESPALDO DE BAJADA ESTÁTICA (Foto cruda de Metabase en Google Sheets)"],
        ["   Hoja Destino:", "Bajada_Estatica"],
        ["   Qué hace:", "Descarga la base completa de operaciones (Q95) de Metabase y filtra los últimos 4 meses: el mes del cierre actual (M) y los tres anteriores (M-1, M-2 y M-3)."],
        ["   Por qué se hace:", "Sirve como base de datos histórica congelada. El mes siguiente, cuando se ejecute un nuevo cierre, la app comparará los datos nuevos de Metabase contra esta foto del pasado para saber si algún lote viejo se agregó, modificó o eliminó."],
        ["   Identificador:", "Cada fila se graba precedida por la columna 'AñoMes_Cierre' (ej: '202605' para el cierre de Mayo) para poder diferenciar e identificar cada foto en las ejecuciones posteriores."],
        [""],
        ["2. CÁLCULO DE AJUSTES RETROACTIVOS (Lotes modificados en Metabase)"],
        ["   Hojas Destino:", "Ajustes_Retro (resumen acumulado por comercial) y Detalle_Retro (lote por lote)"],
        ["   Qué hace:", "Compara el pasado congelado (los snapshots guardados de los meses M-1, M-2 y M-3) contra la base fresca actual de Metabase. Si detecta cambios en la cantidad de cabezas, resultado final o sociedades, calcula el ajuste correspondiente."],
        ["   Evita efecto cascada:", "El ajuste se calcula utilizando la escala (porcentaje de comisión) que el comercial tenía congelada en el mes original del negocio. De esta manera, una modificación vieja no altera la escala de su sueldo actual."],
        [""],
        ["3. CONSOLIDACIÓN Y LIQUIDACIÓN FINAL"],
        ["   Hojas Destino:", "BDSUELDO_REAL y Sys_Snapshots"],
        ["   Qué hace:", "Suma todas las componentes del mes actual (Personal, Regional, Oficina), incorpora los Ajustes Manuales cargados por administración, suma/resta los Ajustes Retroactivos calculados y aplica reglas críticas (mínimo garantizado, aguinaldos y deducciones)."],
        ["   Cierre Real:", "Calcula el neto a transferir y guarda el snapshot final tanto en la base histórica local como en el Google Sheet."]
    ];

    console.log(`Escribiendo instructivo...`);
    await writeSheet(config.HUB_CIERRES_ID, `'${sheetName}'!A1:C${values.length}`, values);
    console.log(`[OK] Instructivo escrito correctamente en la hoja de cierres!`);
}

run().catch(err => {
    console.error("Error al ejecutar:", err);
});
