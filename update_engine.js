const fs = require('fs');

let code = fs.readFileSync('src/core/engine.ts', 'utf8');

// We need to inject the breakdown categorization.
// 1. Where tipoOp is defined:
code = code.replace(
    /const tipoOp = String\(op\.Tipo \|\| op\.tipo_negocio \|\| ''\)\.toUpperCase\(\);/,
    `const tipoOp = String(op.Tipo || op.tipo_negocio || '').toUpperCase();
        const isMag = tipoOp.includes('MAG') || String(op.feria || '').toUpperCase() === 'MAG';
        const isFaenaCat = tipoOp.includes('FAENA');
        const isCria = tipoOp.includes('CRIA') || tipoOp.includes('REPRODUCTOR');
        const isInv = !isFaenaCat && !isCria && !isMag;`
);

// 2. Where resComp is updated in CASE A:
const caseAReplace = `
            resComp.resultado_final += rawResultadoFinal;
            resComp.resultado_final_ajustado += resultadoFinalAjustado;
            resComp.resultado_final_ajustado_regional_compra += resultadoFinalAjustado;

            if (isMag) { resComp.cabMag += cabezas; resComp.resMag += resultadoFinalAjustado; }
            else if (isFaenaCat) { resComp.cabFaena += cabezas; resComp.resFaena += resultadoFinalAjustado; }
            else if (isCria) { resComp.cabCria += cabezas; resComp.resCria += resultadoFinalAjustado; }
            else { resComp.cabInv += cabezas; resComp.resInv += resultadoFinalAjustado; }
`;
code = code.replace(
    /resComp\.resultado_final \+= rawResultadoFinal;\s*resComp\.resultado_final_ajustado \+= resultadoFinalAjustado;\s*resComp\.resultado_final_ajustado_regional_compra \+= resultadoFinalAjustado;/,
    caseAReplace
);

// 3. Where resVend is updated in CASE B:
const caseBReplace = `
            resVend.resultado_final += rawResultadoFinal * (2/3);
            resVend.resultado_final_ajustado_regional_venta += resultadoFinalAjustado * (2/3); 
            resVend.resultado_final_ajustado += resultadoFinalAjustado * (2/3); 

            if (isMag) { resVend.cabMag += cabezas; resVend.resMag += resultadoFinalAjustado * (2/3); }
            else if (isFaenaCat) { resVend.cabFaena += cabezas; resVend.resFaena += resultadoFinalAjustado * (2/3); }
            else if (isCria) { resVend.cabCria += cabezas; resVend.resCria += resultadoFinalAjustado * (2/3); }
            else { resVend.cabInv += cabezas; resVend.resInv += resultadoFinalAjustado * (2/3); }
`;
code = code.replace(
    /resVend\.resultado_final \+= rawResultadoFinal \* \(2\/3\);\s*resVend\.resultado_final_ajustado_regional_venta \+= resultadoFinalAjustado \* \(2\/3\); \s*resVend\.resultado_final_ajustado \+= resultadoFinalAjustado \* \(2\/3\);/,
    caseBReplace
);

// 4. Where resComp is updated in the buyer logic of CASE B:
const caseBBuyerReplace = `
                resComp.resultado_final += rawResultadoFinal * (1/3);
                resComp.resultado_final_ajustado_regional_compra += resultadoFinalAjustado * (1/3);
                resComp.resultado_final_ajustado += resultadoFinalAjustado * (1/3);

                if (isMag) { resComp.cabMag += cabezas; resComp.resMag += resultadoFinalAjustado * (1/3); }
                else if (isFaenaCat) { resComp.cabFaena += cabezas; resComp.resFaena += resultadoFinalAjustado * (1/3); }
                else if (isCria) { resComp.cabCria += cabezas; resComp.resCria += resultadoFinalAjustado * (1/3); }
                else { resComp.cabInv += cabezas; resComp.resInv += resultadoFinalAjustado * (1/3); }
`;
code = code.replace(
    /resComp\.resultado_final \+= rawResultadoFinal \* \(1\/3\);\s*resComp\.resultado_final_ajustado_regional_compra \+= resultadoFinalAjustado \* \(1\/3\);\s*resComp\.resultado_final_ajustado \+= resultadoFinalAjustado \* \(1\/3\);/,
    caseBBuyerReplace
);

// Also need to make MAG 100% margin logic, so it ignores the scale if requested.
// But as seen in Simulator, it does not ignore the scale, it is just separated.

fs.writeFileSync('src/core/engine.ts', code);
console.log('Engine logic updated');
