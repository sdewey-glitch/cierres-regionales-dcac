const fs = require('fs');
const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));

// KMS vehicles and $xKM
const kms = data.sheets['KMS'].values;
console.log("=== KMS Headers ===");
console.log(kms[0]);

let xkm_rates = {};
// let's print row 1 to see the columns
console.log("Row 1:", kms[1]);

console.log("\n=== ESCALAS RAC AC ===");
const escalas = data.sheets['ESCALAS RAC AC'].values;
for (let i = 0; i < escalas.length; i++) {
    if (escalas[i]) {
        console.log(`Row ${i}:`, escalas[i].slice(0, 10));
    }
}
