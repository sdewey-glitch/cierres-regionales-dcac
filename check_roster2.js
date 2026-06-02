const fs = require('fs');

function test() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_data.json', 'utf8'));
    const rows = data.sheets['Roster'].values;
    rows.forEach(r => {
        if (r[4] && r[4].toLowerCase().includes('rio 4to')) {
            console.log(r[0], '|', r[5], '|', r[6], '|', r[7]);
        }
    });
}
test();
