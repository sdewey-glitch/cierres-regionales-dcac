"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHistoricalSalaries = fetchHistoricalSalaries;
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
const SPREADSHEET_ID = env_1.config.TARGET_SPREADSHEET_ID;
async function fetchHistoricalSalaries() {
    try {
        const data = await (0, sheets_1.readSheet)(SPREADSHEET_ID, "'BDSUELDO_REAL'!A2:Z");
        return data.filter(row => row[1]).map(row => ({
            // A=Fecha(0), B=Año(1), C=Mes(2), D=AñoMes(3), E=Asociado_Comercial(4), ... N=SUELDO(13), O=CIERRE_REAL(14)
            año: Number(row[1]),
            mes: Number(row[2]),
            comercial: String(row[4] || '').trim(),
            sueldoBruto: Number(String(row[13] || '0').replace(/[^0-9.-]+/g, "")),
            sueldoNeto: Number(String(row[14] || '0').replace(/[^0-9.-]+/g, "")),
            componenteP: Number(String(row[24] || '0').replace(/[^0-9.-]+/g, "")),
        }));
    }
    catch (e) {
        console.warn("No se pudo leer BDSUELDO_REAL (quizás no exista aún en V4).", e.message);
        return [];
    }
}
