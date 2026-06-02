// ==========================================
// ARCHIVO: Codigo.gs (Backend Completo)
// ==========================================

function doGet() {
return HtmlService.createTemplateFromFile('Index')
.evaluate()
.setTitle('Panel Gerencial | deCampoaCampo')
.addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function enviarContrasena(email) {
const correosAutorizados = [
"ptaffarel@decampoacampo.com",
"eherz@decampoacampo.com",
"plopezmeyer@decampoacampo.com",
"arivas@decampoacampo.com",
"sdewey@decampoacampo.com",
"jtonon@decampoacampo.com",
"jsineriz@decampoacampo.com"
];

const emailLimpiado = String(email).trim().toLowerCase();

if (correosAutorizados.includes(emailLimpiado)) {
const asunto = "Credenciales de Acceso - Panel Gerencial deCampoaCampo";
const htmlBody = `
<div
    style="font-family: Arial, sans-serif; color: #333; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 0 auto;">
    <div
        style="background: linear-gradient(135deg, #1e3a5f 0%, #1a56db 100%); padding: 20px; color: white; text-align: center;">
        <h2 style="margin: 0; font-style: italic; font-size: 24px;">deCampoaCampo</h2>
        <p style="margin: 5px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Panel de Control
            Gerencial</p>
    </div>
    <div style="padding: 30px 20px; background: #ffffff;">
        <p style="margin-top: 0; font-size: 14px;">Hola,</p>
        <p style="font-size: 14px;">Has solicitado las credenciales de acceso para el Panel Gerencial.</p>
        <div
            style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px; font-size: 14px;"><strong>Usuario:</strong> <span
                    style="color: #1a56db;">DCAC</span></p>
            <p style="margin: 0; font-size: 14px;"><strong>Contraseña:</strong> <span
                    style="color: #1a56db;">Belgrano990</span></p>
        </div>
        <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 0;">Por favor, mantené estas
            credenciales de forma estrictamente confidencial.</p>
    </div>
</div>
`;

try {
MailApp.sendEmail({
to: emailLimpiado,
subject: asunto,
htmlBody: htmlBody
});
return { success: true, message: "¡Credenciales enviadas a tu correo!" };
} catch (e) {
return { success: false, message: "Error del servidor de correo. Intentá de nuevo." };
}
} else {
return { success: false, message: "Cuenta no autorizada. Contactá al administrador." };
}
}

function getSafeIdxOptional(namesArray, headers) {
if (!headers || !Array.isArray(headers)) return -1;
const clean = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi,
'').toLowerCase();
const cleanHeaders = headers.map(clean);
for (let name of namesArray) {
let idx = cleanHeaders.indexOf(clean(name));
if (idx > -1) return idx;
}
return -1;
}

function getSafeIdx(namesArray, headers, sheetName) {
let idx = getSafeIdxOptional(namesArray, headers);
if (idx === -1) throw new Error(`Falta la columna "${namesArray[0]}" en la pestaña ${sheetName}`);
return idx;
}

