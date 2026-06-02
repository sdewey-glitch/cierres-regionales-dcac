const fs = require('fs');

function test() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));
    const rows = data.sheets['ESCALAS RAC AC'].values;
    rows.slice(0, 15).forEach(row => console.log(row.join(' | ')));
}
test();
