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

    console.log(`socOpGen (Valentin): ${valentin.socOpGen}`);
}
checkValentin();
