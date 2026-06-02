const fs = require('fs');
const path = require('path');

function checkValentin() {
    const snapshotPath = path.join(__dirname, 'src/core/snapshots/cierre_2026_04.json');
    if (!fs.existsSync(snapshotPath)) {
        console.log("No snapshot for April 2026 found!");
        return;
    }

    const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const valentin = data.find(d => d.asociadoComercial.toLowerCase() === 'valentin torriglia');

    if (!valentin) {
        console.log("Valentin Torriglia not found in snapshot!");
        return;
    }

    console.log("=== Valentin Torriglia - Abril 2026 ===");
    console.log(`Tropas General: ${valentin.tropasGeneral}`);
    console.log(`Cabezas General: ${valentin.cabezasGeneral}`);
    console.log(`Resultado Final Ajustado (RAP): $${valentin.resultado_final_ajustado}`);
    console.log(`Escala General: ${(valentin.escalaGen * 100).toFixed(2)}%`);
    console.log(`Componente Personal: $${valentin.componenteP}`);
    console.log(`Sueldo Fijo: $${valentin.fijo}`);
    console.log(`Sueldo Bruto Total: $${valentin.sueldoBruto}`);

    console.log("\nOperaciones (primeras 5):");
    valentin.operacionesDetalle.slice(0, 5).forEach(op => {
        console.log(`Lote ${op.id_lote}: ${op.tipo} | Cant: ${op.cantidad} | Vende: ${op.sociedad_vendedora.substring(0,20)} | Compra: ${op.sociedad_compradora.substring(0,20)} | Ganancia V: $${op.ganancia_personal_venta} | Ganancia C: $${op.ganancia_personal_compra}`);
    });
}
checkValentin();