function parseNum(val) {
if (val === null || val === undefined || val === '') return 0;
if (typeof val === 'number') return val;
let str = String(val).trim();
if (str.startsWith('#')) return 0;
str = str.replace(/[^\d.,-]/g, '');
if (str.includes(',') && str.includes('.')) {
if (str.indexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
else str = str.replace(/,/g, '');
} else if (str.includes(',')) {
if (/,\d{1,2}$/.test(str)) str = str.replace(',', '.');
else str = str.replace(/,/g, '');
}
let parsed = parseFloat(str);
return isNaN(parsed) ? 0 : parsed;
}

function parsePct(val) {
if (val === null || val === undefined || val === '') return 0;
let str = String(val).trim();
let num = parseNum(str);
if (str.includes('%')) return num;
if (Math.abs(num) < 10 && num !==0) return num * 100; return num; } function getData(anoFiltro) { try { const
    ss=SpreadsheetApp.getActiveSpreadsheet(); let anosDisponibles=[]; let anoTarget="Todos" ; const dataMensual=[];
    const dataMensualPrevio=[]; const provinciasSet=new Set(); const canalesSet=new Set(); const
    sheetMensual=ss.getSheetByName('BD_S_R'); if (!sheetMensual) throw new Error("No existe la pestaña 'BD_S_R'");

        const valuesM = sheetMensual.getDataRange().getValues();
        if (valuesM.length <= 1) throw new Error(" La pestaña 'BD_S_R' está vacía"); const headM=valuesM[0]; const
    idxM={ fecha: getSafeIdxOptional(['fechadecierre'], headM), tipo: getSafeIdxOptional(['tipo'], headM), modalidad:
    getSafeIdxOptional(['modalidad', 'canal' ], headM), codigo: getSafeIdxOptional(['codigo', 'cod' ], headM), asociado:
    getSafeIdx(['asociadocomercial'], headM, 'BD_S_R' ), provincia: getSafeIdxOptional(['provincia'], headM), oficina:
    getSafeIdxOptional(['oficina'], headM), ano: getSafeIdx(['ano', 'año' ], headM, 'BD_S_R' ), mes: getSafeIdx(['mes'],
    headM, 'BD_S_R' ), sueldo: getSafeIdxOptional(['sueldo'], headM), minimo: getSafeIdxOptional(['minimo'], headM),
    compP: getSafeIdxOptional(['componentep'], headM), compR: getSafeIdxOptional(['componenter'], headM), compO:
    getSafeIdxOptional(['componenteo'], headM), ajustes: getSafeIdxOptional(['ajustes'], headM), gastos:
    getSafeIdxOptional(['gastos'], headM), reintegroMov: getSafeIdxOptional(['reintegromovilidad'], headM), kms:
    getSafeIdxOptional(['kms'], headM), gastosMKT: getSafeIdxOptional(['gastosmkt'], headM), gastosOfi:
    getSafeIdxOptional(['gastosoficina'], headM), amortDCAC: getSafeIdxOptional(['amortizacionedcac', 'amortizaciones'
    ], headM), gastosCorp: getSafeIdxOptional(['gastoscorp'], headM), amortAP: getSafeIdxOptional(['amortizacionap'],
    headM), gastosMov: getSafeIdxOptional(['gastosmovilidad'], headM), auto: getSafeIdxOptional(['auto', 'vehiculo' ],
    headM), precioKm: getSafeIdxOptional(['precioxkm', 'preciokm' ], headM), tropas:
    getSafeIdxOptional(['tropasgeneral'], headM), cabezas: getSafeIdxOptional(['cabezasgeneral'], headM), cabzVenta:
    getSafeIdxOptional(['cabzgenventa'], headM), cabzCompra: getSafeIdxOptional(['cabzgencompra'], headM), importe:
    getSafeIdxOptional(['importegen'], headM), resultado: getSafeIdxOptional(['resultadogen'], headM), escala:
    getSafeIdxOptional(['escalagen'], headM), rendimiento: getSafeIdxOptional(['rendimientogen'], headM), ccc:
    getSafeIdxOptional(['cccgen'], headM), socOp: getSafeIdxOptional(['socopgen'], headM), tropasReg:
    getSafeIdxOptional(['tropasregional'], headM), cabezasReg: getSafeIdxOptional(['cabezasregional'], headM), bolsaReg:
    getSafeIdxOptional(['bolsaregion'], headM), tajadaReg: getSafeIdxOptional(['tajadaregion'], headM), resultadoReg:
    getSafeIdxOptional(['resultadoreg'], headM), tropasOfi: getSafeIdxOptional(['tropasoficina'], headM), cabezasOfi:
    getSafeIdxOptional(['cabezasofi'], headM), escalaOfi: getSafeIdxOptional(['escalaoficina'], headM), opOfi:
    getSafeIdxOptional(['opoficina'], headM), resultadoOfi: getSafeIdxOptional(['resultadoofi'], headM) }; const
    anosSet=new Set(); for (let i=1; i < valuesM.length; i++) { if (valuesM[i][idxM.ano])
    anosSet.add(valuesM[i][idxM.ano]); } anosDisponibles=[...anosSet].filter(Boolean).sort((a, b)=> b - a);
    anoTarget = anoFiltro || (anosDisponibles.length > 0 ? anosDisponibles[0] : "Todos");
    const anoPrevio = anoTarget !== "Todos" ? String(parseInt(anoTarget) - 1) : null;

    for (let i = 1; i < valuesM.length; i++) { const row=valuesM[i]; const asociado=row[idxM.asociado]; if (!asociado)
        continue; const rowAno=String(row[idxM.ano]); if (anoTarget !=="Todos" && rowAno !==String(anoTarget) && rowAno
        !==anoPrevio) continue; let fRaw=idxM.fecha> -1 ? row[idxM.fecha] : "";
        let fFmt = fRaw instanceof Date ? fRaw.toLocaleDateString('es-AR') : (fRaw ? String(fRaw).split('T')[0] : "-");

        const sld = parseNum(idxM.sueldo > -1 ? row[idxM.sueldo] : 0);
        const gs = parseNum(idxM.gastos > -1 ? row[idxM.gastos] : 0);
        const gsOfi = parseNum(idxM.gastosOfi > -1 ? row[idxM.gastosOfi] : 0);
        const gsMkt = parseNum(idxM.gastosMKT > -1 ? row[idxM.gastosMKT] : 0);
        const amort = parseNum(idxM.amortDCAC > -1 ? row[idxM.amortDCAC] : 0);
        const reintegro = parseNum(idxM.reintegroMov > -1 ? row[idxM.reintegroMov] : 0);
        const ajustes = parseNum(idxM.ajustes > -1 ? row[idxM.ajustes] : 0);

        const costoDir = sld + gs + reintegro + ajustes;
        const gtoEst = gsOfi + gsMkt + amort;
        const costoBO = costoDir + gtoEst;

        const prov = idxM.provincia > -1 ? String(row[idxM.provincia]).trim() : '';
        const mod = idxM.modalidad > -1 ? String(row[idxM.modalidad]).trim() : 'Directo';
        if (prov) provinciasSet.add(prov); if (mod) canalesSet.add(mod);

        const obj = {
        fecha: fFmt, tipo: idxM.tipo > -1 ? row[idxM.tipo] : '-', modalidad: mod,
        codigo: idxM.codigo > -1 ? row[idxM.codigo] : 'S/C', asociado: asociado, provincia: prov, oficina: idxM.oficina
        > -1 ? row[idxM.oficina] : 'Sin Oficina',
        ano: row[idxM.ano], mes: row[idxM.mes], sueldo: sld, minimo: parseNum(idxM.minimo > -1 ? row[idxM.minimo] : 0),
        compP: parseNum(idxM.compP > -1 ? row[idxM.compP] : 0), compR: parseNum(idxM.compR > -1 ? row[idxM.compR] : 0),
        compO: parseNum(idxM.compO > -1 ? row[idxM.compO] : 0), ajustes: ajustes,
        gastos: gs, gastosOfi: gsOfi, gastosMkt: gsMkt, amort: amort, reintegroMov: reintegro, kms: parseNum(idxM.kms >
        -1 ? row[idxM.kms] : 0),
        amortAP: parseNum(idxM.amortAP > -1 ? row[idxM.amortAP] : 0), gastosMov: parseNum(idxM.gastosMov > -1 ?
        row[idxM.gastosMov] : 0),
        auto: idxM.auto > -1 ? String(row[idxM.auto]).trim() : '', precioKm: parseNum(idxM.precioKm > -1 ?
        row[idxM.precioKm] : 0),
        costoDirecto: costoDir, gtoEstructura: gtoEst, costoBO: costoBO,
        tropasGen: parseNum(idxM.tropas > -1 ? row[idxM.tropas] : 0), cabezasGen: parseNum(idxM.cabezas > -1 ?
        row[idxM.cabezas] : 0),
        cabzVenta: parseNum(idxM.cabzVenta > -1 ? row[idxM.cabzVenta] : 0), cabzCompra: parseNum(idxM.cabzCompra > -1 ?
        row[idxM.cabzCompra] : 0),
        socOpGen: parseNum(idxM.socOp > -1 ? row[idxM.socOp] : 0), importeGen: parseNum(idxM.importe > -1 ?
        row[idxM.importe] : 0),
        resultadoGen: parseNum(idxM.resultado > -1 ? row[idxM.resultado] : 0), escalaGen: parseNum(idxM.escala > -1 ?
        row[idxM.escala] : 0) * 100,
        rendimientoGen: parseNum(idxM.rendimiento > -1 ? row[idxM.rendimiento] : 0) * 100, cccGen: parseNum(idxM.ccc >
        -1 ? row[idxM.ccc] : 0) * 100,
        tropasReg: parseNum(idxM.tropasReg > -1 ? row[idxM.tropasReg] : 0), cabezasReg: parseNum(idxM.cabezasReg > -1 ?
        row[idxM.cabezasReg] : 0), resultadoReg: parseNum(idxM.resultadoReg > -1 ? row[idxM.resultadoReg] : 0),
        bolsaReg: parseNum(idxM.bolsaReg > -1 ? row[idxM.bolsaReg] : 0) * 100, tajadaReg: parseNum(idxM.tajadaReg > -1 ?
        row[idxM.tajadaReg] : 0) * 100,
        tropasOfi: parseNum(idxM.tropasOfi > -1 ? row[idxM.tropasOfi] : 0), cabezasOfi: parseNum(idxM.cabezasOfi > -1 ?
        row[idxM.cabezasOfi] : 0), resultadoOfi: parseNum(idxM.resultadoOfi > -1 ? row[idxM.resultadoOfi] : 0),
        escalaOfi: parseNum(idxM.escalaOfi > -1 ? row[idxM.escalaOfi] : 0) * 100, opOfi: parseNum(idxM.opOfi > -1 ?
        row[idxM.opOfi] : 0) * 100
        };

        if (rowAno === String(anoTarget) || anoTarget === "Todos") dataMensual.push(obj);
        if (rowAno === anoPrevio) dataMensualPrevio.push(obj);
        }

        const sheetOficinas = ss.getSheetByName('Oficinas');
        const dataOficinas = []; const dataOficinasPrevio = [];
        if (sheetOficinas) {
        const valuesOf = sheetOficinas.getDataRange().getValues();
        if (valuesOf.length > 1) {
        const headOf = valuesOf[0];
        const idxOf = {
        ano: getSafeIdxOptional(['ano', 'año'], headOf), mes: getSafeIdxOptional(['mes'], headOf), ofi:
        getSafeIdxOptional(['oficina'], headOf),
        sueldos: getSafeIdxOptional(['sueldosequiposoporte', 'sueldos'], headOf), alquiler:
        getSafeIdxOptional(['alquileroficina', 'alquiler'], headOf),
        gastos: getSafeIdxOptional(['gastosoficina', 'gastos'], headOf), mkt: getSafeIdxOptional(['mkt', 'marketing'],
        headOf),
        mov: getSafeIdxOptional(['gastosmovilidad', 'movilidad'], headOf), amort:
        getSafeIdxOptional(['amortizacionesvehiculos'], headOf), total: getSafeIdxOptional(['gastos', 'total'], headOf)
        };
        const anoPrevio = anoTarget !== "Todos" ? String(parseInt(anoTarget) - 1) : null;
        for (let i = 1; i < valuesOf.length; i++) { const row=valuesOf[i]; const rowAno=String(row[idxOf.ano]); if
            (anoTarget !=="Todos" && rowAno !==String(anoTarget) && rowAno !==anoPrevio) continue; const obj={ ano:
            row[idxOf.ano], mes: row[idxOf.mes], oficina: idxOf.ofi> -1 ? row[idxOf.ofi] : 'Sin Oficina',
            sueldos: parseNum(idxOf.sueldos > -1 ? row[idxOf.sueldos] : 0), alquiler: parseNum(idxOf.alquiler > -1 ?
            row[idxOf.alquiler] : 0),
            gastos: parseNum(idxOf.gastos > -1 ? row[idxOf.gastos] : 0), mkt: parseNum(idxOf.mkt > -1 ? row[idxOf.mkt] :
            0),
            mov: parseNum(idxOf.mov > -1 ? row[idxOf.mov] : 0),
            amort: parseNum(idxOf.amort > -1 ? row[idxOf.amort] : 0),
            total: parseNum(idxOf.total > -1 ? row[idxOf.total] : 0)
            };
            if (rowAno === String(anoTarget) || anoTarget === "Todos") dataOficinas.push(obj);
            if (rowAno === anoPrevio) dataOficinasPrevio.push(obj);
            }
            }
            }

            return {
            mensual: dataMensual, mensualPrevio: dataMensualPrevio, oficinas: dataOficinas, oficinasPrevio:
            dataOficinasPrevio,
            anosDisponibles: anosDisponibles, anoAplicado: anoTarget, provincias:
            [...provinciasSet].filter(Boolean).sort(), canales: [...canalesSet].filter(Boolean).sort()
            };
            } catch (e) {
            return { error: e.message };
            }
            }

            function getTropasComprimidas(anoTarget) {
            try {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const sheetOps = ss.getSheetByName('Import');
            if (!sheetOps) return { actual: [], previo: [] };

            const valuesO = sheetOps.getDataRange().getValues();
            if (valuesO.length <= 1) return { actual: [], previo: [] }; const headO=valuesO[0]; const idxO={ idLote:
                getSafeIdxOptional(['idlote', 'lote' ], headO), fechaOp:
                getSafeIdxOptional(['fechaoperacion', 'fechadecierre' ], headO), periodo: getSafeIdxOptional(['fecha'],
                headO), tipo: getSafeIdxOptional(['tipo'], headO), cat: getSafeIdxOptional(['categoria'], headO), socV:
                getSafeIdxOptional(['sociedadvendedora'], headO), socC: getSafeIdxOptional(['sociedadcompradora'],
                headO), cant: getSafeIdxOptional(['cantidad', 'cabezas' ], headO), importeVend:
                getSafeIdxOptional(['importevendedor'], headO), acVend: getSafeIdxOptional(['acvend', 'provacvend' ],
                headO), acComp: getSafeIdxOptional(['accomp', 'provaccomp' ], headO), rend:
                getSafeIdxOptional(['rendimiento'], headO), rendTopeado: getSafeIdxOptional(['rendtopeado'], headO),
                resTopeado: getSafeIdxOptional(['resultadotopeado'], headO), res: getSafeIdxOptional(['resultadofinal'],
                headO) }; const opsAct=[]; const opsPrev=[]; const anoActStr=String(anoTarget); const
                anoPrevStr=anoTarget !=="Todos" ? String(parseInt(anoTarget) - 1) : null; for (let i=1; i <
                valuesO.length; i++) { const row=valuesO[i]; let ano=0, mes=0; let perRaw=idxO.periodo> -1 ?
                String(row[idxO.periodo]) : "";
                let parsedPer = parseInt(perRaw.replace(/\D/g, ''));

                if (!isNaN(parsedPer) && parsedPer > 200000) {
                let pStr = String(parsedPer);
                ano = parseInt(pStr.substring(0, 4));
                mes = parseInt(pStr.substring(4, 6));
                } else {
                let fRaw = idxO.fechaOp > -1 ? row[idxO.fechaOp] : "";
                if (!fRaw) continue;
                if (fRaw instanceof Date) {
                ano = fRaw.getFullYear(); mes = fRaw.getMonth() + 1;
                } else {
                let strD = String(fRaw).split('T')[0].trim();
                if (strD.includes('/')) {
                let p = strD.split('/');
                if (parseInt(p[0]) > 12) { ano = parseInt(p[2]); mes = parseInt(p[1]); }
                else { ano = parseInt(p[2]); mes = parseInt(p[0]); }
                if (ano < 100) ano +=2000; } else if (strD.includes('-')) { let p=strD.split('-'); ano=parseInt(p[0]);
                    mes=parseInt(p[1]); } } } if (!ano || isNaN(ano)) continue; const rowAno=String(ano); if (anoActStr
                    !=="Todos" && rowAno !==anoActStr && rowAno !==anoPrevStr) continue; let fRawV=idxO.fechaOp> -1 ?
                    row[idxO.fechaOp] : "";
                    let fFmt = "-";
                    if (fRawV instanceof Date) fFmt = fRawV.toLocaleDateString('es-AR');
                    else if (fRawV) {
                    let strD = String(fRawV).split('T')[0].trim();
                    if (strD.includes('/')) {
                    let p = strD.split('/');
                    if (parseInt(p[0]) > 12) fFmt = `${p[1]}/${p[0]}/${p[2]}`;
                    else if (parseInt(p[1]) > 12) fFmt = `${p[1]}/${p[0]}/${p[2]}`;
                    else fFmt = strD;
                    } else if (strD.includes('-')) {
                    let p = strD.split('-');
                    fFmt = `${p[2]}/${p[1]}/${p[0]}`;
                    } else fFmt = strD;
                    }

                    let rendVal = parseNum(idxO.rend > -1 ? row[idxO.rend] : 0);
                    let rendTopVal = parseNum(idxO.rendTopeado > -1 ? row[idxO.rendTopeado] : 0);
                    if (!String(idxO.rend > -1 ? row[idxO.rend] : '').includes('%') && Math.abs(rendVal) < 10 && rendVal
                        !==0) rendVal *=100; if (!String(idxO.rendTopeado> -1 ? row[idxO.rendTopeado] :
                        '').includes('%') && Math.abs(rendTopVal) < 10 && rendTopVal !==0) rendTopVal *=100; let
                            rowData=[ idxO.idLote> -1 ? row[idxO.idLote] : '', fFmt, mes,
                            '',
                            idxO.acVend > -1 ? String(row[idxO.acVend]) : '', idxO.acComp > -1 ?
                            String(row[idxO.acComp]) : '',
                            idxO.tipo > -1 ? row[idxO.tipo] : '-', idxO.cat > -1 ? row[idxO.cat] : '-',
                            idxO.socV > -1 ? row[idxO.socV] : '-', idxO.socC > -1 ? row[idxO.socC] : '-',
                            parseNum(idxO.cant > -1 ? row[idxO.cant] : 0), parseNum(idxO.importeVend > -1 ?
                            row[idxO.importeVend] : 0),
                            rendVal, rendTopVal,
                            parseNum(idxO.resTopeado > -1 ? row[idxO.resTopeado] : 0), parseNum(idxO.res > -1 ?
                            row[idxO.res] : 0)
                            ];

                            if (rowAno === anoActStr || anoActStr === "Todos") opsAct.push(rowData);
                            if (rowAno === anoPrevStr) opsPrev.push(rowData);
                            }
                            return { actual: opsAct, previo: opsPrev };
                            } catch (e) {
                            return { error: e.message };
                            }
                            }

                            // LECTURA AJUSTADA Y AUTODETECTABLE PARA TU HOJA "ESCALAS"
                            function getEscalasMinimos() {
                            try {
                            const ss = SpreadsheetApp.getActiveSpreadsheet();

                            // 1. ESCALAS
                            const sEsc = ss.getSheetByName('Escalas');
                            const escalas = [];
                            if (sEsc) {
                            const vE = sEsc.getDataRange().getValues();
                            if (vE.length > 2) {
                            let headerIdx = 0;
                            for (let i = 0; i < Math.min(5, vE.length); i++) { const
                                rowStr=vE[i].join('').toLowerCase().replace(/[^a-z]/g, '' ); if
                                (rowStr.includes('cabezastotales')) { headerIdx=i; break; } } const hE=vE[headerIdx];
                                const iCab=getSafeIdxOptional(['cabezastotales', 'cabezas_totales' , 'cabezas' ], hE);
                                const iPers=getSafeIdxOptional(['escalapersonal', 'escala_personal' ], hE); const
                                iProv=getSafeIdxOptional(['escalaprovincial', 'escala_provincial' ], hE); const
                                iOfi=getSafeIdxOptional(['escalaoficina', 'escala_oficina' ], hE); const
                                iAC=getSafeIdxOptional(['escalaac', 'escala_ac' ], hE); const
                                iOPC=getSafeIdxOptional(['escalaopc', 'escala_opc' ], hE); for (let i=headerIdx + 1; i <
                                vE.length; i++) { const r=vE[i]; if (r[iCab]==="" || r[iCab]===null) continue;
                                escalas.push({ cabezas: parseNum(r[iCab]), personal: parsePct(r[iPers]), provincial:
                                parsePct(r[iProv]), oficina: parsePct(r[iOfi]), ac: parsePct(r[iAC]), opc: (r[iOPC]
                                !=="" && r[iOPC] !==null) ? parsePct(r[iOPC]) : null }); } } } // 2. MÍNIMOS
                                (Restaurado) const sMin=ss.getSheetByName('Minimos') || ss.getSheetByName('Mínimos');
                                const minimos=[]; if (sMin) { const vM=sMin.getDataRange().getValues(); if (vM.length>
                                1) {
                                const hM = vM[0];
                                const iAno = getSafeIdxOptional(['ano', 'año'], hM);
                                const iMes = getSafeIdxOptional(['mes'], hM);
                                const cats = [];
                                for (let c = 0; c < hM.length; c++) { if (c===iAno || c===iMes) continue; if (hM[c] &&
                                    typeof hM[c]==='string' ) cats.push({ idx: c, nombre: hM[c].trim() }); } for (let
                                    i=1; i < vM.length; i++) { const r=vM[i]; const ano=r[iAno]; const mes=r[iMes]; if
                                    (!ano && !mes) continue; const row={ ano: ano, mes: mes, valores: {} };
                                    cats.forEach(cat=> { row.valores[cat.nombre] = parseNum(r[cat.idx]); });
                                    minimos.push(row);
                                    }
                                    }
                                    }

                                    return { escalas: escalas, minimos: minimos };
                                    } catch (e) {
                                    return { error: e.message };
                                    }
                                    }

                                    function getEnvioReportes() {
                                    try {
                                    const ss = SpreadsheetApp.getActiveSpreadsheet();
                                    const sheet = ss.getSheetByName('Envio Reportes');
                                    if (!sheet) return { reportes: [] };
                                    const values = sheet.getDataRange().getValues();
                                    if (values.length <= 1) return { reportes: [] }; const head=values[0]; const
                                        clean=s=> String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,
                                        '').replace(/[^a-z0-9]/gi, '').toLowerCase();
                                        const idx = name => { const c = clean(name); return head.findIndex(h =>
                                        clean(String(h)) === c); };

                                        const iNombre = idx('Nombre Apellido');
                                        const iCodigo = idx('Codigo');
                                        const iMail = idx('Mail');
                                        const iHoja = idx('Hoja');
                                        const iEnviar = idx('Enviar');
                                        const iCC = idx('CC');
                                        const iOfi = idx('Oficina');
                                        const iProv = idx('Provincia');
                                        const iCat = idx('Categoria');

                                        const TIPO_MAP = {
                                        'reporte mensual oficina ac': 'Oficina',
                                        'reporte mensual ac': 'Simple',
                                        'hibrido': 'Hibrido'
                                        };
                                        const getTipo = (hoja) => {
                                        const h = clean(hoja);
                                        for (const [k, v] of Object.entries(TIPO_MAP)) { if (h.includes(clean(k)))
                                        return v; }
                                        return 'Simple';
                                        };

                                        const reportes = [];
                                        for (let i = 1; i < values.length; i++) { const r=values[i]; const
                                            codigo=iCodigo> -1 ? String(r[iCodigo]).trim() : '';
                                            if (!codigo) continue;
                                            reportes.push({
                                            nombre: iNombre > -1 ? String(r[iNombre]).trim() : '',
                                            codigo: codigo,
                                            mail: iMail > -1 ? String(r[iMail]).trim() : '',
                                            hoja: iHoja > -1 ? String(r[iHoja]).trim() : '',
                                            tipo: getTipo(iHoja > -1 ? r[iHoja] : ''),
                                            enviar: iEnviar > -1 ? String(r[iEnviar]).trim().toLowerCase() === 'si' :
                                            false,
                                            cc: iCC > -1 ? String(r[iCC]).trim() : '',
                                            oficina: iOfi > -1 ? String(r[iOfi]).trim() : '',
                                            provincia: iProv > -1 ? String(r[iProv]).trim() : '',
                                            categoria: iCat > -1 ? String(r[iCat]).trim().toLowerCase() : ''
                                            });
                                            }
                                            return { reportes: reportes };
                                            } catch (e) {
                                            return { error: e.message };
                                            }
                                            }

                                            function crearCarpetaMes() {
                                            try {
                                            const CARPETA_RAIZ_ID = '1m_kMQ7J30hhOkPoNmj6oATNeMcrstuUt';
                                            const ahora = new Date();
                                            const anioStr = ahora.getFullYear().toString();
                                            const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                            const nombreMes = MESES_ES[ahora.getMonth()];
                                            const nombreCarpetaMes = `Cierre ${nombreMes} ${anioStr}`;

                                            const carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);

                                            const existentes = carpetaRaiz.getFoldersByName(nombreCarpetaMes);
                                            if (existentes.hasNext()) {
                                            const carpetaExistente = existentes.next();
                                            return { success: true, creada: false, nombre: nombreCarpetaMes, url:
                                            carpetaExistente.getUrl() };
                                            }

                                            const nuevaCarpeta = carpetaRaiz.createFolder(nombreCarpetaMes);
                                            return { success: true, creada: true, nombre: nombreCarpetaMes, url:
                                            nuevaCarpeta.getUrl() };
                                            } catch (e) {
                                            return { success: false, msg: e.message };
                                            }
                                            }

                                            function procesarEnvioEmail(base64Data, nombreArchivo, emailTo, emailsCC,
                                            emailSubject, emailBody, nombreCarpetaMes) {
                                            try {
                                            const dataParts = base64Data.split(',');
                                            const encodedData = dataParts.length > 1 ? dataParts[1] : dataParts[0];
                                            const decodedVal = Utilities.base64Decode(encodedData);
                                            const pdfBlob = Utilities.newBlob(decodedVal, 'application/pdf',
                                            nombreArchivo + ".pdf");

                                            const CARPETA_RAIZ_ID = "1m_kMQ7J30hhOkPoNmj6oATNeMcrstuUt";
                                            const carpetaRaiz = DriveApp.getFolderById(CARPETA_RAIZ_ID);

                                            const nombreDirectorio = nombreCarpetaMes || "Carpeta Cierre";

                                            let carpetaDestino;
                                            const carpetasMesExistentes =
                                            carpetaRaiz.getFoldersByName(nombreDirectorio);

                                            if (carpetasMesExistentes.hasNext()) {
                                            carpetaDestino = carpetasMesExistentes.next();
                                            } else {
                                            carpetaDestino = carpetaRaiz.createFolder(nombreDirectorio);
                                            }

                                            carpetaDestino.createFile(pdfBlob);

                                            let opcionesCorreo = {
                                            to: emailTo,
                                            subject: emailSubject,
                                            body: emailBody,
                                            attachments: [pdfBlob]
                                            };

                                            if (emailsCC && emailsCC.trim() !== '') {
                                            opcionesCorreo.cc = emailsCC;
                                            }

                                            MailApp.sendEmail(opcionesCorreo);

                                            return { success: true, nombre: nombreArchivo };

                                            } catch (err) {
                                            Logger.log("Error en procesarEnvioEmail: " + err.message);
                                            return { success: false, msg: err.message, nombre: nombreArchivo };
                                            }
                                            }

                                            // ==========================================
                                            // HISTORICO — Lectura del P&L de empresa
                                            // ==========================================
                                            function getHistorico() {
                                            try {
                                            const ss = SpreadsheetApp.getActiveSpreadsheet();
                                            const sheet = ss.getSheetByName('Historico');
                                            if (!sheet) return { error: "No existe la hoja 'Historico'" };

                                            const data = sheet.getDataRange().getValues();
                                            if (data.length < 3) return { error: "Hoja Historico sin datos suficientes"
                                                }; // Fila 2 (index 1) tiene los headers de columna: "Item" , periodos
                                                YYYYMM, y YTDs const headerRow=data[1]; // row index 1=fila 2 en Sheets
                                                // Mapear columnas: buscar períodos YYYYMM y acumulados YTD const
                                                periodos=[]; // { col: N, label: "202501" , tipo: "mes" | "ytd" } for
                                                (let c=1; c < headerRow.length; c++) { const
                                                val=String(headerRow[c]).trim(); if (!val) continue; const
                                                numVal=parseInt(val.replace(/\D/g,'')); if (!isNaN(numVal) && numVal>
                                                200000 && numVal < 999999) { periodos.push({ col: c, label:
                                                    String(numVal), tipo: 'mes' }); } else if (val.includes('YTD') ||
                                                    val.includes('ytd')) { periodos.push({ col: c, label: val,
                                                    tipo: 'ytd' }); } } // Función para leer el valor de una fila
                                                    (índice 0-based) en una columna const getVal=(rowIdx, col)=> {
                                                    if (rowIdx < 0 || rowIdx>= data.length) return 0;
                                                        const v = data[rowIdx][col];
                                                        return parseNum(v);
                                                        };

                                                        // Índices de filas (0-based: fila 14 en Sheets = índice 13)
                                                        const ROW = {
                                                        resultadoAjustado: 13, // fila 14
                                                        faenaRes: 17, // fila 18
                                                        invernRes: 18, // fila 19
                                                        invernNeoRes: 19, // fila 20
                                                        criaRes: 20, // fila 21
                                                        magRes: 21, // fila 22
                                                        faenaShare: 23, // fila 24
                                                        invernShare: 24, // fila 25
                                                        invernNeoShare: 25, // fila 26
                                                        criaShare: 26, // fila 27
                                                        magShare: 27 // fila 28
                                                        };

                                                        // Construir objeto de datos por período
                                                        const porPeriodo = {};
                                                        periodos.forEach(p => {
                                                        porPeriodo[p.label] = {
                                                        tipo: p.tipo,
                                                        resultadoAjustado: getVal(ROW.resultadoAjustado, p.col),
                                                        unidades: {
                                                        Faena: { resultado: getVal(ROW.faenaRes, p.col), share:
                                                        getVal(ROW.faenaShare, p.col) },
                                                        Invernada: { resultado: getVal(ROW.invernRes, p.col), share:
                                                        getVal(ROW.invernShare, p.col) },
                                                        'Invernada Neo': { resultado: getVal(ROW.invernNeoRes, p.col),
                                                        share: getVal(ROW.invernNeoShare, p.col) },
                                                        Cria: { resultado: getVal(ROW.criaRes, p.col), share:
                                                        getVal(ROW.criaShare, p.col) },
                                                        MAG: { resultado: getVal(ROW.magRes, p.col), share:
                                                        getVal(ROW.magShare, p.col) }
                                                        }
                                                        };
                                                        });

                                                        // Períodos disponibles ordenados
                                                        const periodosOrdenados = periodos
                                                        .filter(p => p.tipo === 'mes')
                                                        .map(p => p.label)
                                                        .sort((a, b) => parseInt(b) - parseInt(a));

                                                        const ytdLabels = periodos.filter(p => p.tipo === 'ytd').map(p
                                                        => p.label);

                                                        return {
                                                        periodos: periodosOrdenados,
                                                        ytds: ytdLabels,
                                                        data: porPeriodo
                                                        };

                                                        } catch (e) {
                                                        Logger.log("Error en getHistorico: " + e.message);
                                                        return { error: e.message };
                                                        }
                                                        }