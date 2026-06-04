import { fetchQ95 } from '../api/metabase';
import { getRoster, normalizeName } from './normalization';
import { interpolateLogScale, getMinimumForCategory, getExactScale } from './calculator';
import { fetchGastos, fetchAjustesManuales, fetchKms, fetchPreciosKm, fetchAmortDcac, fetchMendelGastos, fetchVehicleMap, fetchTajada } from './inputs';
import { fetchHistoricalSalaries } from './historical';
import { getModelByModalidad, resolveScalePct } from './models';
import * as fs from 'fs';
import * as path from 'path';

import { CommercialResult, LoteChange, RetroactiveAdjustment } from './types';
import { loadMonthSnapshot } from './snapshot';

export function classifyChannel(
    acName: string | null,
    repreName: string | null,
    dbChannel: string | null,
    roster: Map<string, any>
): 'Regional' | 'Representante' | 'Comisionista' | 'Directo' {
    const ac = acName ? acName.trim().toLowerCase() : '';
    const rep = repreName ? repreName.trim().toLowerCase() : '';

    const acEntry = ac ? roster.get(ac) : null;
    const repEntry = rep ? roster.get(rep) : null;
    
    // 1. Validar por tipo en Roster (prioridad 1)
    const entryToUse = acEntry || repEntry;
    
    if (entryToUse && entryToUse.tipo) {
        const tipo = entryToUse.tipo.toLowerCase();
        if (tipo === 'regional' || tipo === 'city manager') return 'Regional';
        if (tipo === 'representante') return 'Representante';
        if (tipo === 'corporate' || tipo === 'oficina' || tipo === 'operario de carga') return 'Directo';
        if (tipo === 'comisionista') return 'Comisionista';
    }
    
    // 2. Si no está en Roster o no tiene tipo, utilizar el canal que viene de la base de datos (Q95)
    if (dbChannel) {
        const db = dbChannel.trim().toLowerCase();
        if (db.includes('regional')) return 'Regional';
        if (db.includes('representante')) return 'Representante';
        if (db.includes('comisionista')) return 'Comisionista';
        if (db.includes('directo')) return 'Directo';
    }

    // 3. Fallbacks heredados
    const tieneREP = rep && rep !== 'directo' && rep !== 'directa' && !rep.includes('pedro genta') && !rep.includes('bernado');
    if (tieneREP) {
        const isR4 = rep.includes('rio 4to') || rep.includes('rio cuarto') || (repEntry && repEntry.oficina?.toLowerCase().includes('rio 4to'));
        const isER = rep.includes('entre rios') || (repEntry && repEntry.oficina?.toLowerCase().includes('entre rios'));
        if (isR4 || isER) return 'Directo';
        return 'Representante';
    }

    return 'Directo';
}

let q95Cache: any[] | null = null;


