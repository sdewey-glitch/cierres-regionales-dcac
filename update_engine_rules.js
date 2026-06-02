const fs = require('fs');

let code = fs.readFileSync('src/core/engine.ts', 'utf8');

// 1. FILTER CONCRETADAS
// Find the `rawOps.filter` logic.
const filterSearch = `const ops = rawOps.filter(op => {
        if (!op.fecha_operacion) return false;
        const opYear = parseInt(op.fecha_operacion.substring(0, 4), 10);
        const opMonth = parseInt(op.fecha_operacion.substring(5, 7), 10);
        return opYear === year && opMonth === month;
    });`;

const filterReplace = `const ops = rawOps.filter(op => {
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
    });`;

code = code.replace(filterSearch, filterReplace);

// 2. REINTEGRO MOVILIDAD VALENTIN
// Find `res.reintegroMovilidad = `
const movilidadSearch = `res.reintegroMovilidad = res.kms * res.precioPorKm;`;

const movilidadReplace = `res.reintegroMovilidad = res.kms * res.precioPorKm;
            
            // Regla Valentín / Vehículos DCAC: Si tiene amortización de vehículo empresa, no se le paga reintegro de movilidad
            if (res.amortizacioneDcac > 0 || nameLC === 'valentin torriglia' || res.auto.toLowerCase().includes('empresa')) {
                res.reintegroMovilidad = 0;
            }`;

code = code.replace(movilidadSearch, movilidadReplace);

fs.writeFileSync('src/core/engine.ts', code);
console.log('Engine Updated');
