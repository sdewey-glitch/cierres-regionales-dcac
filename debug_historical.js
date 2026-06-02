const fs = require('fs');

function main() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));
    for (const key of ['Import', 'Import4507']) {
        const sheet = data.sheets[key];
        if (sheet && sheet.values) {
            console.log(`Sheet "${key}" values count:`, sheet.values.length);
            console.log(`Sheet "${key}" headers (first row):`);
            console.log(sheet.values[0]);
            console.log(`Sheet "${key}" sample row 2:`);
            console.log(sheet.values[1]);
        } else {
            console.log(`Sheet "${key}" values not found`);
        }
    }
}

main();
