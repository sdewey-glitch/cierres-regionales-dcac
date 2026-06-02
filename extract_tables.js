const fs = require('fs');
const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));

// 1. Mendel Categories
console.log("=== MENDEL CATEGORIES ===");
const mendel = data.sheets['BaseMendelGastos'].values;
let categories = new Set();
let catIdx = -1;
if (mendel && mendel[0]) {
    catIdx = mendel[0].indexOf('Categoria normalizada');
    if (catIdx !== -1) {
        for (let i = 1; i < mendel.length; i++) {
            if (mendel[i] && mendel[i][catIdx]) categories.add(mendel[i][catIdx]);
        }
    }
}
console.log(Array.from(categories));

// 2. KMS table
console.log("\n=== KMS RATES ===");
const kms = data.sheets['KMS'].values;
let vehIdx = -1;
let kmIdx = -1;
if (kms && kms[0]) {
    vehIdx = kms[0].indexOf('Vehiculo');
    // $xKM might be in kms[0] or we just search the header row for $xKM
    kmIdx = kms[0].findIndex(h => h && h.includes('$xKM'));
    if (kmIdx === -1) {
        // sometimes headers are on row 0 and 1, let's search row 0 and 1
        let row1 = kms[1] || [];
        for (let i = 0; i < Math.max(kms[0].length, row1.length); i++) {
             if (kms[0][i] === '$xKM' || row1[i] === '$xKM' || (kms[0][i]||'').includes('$xKM')) {
                 kmIdx = i; break;
             }
        }
    }
}
console.log("VehIdx:", vehIdx, "kmIdx:", kmIdx);
if (vehIdx !== -1) {
    let rates = {};
    for (let i = 1; i < kms.length; i++) {
        let row = kms[i];
        if (row && row[vehIdx] && kmIdx !== -1 && row[kmIdx]) {
             rates[row[vehIdx]] = row[kmIdx];
        }
    }
    console.log(rates);
}

// 3. ESCALAS RAC AC
console.log("\n=== ESCALAS RAC AC ===");
const escalas = data.sheets['ESCALAS RAC AC'].values;
// print the first 10 rows completely to see where AÑOMES and Categorias are
for (let i=0; i<10; i++) {
   console.log(escalas[i]);
}
