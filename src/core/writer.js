"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDynamicSueldos = updateDynamicSueldos;
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
const HEADERS = [
    'Fecha de Cierre', 'Año', 'Mes',
    'AñoMes', 'Asociado_Comercial', 'Codigo',
    'Provincia', 'Partido', 'Oficina',
    'Tipo', 'Modalidad', 'Escalas',
    'Categoria', 'SUELDO', 'CIERRE_REAL',
    'MINIMO', 'Gastos', 'Tropas_General',
    'Cabezas_General', 'Cabz_Gen_Venta', 'Cabz_Gen_Compra',
    'Importe_Gen', 'Resultado_Gen', 'Escala_Gen',
    'Componente_P', 'Componente_P_Aju', 'Tropas_Regional',
    'Cabezas_Regional', 'Cabz_Reg_Venta', 'Cabz_Reg_Compra',
    'Importe_Reg', 'Resultado_Reg', 'Bolsa_Region',
    'Tajada_Region', 'Componente_R', 'Tropas_Oficina',
    'Cabezas_Ofi', 'Cabz_Reg_Ofi', 'Cabz_Ofi_Compra',
    'Importe_Ofi', 'Resultado_Ofi', 'Escala_Oficina',
    'OP_Oficina', 'Componente_O', 'Ajustes',
    'Cierre_Mes_-3', 'Cierre_Mes_-2', 'Cierre_Mes_-1',
    'Extras', 'Rendimiento_Gen', "CCC'_Gen",
    'SocOp_Gen'
];
async function updateDynamicSueldos(year, month, results) {
    const spreadsheetId = env_1.config.TARGET_SPREADSHEET_ID;
    const sheetName = 'BDsueldos';
    const YMStr = `${year}${String(month).padStart(2, '0')}`;
    const fechaCierre = results[0]?.fechaCierre || new Date().toISOString().substring(0, 10);
    console.log(`[writer] Iniciando escritura de ${results.length} registros en la hoja '${sheetName}'...`);
    // 1. Leer datos existentes
    let existingRows = [];
    try {
        existingRows = await (0, sheets_1.readSheet)(spreadsheetId, `'${sheetName}'!A2:AZ20000`);
    }
    catch (err) {
        console.warn(`[writer] Advertencia al leer '${sheetName}': ${err.message}. Se asume hoja nueva.`);
    }
    // 2. Filtrar otros meses (preservamos datos históricos, reemplazamos el mes actual)
    const otherMonthsRows = existingRows.filter(row => {
        if (row.length < 4)
            return true; // Preservar filas extrañas/vacías
        const rowYear = String(row[1]).trim();
        const rowMonth = String(row[2]).trim();
        return rowYear !== String(year) || rowMonth !== String(month);
    });
    // 3. Mapear resultados actuales a las columnas correctas
    const newRows = results.map(r => {
        const totalGastos = (r.gastosMovilidad || 0) + (r.gastosMkt || 0) + (r.amortizacioneDcac || 0);
        return [
            r.fechaCierre || fechaCierre,
            r.año || year,
            r.mes || month,
            r.añoMes || YMStr,
            r.asociadoComercial || '',
            r.codigo || '',
            r.provincia || '',
            r.partido || '',
            r.oficina || '',
            r.tipo || '',
            r.modalidad || '',
            r.escalasTexto || '',
            r.categoria || 0,
            Math.round(r.sueldoBruto || 0),
            Math.round(r.cierreReal || 0),
            Math.round(r.minimo || 0),
            Math.round(totalGastos),
            r.tropasGeneral || 0,
            r.cabezasGeneral || 0,
            r.cabzGenVenta || 0,
            r.cabzGenCompra || 0,
            Math.round(r.importeGen || 0),
            Math.round(r.resultado_final_ajustado || 0),
            r.escalaGen || 0,
            Math.round(r.componenteP || 0),
            Math.round(r.componentePAju || 0),
            r.tropasRegional || 0,
            r.cabezasRegional || 0,
            r.cabzRegVenta || 0,
            r.cabzRegCompra || 0,
            Math.round(r.importeReg || 0),
            Math.round(r.resultadoReg || 0),
            r.bolsaRegion || 0,
            r.tajadaRegion || 0,
            Math.round(r.componenteR || 0),
            r.tropasOficina || 0,
            r.cabezasOfi || 0,
            r.cabzRegOfi || 0,
            r.cabzOfiCompra || 0,
            Math.round(r.importeOfi || 0),
            Math.round(r.resultadoOfi || 0),
            r.escalaOficina || 0,
            r.opOficina || 0,
            Math.round(r.componenteO || 0),
            Math.round(r.ajustes || 0),
            Math.round(r.cierreMesM3 || 0),
            Math.round(r.cierreMesM2 || 0),
            Math.round(r.cierreMesM1 || 0),
            Math.round(r.extras || 0),
            r.rendimientoGen || 0,
            r.cccGen || 0,
            r.socOpGen || 0
        ];
    });
    const allData = [HEADERS, ...otherMonthsRows, ...newRows];
    // 4. Limpiar rango amplio
    await (0, sheets_1.clearSheetRange)(spreadsheetId, `'${sheetName}'!A1:AZ20000`);
    // 5. Escribir
    await (0, sheets_1.writeSheet)(spreadsheetId, `'${sheetName}'!A1:AZ${allData.length}`, allData);
    console.log(`[writer] ✅ Guardados ${newRows.length} registros del período ${year}-${month} en la hoja '${sheetName}' (Total filas: ${allData.length}).`);
}