export async function calculateDynamicMonth(year: number, month: number): Promise<CommercialResult[]> {
    if (!q95Cache) q95Cache = await fetchQ95();
    
    const rawOps = q95Cache;
    const roster = await getRoster();

    // Fetch gastos data sources and config
    const [kmsData, preciosKm, amortData, mendelData, vehicleMap, gastos, manualAdjustments, tajadaData, historicalSalaries] = await Promise.all([
        fetchKms(), fetchPreciosKm(), fetchAmortDcac(), fetchMendelGastos(), fetchVehicleMap(), fetchGastos(), fetchAjustesManuales(), fetchTajada(), fetchHistoricalSalaries()
    ]);
    const añoMes = `${year}${String(month).padStart(2, '0')}`;

    // Filtramos operaciones del mes solicitado evitando el bug de timezone de JS (new Date('YYYY-MM-DDT00:00:00Z') resta 3 horas en Argentina)
    const ops = rawOps.filter(op => {
        if (!op.fecha_operacion) return false;
        const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
        const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
        if (opYear !== year || opMonth !== month) return false;

        // FILTRO ESTRICTO DE OPERACIONES CONCRETADAS
        const estado = String(op.ESTADO || '').toUpperCase();
        const estadoTrop = String(op.Estado_Trop || '').toUpperCase();
        
        const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
        if (invalidStates.includes(estado)) return false;
        if (invalidStates.includes(estadoTrop)) return false;

        return true;
    });

    // Cargar Cuentas Especiales
    let cuentasEspeciales: any[] = [];
    const cuentasFile = path.join(__dirname, 'data/cuentas.json');
    if (fs.existsSync(cuentasFile)) {
        try {
            cuentasEspeciales = JSON.parse(fs.readFileSync(cuentasFile, 'utf8'));
        } catch(e) { console.error("Error loading cuentas.json"); }
    }
    const cuentasFrutos = cuentasEspeciales.filter(c => c.agente === 'Lucila Frutos');
    const cuentasAcuna = cuentasEspeciales.filter(c => c.agente.includes('Acuna') || c.agente.includes('Acuña'));

    // We will accumulate results per commercial
    const resultsMap = new Map<string, CommercialResult>();

    for (const [name, r] of roster) {
        if (!r.activo) continue;
        
        resultsMap.set(name, {
            idUsuario: r.codigo || '',
            mail: r.mail || '',
            fechaCierre: new Date(year, month - 1, 1).toISOString().split('T')[0],
            año: year,
            mes: month,
            añoMes: `${year}${month.toString().padStart(2, '0')}`,
            asociadoComercial: r.nombre,
            codigo: r.codigo || '',
            provincia: r.provincia || '',
            partido: r.partido || '',
            oficina: name === 'lucila frutos' ? 'Oficina Rio 4to' : (name === 'agustin acuna' ? 'Oficina Bavio' : (r.oficina || 'Desconocida')),
            tipo: (name === 'lucila frutos' || name === 'agustin acuna') ? 'Oficina' : (r.tipo || (r.nombre.toLowerCase().includes('oficina') ? 'Oficina' : '')),
            modalidad: r.modalidad || '',
            escalasTexto: r.escalas || '',
            categoria: r.categoria || 0,

            tropasGeneral: 0, cabezasGeneral: 0, cabzGenVenta: 0, cabzGenCompra: 0, importeGen: 0, resultado_final: 0, resultado_final_ajustado: 0, resultado_final_ajustado_regional_venta: 0, resultado_final_ajustado_regional_compra: 0, escalaGen: 0, componenteP: 0, componentePAju: 0,
            
            resInv: 0, resInvNeo: 0, resFaena: 0, resCria: 0, resMag: 0, cabInv: 0, cabInvNeo: 0, cabFaena: 0, cabCria: 0, cabMag: 0,

            tropasRegional: 0, cabezasRegional: 0, cabzRegVenta: 0, cabzRegCompra: 0, importeReg: 0, resultadoReg: 0, bolsaRegion: 0, tajadaRegion: 0, componenteR: 0,
            tropasOficina: 0, cabezasOfi: 0, cabzRegOfi: 0, cabzOfiCompra: 0, importeOfi: 0, resultadoOfi: 0, escalaOficina: 0, opOficina: 0, componenteO: 0,
            ajustes: 0, cierreMesM3: 0, cierreMesM2: 0, cierreMesM1: 0, extras: 0,
            gastosDetalle: [],
            gastosMendelMovilidad: 0,
            rendimientoGen: 0, cccGen: 0, socOpGen: 0, amortizacionAP: 0, gastosMovilidad: 0, kms: 0, auto: '', precioPorKm: 0, reintegroMovilidad: 0, gastosMkt: 0, gastosOficina: 0, amortizacioneDcac: 0,
            
            fijo: 0,
            variable_personal: 0,
            sueldoBruto: 0,
            resultado: 0,
            socOpOficina: 0,
            minimo: 0,
            cierreReal: 0,

            operacionesIds: [],
            operacionesDetalle: []
        });
    }

    const getOrCreateResult = (comercial: string): CommercialResult => {
        const key = comercial.toLowerCase();
        if (!resultsMap.has(key)) {
            const rosterEntry = roster.get(key);
            resultsMap.set(key, {
                idUsuario: rosterEntry?.codigo || '',
                mail: rosterEntry?.mail || '',
                fechaCierre: new Date(year, month - 1, 1).toISOString().split('T')[0],
                año: year,
                mes: month,
                añoMes: `${year}${month.toString().padStart(2, '0')}`,
                asociadoComercial: rosterEntry?.nombre || comercial,
                codigo: rosterEntry?.codigo || '',
                provincia: rosterEntry?.provincia || '',
                partido: rosterEntry?.partido || '',
                oficina: key === 'lucila frutos' ? 'Oficina Rio 4to' : (key === 'agustin acuna' ? 'Oficina Bavio' : (rosterEntry?.oficina || (key.includes('oficina') ? comercial : 'Desconocida'))),
                tipo: (key === 'lucila frutos' || key === 'agustin acuna') ? 'Oficina' : (rosterEntry?.tipo || (key.includes('oficina') ? 'Oficina' : '')),
                modalidad: rosterEntry?.modalidad || '',
                escalasTexto: rosterEntry?.escalas || '',
                categoria: rosterEntry?.categoria || 0,

                tropasGeneral: 0, cabezasGeneral: 0, cabzGenVenta: 0, cabzGenCompra: 0, importeGen: 0, resultado_final: 0, resultado_final_ajustado: 0, resultado_final_ajustado_regional_venta: 0, resultado_final_ajustado_regional_compra: 0, escalaGen: 0, componenteP: 0, componentePAju: 0,
                
                resInv: 0, resInvNeo: 0, resFaena: 0, resCria: 0, resMag: 0, cabInv: 0, cabInvNeo: 0, cabFaena: 0, cabCria: 0, cabMag: 0,

                tropasRegional: 0, cabezasRegional: 0, cabzRegVenta: 0, cabzRegCompra: 0, importeReg: 0, resultadoReg: 0, bolsaRegion: 0, tajadaRegion: 0, componenteR: 0,
                tropasOficina: 0, cabezasOfi: 0, cabzRegOfi: 0, cabzOfiCompra: 0, importeOfi: 0, resultadoOfi: 0, escalaOficina: 0, opOficina: 0, componenteO: 0,
                ajustes: 0, cierreMesM3: 0, cierreMesM2: 0, cierreMesM1: 0, extras: 0,
                gastosDetalle: [],
                gastosMendelMovilidad: 0,
                rendimientoGen: 0, cccGen: 0, socOpGen: 0, amortizacionAP: 0, gastosMovilidad: 0, kms: 0, auto: '', precioPorKm: 0, reintegroMovilidad: 0, gastosMkt: 0, gastosOficina: 0, amortizacioneDcac: 0,
                
                fijo: 0,
                variable_personal: 0,
                sueldoBruto: 0,
                resultado: 0,
                socOpOficina: 0,
                minimo: 0,
                cierreReal: 0,

                operacionesIds: [],
                operacionesDetalle: []
            });
        }
        return resultsMap.get(key)!;
    };

    const uniqueSocieties = new Map<string, Set<string>>();

    for (const entry of Array.from(roster.values())) {
        if (!entry.activo) continue;
        getOrCreateResult(entry.nombre);
    }

    for (const op of ops) {
        // === RESOLUCIÓN DE AC: 4 campos, prioridad legajo → sociedad → repre ===
        // Q95 trae:
        //   asociado_comercial_id_vend / asociado_comercial_id_comp  → AC del legajo (revisacion/negocio)
        //   asociado_comercial_soc_vend / asociado_comercial_soc_comp → AC de la sociedad (tag)
        //   RepreVendedor / RepreComprador → Representante
        // El engine legacy usa AC_Vend/AC_Comp que Metabase mapea de los id_vend/id_comp

        // Venta: 1) legajo, 2) sociedad, 3) repre
        const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
        const acSocVend = op.asociado_comercial_soc_vend || '';
        const repreVend = op.RepreVendedor || op.repre_vendedor || '';
        
        let vendRaw = acIdVend || acSocVend || repreVend || op.operador_nombre || '';
        let vendSource: 'legajo' | 'sociedad' | 'repre' | 'none' = 'none';
        if (acIdVend && acIdVend.trim()) vendSource = 'legajo';
        else if (acSocVend && acSocVend.trim()) vendSource = 'sociedad';
        else if (repreVend && repreVend.trim()) vendSource = 'repre';

        // Compra: 1) legajo, 2) sociedad, 3) repre
        const acIdComp = op.asociado_comercial_id_comp || op.AC_Comp || '';
        const acSocComp = op.asociado_comercial_soc_comp || '';
        const repreComp = op.RepreComprador || op.repre_comprador || '';
        
        let compRaw = acIdComp || acSocComp || repreComp || op.operador_nombre || '';
        let compSource: 'legajo' | 'sociedad' | 'repre' | 'none' = 'none';
        if (acIdComp && acIdComp.trim()) compSource = 'legajo';
        else if (acSocComp && acSocComp.trim()) compSource = 'sociedad';
        else if (repreComp && repreComp.trim()) compSource = 'repre';

        const acVend = await normalizeName(String(vendRaw));
        const acComp = await normalizeName(String(compRaw));

        const canalVenta = classifyChannel(acVend, repreVend, op.Canal_Venta, roster);
        const canalCompra = classifyChannel(acComp, repreComp, op.Canal_compra, roster);

        // Marca de alerta: si se resolvió por sociedad en vez de legajo
        let marcaVend = '';
        let marcaComp = '';
        if (acVend && vendSource === 'sociedad') marcaVend = '⚑'; // AC viene de la sociedad, no del legajo
        if (acComp && compSource === 'sociedad') marcaComp = '⚑';
        if (!acVend && !acComp) continue; // Sin AC en ningún lado, no se puede asignar

        const isDoblePunta = (acVend === acComp && acVend !== null);
        const cabezas = Number(op.Cabezas || op.cantidad) || 0;
        const importeVend = Number(op.importe_vendedor) || 0;
        const importeComp = Number(op.importe_comprador) || 0;
        const rawResultadoFinal = Number(op.resultado_final || op.resultado_total_proyectado) || 0;
        let resultadoFinalAjustado = rawResultadoFinal;
        let rendimiento = Number(op.rendimiento || op.Rendimiento) || 0;
        if (rendimiento === 0) {
            const baseImporte = importeVend || importeComp || 0;
            if (baseImporte > 0 && rawResultadoFinal > 0) {
                rendimiento = Math.round((rawResultadoFinal / baseImporte) * 10000) / 100;
            }
        }

        const tipoOp = String(op.Tipo || op.tipo_negocio || '').toUpperCase();
        const isMag = tipoOp.includes('MAG') || String(op.feria || '').toUpperCase() === 'MAG';
        const isFaenaCat = tipoOp.includes('FAENA');
        const isCria = tipoOp.includes('CRIA') || tipoOp.includes('REPRODUCTOR');
        const isInv = !isFaenaCat && !isCria && !isMag;
        const isFaena = tipoOp.includes('FAENA');
        // Metabase sends rendimiento as 2.17 (meaning 2.17%), so we use whole numbers for the limits
        const MAX_YIELD = isFaena ? 6 : 8;
        const MIN_YIELD = isFaena ? -2 : -4.5;

        // Apply Topes
        if (rendimiento > MAX_YIELD) {
            resultadoFinalAjustado = resultadoFinalAjustado * (MAX_YIELD / rendimiento);
        } else if (rendimiento < MIN_YIELD && rendimiento !== 0) {
            resultadoFinalAjustado = resultadoFinalAjustado * (MIN_YIELD / rendimiento);
        }

        // Determine assignment logic and markers
        // Case A: acVend is null but acComp exists → sociedad propia, assign 100% to compra
        // Case B: both exist and are different → 2/3 to vend, 1/3 to comp (each person)
        // Case C: both exist and same (doble punta) → 100% to that person
        // Case D: acVend exists but acComp is null → 2/3 to vend only

        const isVendEmpty = !acVend;
        const isCompEmpty = !acComp;

        if (isVendEmpty && !isCompEmpty) {
            // CASE A: Sociedad propia — AC Venta vacío, asignar TODO al comprador
            const resComp = getOrCreateResult(acComp!);

            if (!uniqueSocieties.has(acComp!)) uniqueSocieties.set(acComp!, new Set<string>());
            // As comprador, only their side's society counts
            if (op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre) uniqueSocieties.get(acComp!)!.add(String(op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre).toUpperCase().trim());

            resComp.cabezasGeneral += cabezas;
            resComp.cabzGenCompra += cabezas;
            resComp.importeGen += importeComp;
            resComp.tropasGeneral += 1;
            resComp.operacionesIds.push(op.id_lote || op.id);
            // Sin AC Venta → el comprador recibe 1/3 (el 2/3 va a la oficina)
            
            resComp.resultado_final += rawResultadoFinal * (1/3);
            resComp.resultado_final_ajustado += resultadoFinalAjustado * (1/3);
            resComp.resultado_final_ajustado_regional_compra += resultadoFinalAjustado * (1/3);

            const isInvNeo = (op.UN || '').toLowerCase().includes('neo');

            if (isMag) { resComp.cabMag += cabezas; resComp.resMag += resultadoFinalAjustado * (1/3); }
            else if (isFaenaCat) { resComp.cabFaena += cabezas; resComp.resFaena += resultadoFinalAjustado * (1/3); }
            else if (isCria) { resComp.cabCria += cabezas; resComp.resCria += resultadoFinalAjustado * (1/3); }
            else if (isInvNeo) { resComp.cabInvNeo += cabezas; resComp.resInvNeo += resultadoFinalAjustado * (1/3); }
            else { resComp.cabInv += cabezas; resComp.resInv += resultadoFinalAjustado * (1/3); }

            resComp.rendimientoGen += rendimiento;


            resComp.operacionesDetalle.push({
                id_lote: op.id_lote || op.id,
                tipo: tipoOp,
                fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '',
                sociedad_compradora: op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '',
                cantidad: cabezas,
                categoria: op.categoria || '',
                un: op.UN || '',
                importe_vendedor: importeVend,
                importe_comprador: importeComp,
                resultado_id: rawResultadoFinal,
                comercial_venta: '',
                comercial_compra: acComp!,
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0,
                bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento,
                rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: 0,
                resultado_topeado_compra: resultadoFinalAjustado * (1/3),
                escala_aplicada: 0,
                ganancia_personal_venta: 0,
                ganancia_personal_compra: 0,
                marca: marcaComp || '*', // * = Soc. propia, ⚑ = AC de sociedad
                canal_venta: canalVenta,
                canal_compra: canalCompra
            });

        } else if (acVend) {
            // CASES B, C, D: AC Venta exists
            const resVend = getOrCreateResult(acVend);
            
            if (!uniqueSocieties.has(acVend)) uniqueSocieties.set(acVend, new Set<string>());
            // As vendedor, only their side's society counts
            if (op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre) uniqueSocieties.get(acVend)!.add(String(op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre).toUpperCase().trim());

            resVend.cabzGenVenta += cabezas;
            resVend.importeGen += importeVend;
            if (!isDoblePunta) {
                resVend.cabezasGeneral += cabezas;
            }
            resVend.tropasGeneral += 1;
            resVend.operacionesIds.push(op.id_lote || op.id);
            
            resVend.resultado_final += rawResultadoFinal * (2/3);
            resVend.resultado_final_ajustado_regional_venta += resultadoFinalAjustado * (2/3); 
            resVend.resultado_final_ajustado += resultadoFinalAjustado * (2/3); 

            const isInvNeo = (op.UN || '').toLowerCase().includes('neo');

            if (isMag) { resVend.cabMag += cabezas; resVend.resMag += resultadoFinalAjustado * (2/3); }
            else if (isFaenaCat) { resVend.cabFaena += cabezas; resVend.resFaena += resultadoFinalAjustado * (2/3); }
            else if (isCria) { resVend.cabCria += cabezas; resVend.resCria += resultadoFinalAjustado * (2/3); }
            else if (isInvNeo) { resVend.cabInvNeo += cabezas; resVend.resInvNeo += resultadoFinalAjustado * (2/3); }
            else { resVend.cabInv += cabezas; resVend.resInv += resultadoFinalAjustado * (2/3); }
            
            resVend.rendimientoGen += rendimiento;
 
            
            resVend.operacionesDetalle.push({
                id_lote: op.id_lote || op.id,
                tipo: tipoOp,
                fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '',
                sociedad_compradora: op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '',
                cantidad: cabezas,
                categoria: op.categoria || '',
                importe_vendedor: importeVend,
                importe_comprador: importeComp,
                resultado_id: rawResultadoFinal,
                comercial_venta: acVend || '',
                comercial_compra: acComp || '',
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0,
                bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento,
                rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: resultadoFinalAjustado * (2/3),
                resultado_topeado_compra: 0,
                escala_aplicada: 0,
                ganancia_personal_venta: 0,
                ganancia_personal_compra: 0,
                marca: marcaVend, // ⚑ si viene de sociedad
                canal_venta: canalVenta,
                canal_compra: canalCompra
            });

            // Now handle compra side
            if (acComp) {
                const resComp = getOrCreateResult(acComp);

                if (!uniqueSocieties.has(acComp)) uniqueSocieties.set(acComp, new Set<string>());
                // As comprador, only their side's society counts
                if (op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre) uniqueSocieties.get(acComp)!.add(String(op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre).toUpperCase().trim());

                resComp.cabzGenCompra += cabezas;
                resComp.importeGen += importeComp;
                if (!isDoblePunta) {
                    resComp.cabezasGeneral += cabezas;
                } else if (acVend === acComp) {
                    resComp.cabezasGeneral += cabezas; // Count once for doble punta
                }
                if (acComp !== acVend) {
                    resComp.tropasGeneral += 1;
                    resComp.rendimientoGen += rendimiento;
                    resComp.operacionesIds.push(op.id_lote || op.id);
                }
                // Buyer ALWAYS gets 1/3, even if it's the same as the vendor
                
                resComp.resultado_final += rawResultadoFinal * (1/3);
                resComp.resultado_final_ajustado_regional_compra += resultadoFinalAjustado * (1/3);
                resComp.resultado_final_ajustado += resultadoFinalAjustado * (1/3);

                const isInvNeo = (op.UN || '').toLowerCase().includes('neo');

                if (isMag) { if (acVend !== acComp) resComp.cabMag += cabezas; resComp.resMag += resultadoFinalAjustado * (1/3); }
                else if (isFaenaCat) { if (acVend !== acComp) resComp.cabFaena += cabezas; resComp.resFaena += resultadoFinalAjustado * (1/3); }
                else if (isCria) { if (acVend !== acComp) resComp.cabCria += cabezas; resComp.resCria += resultadoFinalAjustado * (1/3); }
                else if (isInvNeo) { if (acVend !== acComp) resComp.cabInvNeo += cabezas; resComp.resInvNeo += resultadoFinalAjustado * (1/3); }
                else { if (acVend !== acComp) resComp.cabInv += cabezas; resComp.resInv += resultadoFinalAjustado * (1/3); }


                // Add or update details for buyer
                let det = resComp.operacionesDetalle.find(d => d.id_lote === (op.id_lote || op.id));
                if (det) {
                    det.resultado_topeado_compra = resultadoFinalAjustado * (1/3);
                } else {
                    const isCrossAC = acComp !== acVend;
                    resComp.operacionesDetalle.push({
                        id_lote: op.id_lote || op.id,
                        tipo: tipoOp,
                        fecha_operacion: op.fecha_operacion || '',
                        sociedad_vendedora: op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '',
                        sociedad_compradora: op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '',
                        cantidad: cabezas,
                        categoria: op.categoria || '',
                        un: op.UN || '',
                        importe_vendedor: importeVend,
                        importe_comprador: importeComp,
                        resultado_id: rawResultadoFinal,
                        comercial_venta: acVend || '',
                        comercial_compra: acComp || '',
                        bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0,
                        bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                        rendimiento_real: rendimiento,
                        rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                        resultado_topeado_venta: 0,
                        resultado_topeado_compra: resultadoFinalAjustado * (1/3),
                        escala_aplicada: 0,
                        ganancia_personal_venta: 0,
                        ganancia_personal_compra: 0,
                        marca: isCrossAC ? (marcaComp || '†') : marcaComp, // † = cross-AC, ⚑ = sociedad
                        canal_venta: canalVenta,
                        canal_compra: canalCompra
                    });
                }
            }
        }

        // Cuentas Especiales (Luli / Acuña) 
        // Si operan una de estas sociedades, les adjudicamos su parte aunque no figuren como AC.
        const opVendedora = String(op.RS_Vendedora || op.sociedad_vendedora || op.vendedor_nombre || '').toUpperCase().trim();
        const opCompradora = String(op.RS_Compradora || op.sociedad_compradora || op.comprador_nombre || '').toUpperCase().trim();
        
        const isVentaFrutos = cuentasFrutos.some(c => (c.razon_social && opVendedora === c.razon_social.toUpperCase()) || (c.cuit && op.cuit_vendedor === c.cuit) || (c.ac_metabase && op.vendedor_ac?.toUpperCase().includes(c.ac_metabase.toUpperCase())));
        const isCompraFrutos = cuentasFrutos.some(c => (c.razon_social && opCompradora === c.razon_social.toUpperCase()) || (c.cuit && op.cuit_comprador === c.cuit) || (c.ac_metabase && op.comprador_ac?.toUpperCase().includes(c.ac_metabase.toUpperCase())));

        if (isVentaFrutos && acVend !== 'lucila frutos') {
            const res = getOrCreateResult('Lucila Frutos');
            res.operacionesDetalle.push({
                id_lote: op.id_lote || op.id, tipo: tipoOp, fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: opVendedora, sociedad_compradora: opCompradora,
                cantidad: cabezas, categoria: op.categoria || '', un: op.UN || '',
                importe_vendedor: importeVend, importe_comprador: importeComp,
                resultado_id: rawResultadoFinal, comercial_venta: acVend || '', comercial_compra: acComp || '',
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0, bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento, rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: resultadoFinalAjustado, resultado_topeado_compra: 0,
                escala_aplicada: 0, ganancia_personal_venta: 0, ganancia_personal_compra: 0, marca: '⚑ Cta Especial',
                canal_venta: canalVenta, canal_compra: canalCompra
            });
        }
        if (isCompraFrutos && acComp !== 'lucila frutos' && !(isVentaFrutos && acVend === acComp)) {
            const res = getOrCreateResult('Lucila Frutos');
            res.operacionesDetalle.push({
                id_lote: op.id_lote || op.id, tipo: tipoOp, fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: opVendedora, sociedad_compradora: opCompradora,
                cantidad: cabezas, categoria: op.categoria || '', un: op.UN || '',
                importe_vendedor: importeVend, importe_comprador: importeComp,
                resultado_id: rawResultadoFinal, comercial_venta: acVend || '', comercial_compra: acComp || '',
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0, bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento, rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: 0, resultado_topeado_compra: resultadoFinalAjustado,
                escala_aplicada: 0, ganancia_personal_venta: 0, ganancia_personal_compra: 0, marca: '⚑ Cta Especial',
                canal_venta: canalVenta, canal_compra: canalCompra
            });
        }

        const isVentaAcuna = cuentasAcuna.some(c => (c.razon_social && opVendedora === c.razon_social.toUpperCase()) || (c.cuit && op.cuit_vendedor === c.cuit) || (c.ac_metabase && op.vendedor_ac?.toUpperCase().includes(c.ac_metabase.toUpperCase())));
        const isCompraAcuna = cuentasAcuna.some(c => (c.razon_social && opCompradora === c.razon_social.toUpperCase()) || (c.cuit && op.cuit_comprador === c.cuit) || (c.ac_metabase && op.comprador_ac?.toUpperCase().includes(c.ac_metabase.toUpperCase())));

        if (isVentaAcuna && !(acVend || '').toLowerCase().includes('acu')) {
            const res = getOrCreateResult('Agustin Acuna');
            res.operacionesDetalle.push({
                id_lote: op.id_lote || op.id, tipo: tipoOp, fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: opVendedora, sociedad_compradora: opCompradora,
                cantidad: cabezas, categoria: op.categoria || '', un: op.UN || '',
                importe_vendedor: importeVend, importe_comprador: importeComp,
                resultado_id: rawResultadoFinal, comercial_venta: acVend || '', comercial_compra: acComp || '',
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0, bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento, rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: resultadoFinalAjustado, resultado_topeado_compra: 0,
                escala_aplicada: 0, ganancia_personal_venta: 0, ganancia_personal_compra: 0, marca: '⚑ Cta Especial',
                canal_venta: canalVenta, canal_compra: canalCompra
            });
        }
        if (isCompraAcuna && !(acComp || '').toLowerCase().includes('acu') && !(isVentaAcuna && acVend === acComp)) {
            const res = getOrCreateResult('Agustin Acuna');
            res.operacionesDetalle.push({
                id_lote: op.id_lote || op.id, tipo: tipoOp, fecha_operacion: op.fecha_operacion || '',
                sociedad_vendedora: opVendedora, sociedad_compradora: opCompradora,
                cantidad: cabezas, categoria: op.categoria || '', un: op.UN || '',
                importe_vendedor: importeVend, importe_comprador: importeComp,
                resultado_id: rawResultadoFinal, comercial_venta: acVend || '', comercial_compra: acComp || '',
                bonificacion_vendedor: Number(op.bonificacion_vendedor) || 0, bonificacion_comprador: Number(op.bonificacion_comprador) || 0,
                rendimiento_real: rendimiento, rendimiento_topeado: rendimiento !== 0 ? (rendimiento * (resultadoFinalAjustado / rawResultadoFinal)) : 0,
                resultado_topeado_venta: 0, resultado_topeado_compra: resultadoFinalAjustado,
                escala_aplicada: 0, ganancia_personal_venta: 0, ganancia_personal_compra: 0, marca: '⚑ Cta Especial',
                canal_venta: canalVenta, canal_compra: canalCompra
            });
        }
    }

    // Set socOpGen
    for (const res of resultsMap.values()) {
        res.socOpGen = uniqueSocieties.get(res.asociadoComercial)?.size || 0;
        res.rendimientoGen = res.tropasGeneral > 0 ? res.rendimientoGen / res.tropasGeneral : 0;
    }

    interface PoolStats {
        cabezas: number; resultado: number; socOpGen: number; count: number; tropas: number; loteIds: Set<number>;
        resInv: number; resFaena: number; resNeo: number; resCria: number; resMag: number;
        cabInv: number; cabFaena: number; cabNeo: number; cabCria: number; cabMag: number;
    }
    const createPoolStats = (): PoolStats => ({
        cabezas: 0, resultado: 0, socOpGen: 0, count: 0, tropas: 0, loteIds: new Set<number>(),
        resInv: 0, resFaena: 0, resNeo: 0, resCria: 0, resMag: 0,
        cabInv: 0, cabFaena: 0, cabNeo: 0, cabCria: 0, cabMag: 0
    });

    const officeAgentPools = new Map<string, PoolStats>();
    const officePseudoAgentPools = new Map<string, PoolStats>();

    for (const res of resultsMap.values()) {
        const poolKey = res.oficina || res.provincia || 'Sin Zona';

        const isPseudo = res.tipo.toLowerCase().includes('oficina');
        const isSinMinimo = res.modalidad.toLowerCase().includes('sin minimo') || res.categoria === 6;
        const isSimple = res.modalidad.toLowerCase().includes('simple');
        const isOperario = res.tipo.toLowerCase().includes('operario');

        // Regional pool: ALL agents in the office/province (real + pseudo)
        const currentPool = officeAgentPools.get(poolKey) || createPoolStats();
        
        currentPool.resultado += res.resultado_final_ajustado;
        currentPool.resInv += res.resInv;
        currentPool.resFaena += res.resFaena;
        currentPool.resNeo += res.resInvNeo;
        currentPool.resCria += res.resCria;
        currentPool.resMag += res.resMag;

        // V4.0 Logic: TODOS los reales suman a la tajada total y al %OP total
        if (!isPseudo) {
            currentPool.socOpGen += res.socOpGen;
            currentPool.count += 1; // Count all real agents (Completo, Simple, Operario) for the denominator
        }
        
        for (const det of res.operacionesDetalle) {
            if (!currentPool.loteIds.has(det.id_lote)) {
                currentPool.loteIds.add(det.id_lote);
                const cant = Number(det.cantidad) || 0;
                currentPool.cabezas += cant;
                currentPool.tropas += 1;
                
                const tipoLower = det.tipo.toLowerCase();
                const unLower = (det.un || '').toLowerCase();
                if (unLower.includes('neo') || tipoLower.includes('neo')) currentPool.cabNeo += cant;
                else if (tipoLower.includes('invernada')) currentPool.cabInv += cant;
                else if (tipoLower.includes('faena')) currentPool.cabFaena += cant;
                else if (tipoLower.includes('cria') || tipoLower.includes('cría')) currentPool.cabCria += cant;
                else currentPool.cabMag += cant;
            }
        }
        officeAgentPools.set(poolKey, currentPool);

        // Oficina pool: ONLY pseudo-agents (directas de oficina)
        if (isPseudo) {
            const current = officePseudoAgentPools.get(poolKey) || createPoolStats();
            current.resultado += res.resultado_final_ajustado;
            current.resInv += res.resInv;
            current.resFaena += res.resFaena;
            current.resNeo += res.resInvNeo;
            current.resCria += res.resCria;
            current.resMag += res.resMag;

            for (const det of res.operacionesDetalle) {
                if (!current.loteIds.has(det.id_lote)) {
                    current.loteIds.add(det.id_lote);
                    const cant = Number(det.cantidad) || 0;
                    current.cabezas += cant;
                    current.tropas += 1;
                    
                    const tipoLower = det.tipo.toLowerCase();
                    const unLower = (det.un || '').toLowerCase();
                    if (unLower.includes('neo') || tipoLower.includes('neo')) current.cabNeo += cant;
                    else if (tipoLower.includes('invernada')) current.cabInv += cant;
                    else if (tipoLower.includes('faena')) current.cabFaena += cant;
                    else if (tipoLower.includes('cria') || tipoLower.includes('cría')) current.cabCria += cant;
                    else current.cabMag += cant;
                }
            }
            officePseudoAgentPools.set(poolKey, current);
        }
    }

    // Apply Scales and Contracts
    const finalResults = Array.from(resultsMap.values());

    for (const res of finalResults) {
        // 1. Minimum Guaranteed (con % override del roster para Part Time u otros)
        const rosterEntry = roster.get(res.asociadoComercial.toLowerCase());
        const pctMinimo = rosterEntry?.pctMinimo ?? 1.0;
        const baseMinimo = await getMinimumForCategory(Number(res.categoria) || 0, year, month);
        res.minimo = Math.round(baseMinimo * pctMinimo);

        // 2. Componente Personal (Componente_P)
        const isOperario = res.tipo.toLowerCase().includes('operario');
        const isFijo = res.modalidad.toLowerCase() === 'fijo' && !isOperario;
        const isAcuña = res.asociadoComercial.toLowerCase() === 'agustin acuna' || res.asociadoComercial.toLowerCase() === 'agustín acuña';
        const isFrutos = res.asociadoComercial.toLowerCase() === 'lucila frutos' || res.modalidad.toLowerCase().includes('kam') || res.modalidad.toLowerCase().includes('frutos');
        let pctPersonal = 0;
        
        const configModel = await getModelByModalidad(res.modalidad);
        const isCustomModel = !['completa', 'simple', 'hibrida', 'sin minimo', 'operario', 'fijo'].includes(configModel.id) && !isFrutos && !isAcuña;

        if (isCustomModel) {
            // Evaluación del Componente Personal en el Modelo Custom
            if (configModel.componenteP?.activa) {
                const umbral = configModel.componenteP.umbralCabezas || 0;
                if (res.cabezasGeneral >= umbral) {
                    pctPersonal = await resolveScalePct(res.cabezasGeneral, configModel.componenteP.escalaId || 'escalaAC', year, month);
                } else {
                    pctPersonal = 0;
                }
            } else {
                pctPersonal = 0;
            }
            
            res.escalaGen = pctPersonal;
            res.componenteP = res.resultado_final_ajustado * pctPersonal;
            for (const det of res.operacionesDetalle) {
                det.escala_aplicada = res.escalaGen;
                det.ganancia_personal_venta = det.resultado_topeado_venta * res.escalaGen;
                det.ganancia_personal_compra = det.resultado_topeado_compra * res.escalaGen;
            }
        } else {
            // Lógica tradicional de compatibilidad para modelos estáticos
            if (isOperario || isFijo) {
                pctPersonal = 0.10; // Operarios y Fijo: 10% fijo
            } else if (res.escalasTexto === 'Oficina') {
                pctPersonal = await getExactScale(res.cabezasGeneral, 'escalaPersonal', year, month);
            } else {
                pctPersonal = await getExactScale(res.cabezasGeneral, 'escalaAC', year, month);
            }
            
            if (isAcuña) {
                let totalAcuna = 0;
                for (const det of res.operacionesDetalle) {
                    let isEspecial = false;
                    const isVenta = det.resultado_topeado_venta > 0;
                    const isCompra = det.resultado_topeado_compra > 0;
                    
                    const cuentaMatch = cuentasAcuna.find(c => 
                        (isVenta && c.razon_social && c.razon_social.toLowerCase() === det.sociedad_vendedora?.toLowerCase()) ||
                        (isCompra && c.razon_social && c.razon_social.toLowerCase() === det.sociedad_compradora?.toLowerCase()) ||
                        (isVenta && c.ac_metabase && det.vendedor_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase())) ||
                        (isCompra && c.ac_metabase && det.comprador_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase()))
                    );

                    const pct = cuentaMatch && cuentaMatch.porcentaje ? (cuentaMatch.porcentaje / 100) : 0.3;
                    
                    det.escala_aplicada = pct;
                    det.ganancia_personal_venta = det.resultado_topeado_venta * pct;
                    det.ganancia_personal_compra = det.resultado_topeado_compra * pct;
                    totalAcuna += (det.ganancia_personal_venta + det.ganancia_personal_compra);
                }
                res.escalaGen = 0.3; // Referencia general
                res.componenteP = totalAcuna;

            } else if (isFrutos) {
                res.escalaGen = 0;
                let totalP = 0;
                let gcTotal = 0, mermasTotal = 0, cisTotal = 0;

                // Helper: parsear "01 / 11 / 24" → Date
                const parseFechaIncorp = (f: string): Date | null => {
                    if (!f) return null;
                    const parts = f.replace(/\s/g, '').split('/');
                    if (parts.length !== 3) return null;
                    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1;
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    return new Date(y, m, d);
                };

                // Helper: ¿la cuenta está vigente? (8 meses desde fecha_incorporacion)
                const MESES_VIGENCIA = 8;
                const fechaOperRef = new Date(year, month - 1, 15); // mitad del mes de cierre
                const cuentaVigente = (cuenta: any): boolean => {
                    if (!cuenta || !cuenta.fecha_incorporacion) return true; // sin fecha = vigente por defecto
                    const fechaAlta = parseFechaIncorp(cuenta.fecha_incorporacion);
                    if (!fechaAlta) return true;
                    const diffMs = fechaOperRef.getTime() - fechaAlta.getTime();
                    const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30.44);
                    return diffMeses <= MESES_VIGENCIA;
                };

                for (const det of res.operacionesDetalle) {
                    const isVenta = det.resultado_topeado_venta > 0;
                    const isCompra = det.resultado_topeado_compra > 0;
                    const esCtaEspecial = det.marca === '⚑ Cta Especial';

                    let pctVenta = 0;
                    let pctCompra = 0;
                    let catVenta = 'Sin Comision';
                    let catCompra = 'Sin Comision';

                    if (esCtaEspecial) {
                        // Operación viene por matching de sociedad en cuentas especiales
                        // Solo cobra si la cuenta es del tipo correcto, lado correcto, y vigente
                        const cuentaMatchVenta = cuentasFrutos.find(c => (c.razon_social && c.razon_social.toLowerCase() === det.sociedad_vendedora?.toLowerCase()) || (c.ac_metabase && det.vendedor_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase())));
                        const cuentaMatchCompra = cuentasFrutos.find(c => (c.razon_social && c.razon_social.toLowerCase() === det.sociedad_compradora?.toLowerCase()) || (c.ac_metabase && det.comprador_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase())));

                        // VENTA: Solo Mermas vigente
                        if (cuentaMatchVenta && cuentaMatchVenta.tipo_cuenta === 'Mermas' && cuentaVigente(cuentaMatchVenta)) {
                            if (det.tipo.toLowerCase().includes('faena')) pctVenta = 0.20;
                            else pctVenta = 0.15;
                            catVenta = 'Mermas';
                        }
                        // Vencida o tipo incorrecto → 0%

                        // COMPRA: Solo Activacion CI vigente
                        if (cuentaMatchCompra && cuentaMatchCompra.tipo_cuenta === 'Activacion CI' && cuentaVigente(cuentaMatchCompra)) {
                            pctCompra = 0.10;
                            catCompra = 'Activacion CI';
                        }
                        // Vencida o tipo incorrecto → 0%
                    } else {
                        // Operación donde Luli es AC directo → Grandes Cuentas
                        pctVenta = 0.04;
                        pctCompra = 0.02;
                        catVenta = 'Operaciones Grandes';
                        catCompra = 'Operaciones Grandes';
                    }

                    det.ganancia_personal_venta = isVenta ? (det.resultado_topeado_venta * pctVenta) : 0;
                    det.ganancia_personal_compra = isCompra ? (det.resultado_topeado_compra * pctCompra) : 0;
                    det.escala_aplicada = isVenta ? pctVenta : (isCompra ? pctCompra : 0);
                    det.categoria_venta = catVenta;
                    det.categoria_compra = catCompra;
                    totalP += (det.ganancia_personal_venta + det.ganancia_personal_compra);

                    // Acumular subtotales por categoría
                    if (catVenta === 'Mermas') mermasTotal += det.ganancia_personal_venta;
                    else if (catVenta === 'Operaciones Grandes') gcTotal += det.ganancia_personal_venta;

                    if (catCompra === 'Activacion CI') cisTotal += det.ganancia_personal_compra;
                    else if (catCompra === 'Operaciones Grandes') gcTotal += det.ganancia_personal_compra;
                }
                res.componenteP = totalP;
                res.grandesCuentas = gcTotal;
                res.mermas = mermasTotal;
                res.activacionCIS = cisTotal;
            } else {
                res.escalaGen = pctPersonal;
                res.componenteP = res.resultado_final_ajustado * pctPersonal;
                for (const det of res.operacionesDetalle) {
                    det.escala_aplicada = res.escalaGen;
                    det.ganancia_personal_venta = det.resultado_topeado_venta * res.escalaGen;
                    det.ganancia_personal_compra = det.resultado_topeado_compra * res.escalaGen;
                }
            }
        }

        // 3. Componentes Regional y Oficina
        // Componente Regional = Resultado Total de la Provincia × Escala Provincial × Tajada
        const poolKey = res.oficina || res.provincia || 'Sin Zona';
        const agentPool = officeAgentPools.get(poolKey) || createPoolStats();
        res.tropasRegional = agentPool.tropas;
        res.cabezasRegional = agentPool.cabezas;
        res.resultadoReg = agentPool.resultado;
        
        res.resInvReg = agentPool.resInv; res.cabInvReg = agentPool.cabInv;
        res.resFaenaReg = agentPool.resFaena; res.cabFaenaReg = agentPool.cabFaena;
        res.resCriaReg = agentPool.resCria; res.cabCriaReg = agentPool.cabCria;
        res.resMagReg = agentPool.resMag; res.cabMagReg = agentPool.cabMag;
        res.resInvNeoReg = agentPool.resNeo; res.cabInvNeoReg = agentPool.cabNeo;
        
        // V3.0: Bolsa se divide por 2 para Buenos Aires
        // V3.0: Bolsa se divide por 2 para Buenos Aires
        let bolsaScale = await getExactScale(res.cabezasRegional, 'escalaProvincial', year, month);
        if (res.provincia.toLowerCase().includes('buenos aires')) {
            bolsaScale = bolsaScale / 2;
        }
        
        // Operarios tienen bolsa fija del 10% (audio confirm)
        if (isOperario) {
            bolsaScale = 0.10;
        }
        res.bolsaRegion = bolsaScale;

        // isPseudo = agente virtual de oficina (ej: "Oficina Rio 4to"), NO city managers
        const isPseudo = res.tipo.toLowerCase().includes('oficina');
        const isSinMinimo = res.modalidad.toLowerCase().includes('sin minimo') || res.categoria === 6;
        const isSimple = res.modalidad.toLowerCase().includes('simple') || res.modalidad.toLowerCase().includes('part time') || res.modalidad.toLowerCase().includes('part-time');
        const isCityManager = res.tipo === 'City Manager' || res.modalidad.toLowerCase().includes('hibrida') || res.modalidad.toLowerCase().includes('hibrido');

        // Fetch Tajada history to allow overrides
        const tajadaHist = tajadaData.find(t => t.añoMes === añoMes && t.comercial.toLowerCase() === res.asociadoComercial.toLowerCase());
        
        if (tajadaHist && tajadaHist.porcentajeTajada > 0) {
            res.tajadaRegion = tajadaHist.porcentajeTajada;
            res.socOpOficina = tajadaHist.totalOficina > 0 ? tajadaHist.totalOficina : agentPool.socOpGen;
        } else {
            // Dynamic fallback if not found or 0
            if (!isPseudo) {
                res.tajadaRegion = agentPool.socOpGen > 0 ? (res.socOpGen / agentPool.socOpGen) : 0;
            } else {
                res.tajadaRegion = 0;
            }
            res.socOpOficina = agentPool.socOpGen;
        }
        
        // Componente Oficina = ops directas (sin AC) de la oficina
        const pseudoPool = officePseudoAgentPools.get(poolKey) || createPoolStats();
        res.tropasOficina = pseudoPool.tropas;
        res.cabezasOfi = pseudoPool.cabezas;
        res.resultadoOfi = pseudoPool.resultado;

        res.resInvOfi = pseudoPool.resInv; res.cabInvOfi = pseudoPool.cabInv;
        res.resFaenaOfi = pseudoPool.resFaena; res.cabFaenaOfi = pseudoPool.cabFaena;
        res.resCriaOfi = pseudoPool.resCria; res.cabCriaOfi = pseudoPool.cabCria;
        res.resMagOfi = pseudoPool.resMag; res.cabMagOfi = pseudoPool.cabMag;
        res.resInvNeoOfi = pseudoPool.resNeo; res.cabInvNeoOfi = pseudoPool.cabNeo;

        res.escalaOficina = await getExactScale(res.cabezasOfi, 'escalaOficina', year, month);
        res.opOficina = agentPool.count > 0 ? (1 / agentPool.count) : 0;

        const OFICINAS_ELEGIBLES = ['oficina rio 4to', 'oficina entre rios', 'oficina bavio'];
        const isOficinaElegible = OFICINAS_ELEGIBLES.some(o => res.oficina.toLowerCase().includes(o)) 
            || res.provincia.toLowerCase() === 'cordoba';

        // ── Asignación de Componentes por Modelo (mutuamente excluyente) ──
        
        if (isPseudo) {
            // Pseudo-agentes de oficina: sin componentes propios
            res.componenteR = 0;
            res.componenteO = 0;
        } else if (isCustomModel) {
            // Evaluación del modelo custom paramétrico
            res.componenteR = configModel.componenteR.activa 
                ? (res.tajadaRegion * res.bolsaRegion * res.resultadoReg * (configModel.componenteR.pesoR ?? 1.0)) 
                : 0;
                
            if (configModel.componenteO.activa && isOficinaElegible) {
                res.componenteO = res.opOficina * res.escalaOficina * res.resultadoOfi * (configModel.componenteO.pesoO ?? 1.0);
            } else {
                res.componenteO = 0;
            }
        } else if (isFrutos || isAcuña) {
            // Modelo Frutos/Acuña: solo Personal (especial), 0 Regional, 0 Oficina
            res.componenteR = 0; 
            res.componenteO = 0;
        } else if (isOperario) {
            // Modelo Operario: 10% Regional de su PROPIA ganancia, 0 Oficina
            res.componenteR = res.bolsaRegion * res.resultado_final_ajustado;
            res.componenteO = 0;
        } else if (isCityManager) {
            // Modelo City Manager (Híbrido): Regional × 50%, sin Oficina
            res.componenteR = res.tajadaRegion * res.bolsaRegion * res.resultadoReg * 0.5;
            res.componenteO = 0;
        } else if (isSinMinimo) {
            // Modelo Sin Mínimo: SOLO Personal, 0 Regional, 0 Oficina
            res.componenteR = 0;
            res.componenteO = 0;
        } else if (isSimple) {
            // Modelo Simple: SOLO Personal, 0 Regional, 0 Oficina
            res.componenteR = 0;
            res.componenteO = 0;
        } else if (res.modalidad.toLowerCase() === 'fijo') {
            // Modelo Fijo (Lizaso, De Aduriz): SOLO Personal, 0 Regional, 0 Oficina
            res.componenteR = 0;
            res.componenteO = 0;
        } else {
            // Modelo Completa (estándar): R + O
            res.componenteR = res.tajadaRegion * res.bolsaRegion * res.resultadoReg;
            
            // Oficina: solo si la oficina es elegible
            if (isOficinaElegible) {
                res.componenteO = res.opOficina * res.escalaOficina * res.resultadoOfi;
            } else {
                res.componenteO = 0;
            }
        }

        // 4. Sueldo Bruto y Estructura de Presentación
        res.fijo = res.minimo;

        // Regla de Negocio Crítica: El fijo/mínimo absorbe a la componente personal.
        // Si no supera el mínimo, pierde las componentes Regional y Oficina (salvo excepciones).
        const isDavidMenghi = res.asociadoComercial.toLowerCase() === 'david menghi';
        const hasNoMinimum = isCustomModel ? !configModel.tieneMinimo : res.modalidad.includes('Sin minimo');

        if (hasNoMinimum) {
            res.fijo = 0;
            res.variable_personal = res.componenteP;
        } else {
            if (res.componenteP < res.minimo) {
                res.variable_personal = 0;
                // Si no llega al mínimo y no es David Menghi, pierde los premios
                if (!isDavidMenghi) {
                    res.componenteR = 0;
                    res.componenteO = 0;
                }
            } else {
                res.variable_personal = res.componenteP - res.minimo;
            }
        }

        res.resultado = res.fijo + res.variable_personal + res.componenteR + res.componenteO;
        res.sueldoBruto = res.resultado;

        // 5. Gastos: KMS + Mendel + Amortización DCAC
        const nameLC = res.asociadoComercial.toLowerCase();
        
        // 5a. Amortización DCAC (Calculada primero para usar en la lógica de coche propio vs empresa)
        const amortEntry = amortData.find(a => a.comercial.toLowerCase() === nameLC);
        if (amortEntry) {
            // Use 2025 rate (latest available), divide by 12 for monthly
            res.amortizacioneDcac = Math.round((amortEntry.amort2025 || amortEntry.amort2024) / 12);
        } else {
            res.amortizacioneDcac = 0;
        }

        // 5b. KMS movilidad
        const kmsEntry = kmsData.find(k => k.año === year && k.mes === month && k.comercial.toLowerCase() === nameLC);
        if (kmsEntry) {
            res.kms = kmsEntry.kmsEmpresa;
            // Resolve vehicle type: Kms & $ mapping > Amort_DCAC model inference > KMS raw type
            const vehicleType = vehicleMap.get(nameLC) || '';
            // If no direct mapping, infer from Amort_DCAC model name
            let resolvedType = vehicleType;
            if (!resolvedType && amortEntry) {
                const model = amortEntry.modelo.toLowerCase();
                if (model.includes('hilux') || model.includes('ranger') || model.includes('amarok')) resolvedType = 'camioneta';
                else if (model.includes('sw4') || model.includes('fortuner') || model.includes('tracker')) resolvedType = 'suv';
                else resolvedType = 'auto';
            }
            res.auto = resolvedType || kmsEntry.tipoVehiculo || 'auto';
            res.precioPorKm = preciosKm.get(res.auto) || preciosKm.get('auto') || 0;
            
            // Regla Tipo de Vehículo: Usar columna F (Tipo) de la hoja de KMS, o amortización > 0, o Valentín/David, o contiene 'empresa'
            const esVehiculoEmpresa = kmsEntry.tipoVehiculo.toLowerCase().includes('dcac') || 
                                      res.amortizacioneDcac > 0 || 
                                      nameLC === 'valentin torriglia' || 
                                      nameLC === 'david menghi' || 
                                      res.auto.toLowerCase().includes('empresa');
            
            if (esVehiculoEmpresa) {
                res.reintegroMovilidad = 0;
                res.amortizacioneDcac = 0; // Se remueve la amortización para vehículos de la empresa
            } else {
                res.reintegroMovilidad = res.kms * res.precioPorKm;
            }
            res.gastosMovilidad = 0; // Se elimina el gasto espejo redundante
        } else {
            res.kms = 0;
            res.reintegroMovilidad = 0;
            res.gastosMovilidad = 0;
            res.amortizacioneDcac = 0; // Se remueve la amortización para vehículos de la empresa
        }
        
        // 5c. Mendel (gastos de tarjeta corporativa) - Período anterior (M-1)
        let prevM = month - 1;
        let prevY = year;
        if (prevM === 0) {
            prevM = 12;
            prevY = year - 1;
        }
        const prevAñoMes = `${prevY}${String(prevM).padStart(2, '0')}`;
        
        const normalizeName = (n: string) => (n || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const mendelMes = mendelData.filter(m => m.periodo === prevAñoMes && normalizeName(m.usuario) === normalizeName(res.asociadoComercial));
        res.gastosMkt = mendelMes.reduce((sum, m) => sum + m.importe, 0);
        
        const catMap = new Map<string, number>();
        mendelMes.forEach(m => {
            const cat = m.categoria || 'Sin Categoría';
            catMap.set(cat, (catMap.get(cat) || 0) + m.importe);
        });
        res.gastosDetalle = Array.from(catMap.entries()).map(([c, i]) => ({ categoria: c, importe: i }));
        
        const CATEGORIAS_MOVILIDAD = ['Combustible', 'Service / Reparaciones Auto', 'Peajes'];
        res.gastosMendelMovilidad = mendelMes
            .filter(m => CATEGORIAS_MOVILIDAD.includes(m.categoria))
            .reduce((sum, m) => sum + m.importe, 0);
        
        // 5d. Ajustes manuales del mes
        const manualMes = manualAdjustments.filter(a => a.año === year && a.mes === month && normalizeName(a.comercial) === normalizeName(res.asociadoComercial));
        res.ajustes = manualMes.reduce((sum, a) => sum + a.monto, 0);
        res.ajustesManuales = res.ajustes;

        // 5e. Cierres de meses anteriores de BDSUELDO_REAL (M-1, M-2, M-3)
        let prevM1_M = month - 1, prevM1_Y = year;
        if (prevM1_M === 0) { prevM1_M = 12; prevM1_Y = year - 1; }
        
        let prevM2_M = month - 2, prevM2_Y = year;
        if (prevM2_M <= 0) { prevM2_M += 12; prevM2_Y = year - 1; }
        
        let prevM3_M = month - 3, prevM3_Y = year;
        if (prevM3_M <= 0) { prevM3_M += 12; prevM3_Y = year - 1; }

        const entryM1 = historicalSalaries.find(h => h.año === prevM1_Y && h.mes === prevM1_M && h.comercial.toLowerCase() === nameLC);
        const entryM2 = historicalSalaries.find(h => h.año === prevM2_Y && h.mes === prevM2_M && h.comercial.toLowerCase() === nameLC);
        const entryM3 = historicalSalaries.find(h => h.año === prevM3_Y && h.mes === prevM3_M && h.comercial.toLowerCase() === nameLC);

        res.cierreMesM1 = entryM1 ? entryM1.sueldoNeto : 0;
        res.cierreMesM2 = entryM2 ? entryM2.sueldoNeto : 0;
        res.cierreMesM3 = entryM3 ? entryM3.sueldoNeto : 0;
        
        // Total gastos
        const totalGastos = res.gastosMovilidad + res.gastosMkt + res.amortizacioneDcac;

        // 6. Cierre Real (Neto): Sueldo + Ajustes + Reintegro Movilidad (restando Mendel de movilidad si tiene auto propio, Mendel otros es anecdótico) - Amortización
        let reintegroNeto = res.reintegroMovilidad;
        const tieneAutoPropio = (res.reintegroMovilidad || 0) > 0;
        if (tieneAutoPropio) {
            reintegroNeto = reintegroNeto - (res.gastosMendelMovilidad || 0);
        }
        
        // V3.0: Pablo Cieri tiene ajuste de -20% por gastos SIN DCAC
        let ajusteEspecial = 0;
        if (res.asociadoComercial.toLowerCase() === 'pablo cieri') {
            ajusteEspecial = res.componenteP * -0.20;
        }
        
        // Regla de Mínimo Garantizado Absoluto
        const totalComponentes = res.componenteP + res.componenteR + res.componenteO;

        // Aguinaldo (SAC) para Junio y Diciembre
        let aguinaldo = 0;
        
        // 1. Check if there's a manual override in the adjustments sheet
        const manualSacAdj = res.retroactivosDetalle?.find(adj => 
            (adj as any).motivo?.toLowerCase().includes('aguinaldo') || 
            (adj as any).motivo?.toLowerCase().includes('sac') ||
            (adj as any).observaciones?.toLowerCase().includes('aguinaldo')
        );

        if (manualSacAdj) {
            aguinaldo = manualSacAdj.deltaResultado;
            // Remove it from the general ajustes pool so it doesn't double-count
            res.ajustes -= manualSacAdj.deltaResultado;
        } else if (month === 6 || month === 12) {
            // 2. Automatic calculation for Jun/Dec if no manual override
            const isAcunaOrFrutos = ['agustin acuna', 'agustn acua', 'lucila frutos'].includes(res.asociadoComercial.toLowerCase());
            const exentosAguinaldo = ['manu pons', 'manuel pons', 'alan garcia', 'alan garca', 'milagros lizazo'];
            if (!isAcunaOrFrutos && !exentosAguinaldo.includes(res.asociadoComercial.toLowerCase())) {
                const minimosSemestre = [];
                for (let i = 1; i <= 5; i++) {
                    let m = month - i;
                    let y = year;
                    if (m <= 0) {
                        m += 12;
                        y -= 1;
                    }
                    const prevBaseMinimo = await getMinimumForCategory(Number(res.categoria) || 0, y, m);
                    const prevMinimoReal = Math.round(prevBaseMinimo * (rosterEntry?.pctMinimo ?? 1.0));
                    minimosSemestre.push(prevMinimoReal);
                }
                const maxMinimo = Math.max(...minimosSemestre);
                aguinaldo = Math.round(maxMinimo * 0.5);
            }
        }
        res.aguinaldo = aguinaldo;

        const sueldoFinal = Math.max(res.minimo, totalComponentes + res.ajustes) + aguinaldo;
        
        res.cierreReal = sueldoFinal + reintegroNeto - res.amortizacioneDcac + ajusteEspecial;
    }

    return finalResults;
}

