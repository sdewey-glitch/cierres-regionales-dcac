import { writeSheet, readSheet } from '../api/sheets';
import { config } from '../config/env';
import { CommercialResult } from './types';

const SPREADSHEET_ID = config.TARGET_SPREADSHEET_ID;

export async function updateDynamicSueldos(year: number, month: number, results: CommercialResult[]) {
    const headers = [
        "Fecha de Cierre", "Año", "Mes", "AñoMes", "Asociado_Comercial", "Codigo", "Provincia", "Partido", "Oficina", "Tipo", "Modalidad", "Escalas", "Categoria", "SUELDO", "CIERRE_REAL", "MINIMO", "Gastos", "Tropas_General", "Cabezas_General", "Cabz_Gen_Venta", "Cabz_Gen_Compra", "Importe_Gen", "Resultado_Gen", "Escala_Gen", "Componente_P", "Componente_P_Aju", "Tropas_Regional", "Cabezas_Regional", "Cabz_Reg_Venta", "Cabz_Reg_Compra", "Importe_Reg", "Resultado_Reg", "Bolsa_Region", "Tajada_Region", "Componente_R", "Tropas_Oficina", "Cabezas_Ofi", "Cabz_Reg_Ofi", "Cabz_Ofi_Compra", "Importe_Ofi", "Resultado_Ofi", "Escala_Oficina", "OP_Oficina", "Componente_O", "Ajustes", "Cierre_Mes_-3", "Cierre_Mes_-2", "Cierre_Mes_-1", "Extras", "Rendimiento_Gen", "CCC'_Gen", "SocOp_Gen", "Amortizacion_AP", "Gastos_Movilidad", "KMS", "Auto", "Precio x KM", "Reintegro_Movilidad", "Gastos MKT", "Gastos Oficina", "Amortizacione_DCAC"
    ];

    const rows = [headers];

    for (const res of results) {
        if (res.sueldoBruto > 0 || res.cabezasGeneral > 0) {
            rows.push([
                res.fechaCierre, res.año, res.mes, res.añoMes, res.asociadoComercial, res.codigo, res.provincia, res.partido, res.oficina, res.tipo, res.modalidad, res.escalasTexto, res.categoria,
                res.sueldoBruto, res.cierreReal, res.minimo, 
                0, // Gastos (placeholder for total gastos)
                res.tropasGeneral, res.cabezasGeneral, res.cabzGenVenta, res.cabzGenCompra, res.importeGen, res.resultado_final_ajustado, res.escalaGen, res.componenteP, res.componentePAju,
                res.tropasRegional, res.cabezasRegional, res.cabzRegVenta, res.cabzRegCompra, res.importeReg, res.resultadoReg, res.bolsaRegion, res.tajadaRegion, res.componenteR,
                res.tropasOficina, res.cabezasOfi, res.cabzRegOfi, res.cabzOfiCompra, res.importeOfi, res.resultadoOfi, res.escalaOficina, res.opOficina, res.componenteO,
                res.ajustes, res.cierreMesM3, res.cierreMesM2, res.cierreMesM1, res.extras,
                res.rendimientoGen, res.cccGen, res.socOpGen, res.amortizacionAP, res.gastosMovilidad, res.kms, res.auto, res.precioPorKm, res.reintegroMovilidad, res.gastosMkt, res.gastosOficina, res.amortizacioneDcac
            ].map(String));
        }
    }

    await writeSheet(SPREADSHEET_ID, "'BD_Sueldos'!A1", rows);
}

// Appends to historical
export async function freezeClosingToHistorical(year: number, month: number, results: CommercialResult[], adjustments: any[], gastos: any[], tajadas: any[]) {
    // Read current rows to find next empty row
    const existing = await readSheet(SPREADSHEET_ID, "'BDSUELDO_REAL'!A1:A");
    const nextRow = existing.length + 1;

    const rows = [];
    const fechaCierre = new Date().toISOString();

    for (const res of results) {
        if (res.sueldoBruto > 0 || res.cabezasGeneral > 0) {
            
            // Calculate Net Salary
            const comercialGastos = gastos.filter(g => g.comercial === res.asociadoComercial && g.año === year && g.mes === month)
                                          .reduce((acc, val) => acc + val.monto, 0);
                                          
            const comercialAjustes = adjustments.filter(a => a.comercial === res.asociadoComercial && a.año === year && a.mes === month)
                                          .reduce((acc, val) => acc + val.diferenciaGenerada, 0);
                                          
            const comercialTajada = tajadas.filter(t => t.comercial === res.asociadoComercial && t.año === year && t.mes === month)
                                          .reduce((acc, val) => acc + val.monto, 0);

            const sueldoNeto = res.sueldoBruto - comercialGastos - comercialTajada + comercialAjustes;

            rows.push([
                fechaCierre,
                year.toString(),
                month.toString(),
                res.asociadoComercial,
                res.sueldoBruto.toString(),
                comercialGastos.toString(),
                comercialTajada.toString(),
                comercialAjustes.toString(),
                sueldoNeto.toString()
            ]);
        }
    }

    if (rows.length > 0) {
        await writeSheet(SPREADSHEET_ID, `'BDSUELDO_REAL'!A${nextRow}`, rows);
    }
}
