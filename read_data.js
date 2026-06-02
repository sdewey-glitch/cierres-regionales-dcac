const fs = require('fs');
const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));

console.log("=== KMS ===");
if (data.sheets["KMS"]) {
    console.log(data.sheets["KMS"].values.slice(0, 10)); // print first 10 rows
} else {
    console.log("No KMS sheet found");
}

console.log("\n=== ESCALAS RAC AC ===");
if (data.sheets["ESCALAS RAC AC"]) {
    console.log(data.sheets["ESCALAS RAC AC"].values.slice(0, 10)); // print first 10 rows
} else {
    console.log("No ESCALAS RAC AC sheet found");
}

console.log("\n=== MENDEL ===");
if (data.sheets["Mendel"]) {
    console.log(data.sheets["Mendel"].values.slice(0, 10)); // print first 10 rows
} else {
    console.log("No Mendel sheet found");
}
