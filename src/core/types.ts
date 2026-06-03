export interface CommercialResult {
    idUsuario: string;
    mail: string;
    fechaCierre: string;
    año: number;
    mes: number;
    añoMes: string;
    asociadoComercial: string;
    codigo: string;
    provincia: string;
    partido: string;
    oficina: string;
    tipo: string;
    modalidad: string;
    escalasTexto: string;
    categoria: number;

    // Componente Personal (General)
    tropasGeneral: number;
    cabezasGeneral: number;
    cabzGenVenta: number;
    cabzGenCompra: number;
    importeGen: number;
    resultado_final: number;
    resultado_final_ajustado: number;
    resultado_final_ajustado_regional_venta: number;
    resultado_final_ajustado_regional_compra: number;
    escalaGen: number;
    componenteP: number;
    componentePAju: number;

    // Desglose Personal
    resInv: number;
    resFaena: number;
    resCria: number;
    resMag: number;
    cabInv: number;
    cabFaena: number;
    cabCria: number;
    cabMag: number;

    // Componente Regional
    tropasRegional: number;
    cabezasRegional: number;
    cabzRegVenta: number;
    cabzRegCompra: number;
    importeReg: number;
    resultadoReg: number;
    bolsaRegion: number;
    tajadaRegion: number;
    componenteR: number;

    // Componente Oficina
    tropasOficina: number;
    cabezasOfi: number;
    cabzRegOfi: number;
    cabzOfiCompra: number;
    importeOfi: number;
    resultadoOfi: number;
    escalaOficina: number;
    opOficina: number;
    componenteO: number;

    // Ajustes Retroactivos (Resumidos)
    ajustes: number;
    ajustesManuales?: number;
    aguinaldo?: number;
    cierreMesM3: number;
    cierreMesM2: number;
    cierreMesM1: number;
    extras: number;

    // Otras métricas e inputs manuales
    rendimientoGen: number;
    cccGen: number;
    socOpGen: number;
    socOpOficina: number;
    amortizacionAP: number;
    gastosMovilidad: number;
    kms: number;
    auto: string;
    precioPorKm: number;
    reintegroMovilidad: number;
    gastosMkt: number;
    gastosOficina: number;
    amortizacioneDcac: number;
    gastosDetalle: { categoria: string; importe: number }[];
    gastosMendelMovilidad?: number;

    // Resultados Finales
    fijo: number;
    variable_personal: number;
    sueldoBruto: number;
    resultado: number; // Suma de todos los componentes de este mes
    minimo: number;
    cierreReal: number;
    retroactivosDetalle?: RetroactiveAdjustment[];
    // Detalles de Operaciones
    operacionesIds: number[];
    operacionesDetalle: OperacionDetalle[];
}

export interface OperacionDetalle {
    id_lote: number;
    tipo: string;
    fecha_operacion: string;
    sociedad_vendedora: string;
    sociedad_compradora: string;
    cuit_vendedor?: string;
    cuit_comprador?: string;
    vendedor_ac?: string;
    comprador_ac?: string;
    asociado_comercial?: string;
    cantidad: number;
    categoria: string;
    importe_vendedor: number;
    importe_comprador: number;
    resultado_id: number;
    comercial_venta: string;
    comercial_compra: string;
    bonificacion_vendedor: number;
    bonificacion_comprador: number;
    rendimiento_real: number;
    rendimiento_topeado: number;
    resultado_topeado_venta: number;
    resultado_topeado_compra: number;
    escala_aplicada: number;
    ganancia_personal_venta: number;
    ganancia_personal_compra: number;
    marca: string; // '*' = soc. propia (AC venta vacío), '†' = asignado por AC compra
    canal_venta?: string;
    canal_compra?: string;
}

export interface LoteChange {
    idLote: number;
    tipo: 'nuevo' | 'caido' | 'modificado';
    cabezasAntes: number;
    cabezasDespues: number;
    resultadoAntes: number;
    resultadoDespues: number;
    sociedadVendedora: string;
    sociedadCompradora: string;
}

export interface RetroactiveAdjustment {
    año: number;              // Año del cierre que genera el ajuste (ej: 2026)
    mes: number;              // Mes del cierre que genera el ajuste (ej: 5 = Mayo)
    comercial: string;
    idUsuario: string;
    mail: string;
    provincia: string;
    oficina: string;
    mesAjustado: number;      // Mes al que pertenece el negocio (ej: 3 = Marzo)
    añoAjustado: number;
    escalaCongelada: number;  // Escala del snapshot estático (no cambia)
    resultadoCongelado: number;
    resultadoDinamico: number;
    deltaResultado: number;   // resultado dinámico - resultado congelado
    ajusteComponenteP: number; // escalaCongelada × deltaResultado
    detalleLotes: LoteChange[];
}
