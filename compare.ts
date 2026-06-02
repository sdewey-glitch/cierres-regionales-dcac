import { calculateDynamicMonth } from './src/core/engine';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log("Generating April...");
    const abr = await calculateDynamicMonth(2026, 4);
    
    console.log("Generating May...");
    const may = await calculateDynamicMonth(2026, 5);
    
    fs.writeFileSync(path.join(__dirname, 'src/core/snapshots/cierre_2026_04.json'), JSON.stringify(abr, null, 2));
    fs.writeFileSync(path.join(__dirname, 'src/core/snapshots/cierre_2026_05.json'), JSON.stringify(may, null, 2));

    const totalAbr = abr.reduce((acc, c) => acc + (c.cierreReal || 0), 0);
    const totalMay = may.reduce((acc, c) => acc + (c.cierreReal || 0), 0);

    const compPAbr = abr.reduce((acc, c) => acc + (c.componenteP || 0), 0);
    const compPMay = may.reduce((acc, c) => acc + (c.componenteP || 0), 0);

    const compRAbr = abr.reduce((acc, c) => acc + (c.componenteR || 0), 0);
    const compRMay = may.reduce((acc, c) => acc + (c.componenteR || 0), 0);

    console.log("-----------------------------------------");
    console.log("COMPARATIVA ABRIL VS MAYO (Tolerancia 5%)");
    console.log("-----------------------------------------");
    console.log(`TOTAL A FACTURAR: Abril = ${totalAbr.toLocaleString('es-AR')} | Mayo = ${totalMay.toLocaleString('es-AR')}`);
    console.log(`COMP. PERSONAL  : Abril = ${compPAbr.toLocaleString('es-AR')} | Mayo = ${compPMay.toLocaleString('es-AR')}`);
    console.log(`COMP. REGIONAL  : Abril = ${compRAbr.toLocaleString('es-AR')} | Mayo = ${compRMay.toLocaleString('es-AR')}`);
    
    const diffPersonal = ((compPMay - compPAbr) / compPAbr) * 100;
    console.log(`Variacion Personal: ${diffPersonal.toFixed(2)}%`);
}

main().catch(console.error);