// Retroactive Adjustment Engine — Método Genuino
// Usa escala CONGELADA × delta de resultado para no generar efecto cascada

export async function calculateRetroactiveAdjustments(year: number, month: number): Promise<RetroactiveAdjustment[]> {
    const adjustments: RetroactiveAdjustment[] = [];

    // Revisar 3 meses anteriores (M-1, M-2, M-3)
    for (let i = 1; i <= 3; i++) {
        let pastMonth = month - i;
        let pastYear = year;
        if (pastMonth <= 0) {
            pastMonth += 12;
            pastYear -= 1;
        }

        const frozenData = await loadMonthSnapshot(pastYear, pastMonth);
        if (!frozenData) {
            console.log(`[retro] No hay snapshot estático para ${pastYear}-${pastMonth}, skip`);
            continue;
        }
        const dynamicResults = await calculateDynamicMonth(pastYear, pastMonth);

        console.log(`[retro] Comparando ${pastYear}-${pastMonth}: ${frozenData.length} congelados vs ${dynamicResults.length} dinámicos`);

        for (const dynRes of dynamicResults) {
            const frozen = frozenData.find(h => h.asociadoComercial.toLowerCase() === dynRes.asociadoComercial.toLowerCase());

            if (!frozen) {
                // Agente nuevo que no estaba en el cierre original
                if (dynRes.resultado_final_ajustado > 0) {
                    adjustments.push({
                        año: year,
                        mes: month,
                        comercial: dynRes.asociadoComercial,
                        idUsuario: dynRes.idUsuario,
                        mail: dynRes.mail,
                        provincia: dynRes.provincia,
                        oficina: dynRes.oficina,
                        mesAjustado: pastMonth,
                        añoAjustado: pastYear,
                        escalaCongelada: dynRes.escalaGen,
                        resultadoCongelado: 0,
                        resultadoDinamico: dynRes.resultado_final_ajustado,
                        deltaResultado: dynRes.resultado_final_ajustado,
                        ajusteComponenteP: dynRes.escalaGen * dynRes.resultado_final_ajustado,
                        detalleLotes: dynRes.operacionesDetalle.map(op => ({
                            idLote: op.id_lote,
                            tipo: 'nuevo' as const,
                            cabezasAntes: 0,
                            cabezasDespues: op.cantidad,
                            resultadoAntes: 0,
                            resultadoDespues: (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0),
                            sociedadVendedora: op.sociedad_vendedora || '',
                            sociedadCompradora: op.sociedad_compradora || ''
                        }))
                    });
                }
                continue;
            }

            // Comparar lotes uno a uno
            const frozenLotes = new Map(frozen.operacionesDetalle.map(op => [op.id_lote, op]));
            const dynamicLotes = new Map(dynRes.operacionesDetalle.map(op => [op.id_lote, op]));
            const loteChanges: LoteChange[] = [];

            // Nuevos o modificados
            for (const [id, dynOp] of dynamicLotes.entries()) {
                const frozOp = frozenLotes.get(id);
                const dynResultado = (dynOp.resultado_topeado_venta || 0) + (dynOp.resultado_topeado_compra || 0);

                if (!frozOp) {
                    loteChanges.push({
                        idLote: id,
                        tipo: 'nuevo',
                        cabezasAntes: 0,
                        cabezasDespues: dynOp.cantidad,
                        resultadoAntes: 0,
                        resultadoDespues: dynResultado,
                        sociedadVendedora: dynOp.sociedad_vendedora || '',
                        sociedadCompradora: dynOp.sociedad_compradora || ''
                    });
                } else {
                    const frozResultado = (frozOp.resultado_topeado_venta || 0) + (frozOp.resultado_topeado_compra || 0);
                    if (dynOp.cantidad !== frozOp.cantidad || Math.abs(dynResultado - frozResultado) > 1) {
                        loteChanges.push({
                            idLote: id,
                            tipo: 'modificado',
                            cabezasAntes: frozOp.cantidad,
                            cabezasDespues: dynOp.cantidad,
                            resultadoAntes: frozResultado,
                            resultadoDespues: dynResultado,
                            sociedadVendedora: dynOp.sociedad_vendedora || '',
                            sociedadCompradora: dynOp.sociedad_compradora || ''
                        });
                    }
                }
            }

            // Caídos
            for (const [id, frozOp] of frozenLotes.entries()) {
                if (!dynamicLotes.has(id)) {
                    const frozResultado = (frozOp.resultado_topeado_venta || 0) + (frozOp.resultado_topeado_compra || 0);
                    loteChanges.push({
                        idLote: id,
                        tipo: 'caido',
                        cabezasAntes: frozOp.cantidad,
                        cabezasDespues: 0,
                        resultadoAntes: frozResultado,
                        resultadoDespues: 0,
                        sociedadVendedora: frozOp.sociedad_vendedora || '',
                        sociedadCompradora: frozOp.sociedad_compradora || ''
                    });
                }
            }

            let ajusteComponenteP = 0;
            let hasDifference = false;
            
            if (loteChanges.length > 0) {
                const deltaResultado = dynRes.resultado_final_ajustado - frozen.resultado_final_ajustado;
                const escalaCongelada = frozen.escalaGen;
                ajusteComponenteP = escalaCongelada * deltaResultado;
                hasDifference = Math.abs(ajusteComponenteP) > 1;
            }
            
            if (hasDifference) {
                const deltaResultado = frozen ? (dynRes.resultado_final_ajustado - frozen.resultado_final_ajustado) : dynRes.resultado_final_ajustado;
                const escalaCongelada = frozen ? frozen.escalaGen : dynRes.escalaGen;
                
                adjustments.push({
                    año: year,
                    mes: month,
                    comercial: dynRes.asociadoComercial,
                    idUsuario: dynRes.idUsuario,
                    mail: dynRes.mail,
                    provincia: dynRes.provincia,
                    oficina: dynRes.oficina,
                    mesAjustado: pastMonth,
                    añoAjustado: pastYear,
                    escalaCongelada,
                    resultadoCongelado: frozen ? frozen.resultado_final_ajustado : 0,
                    resultadoDinamico: dynRes.resultado_final_ajustado,
                    deltaResultado,
                    ajusteComponenteP,
                    detalleLotes: loteChanges
                });
            }
        }
    }

    console.log(`[retro] Total ajustes calculados: ${adjustments.length}`);
    return adjustments;
}
