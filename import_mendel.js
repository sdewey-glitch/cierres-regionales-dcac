const fs = require('fs');
const path = require('path');

const csvPath = 'c:/Users/admin/Downloads/570c7d85-30e4-46b6-a1d8-e0c53419b187.csv';
const content = fs.readFileSync(csvPath, 'utf8');

// Regex to split by comma ignoring commas inside quotes
const splitCsv = (str) => {
    const arr = [];
    let quote = false;
    let val = '';
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '"') quote = !quote;
        else if (c === ',' && !quote) {
            arr.push(val);
            val = '';
        } else {
            val += c;
        }
    }
    arr.push(val);
    return arr;
};

const lines = content.split('\n').filter(l => l.trim().length > 0);
const headers = splitCsv(lines[0]).map(h => h.trim());

const idxFechaConf = headers.indexOf('Fecha confirmacion');
const idxUsuario = headers.indexOf('Usuario');
const idxComercio = headers.indexOf('Comercio');
const idxImporte = headers.indexOf('Importe Total');
const idxCategoria = headers.indexOf('Categoria transaccion');
const idxEstado = headers.indexOf('Estado transaccion');

if (idxFechaConf === -1 || idxUsuario === -1 || idxImporte === -1) {
    console.error("Missing columns", headers);
    process.exit(1);
}

const parsed = [];

for (let i = 1; i < lines.length; i++) {
    const row = splitCsv(lines[i]);
    if (row.length < headers.length) continue;
    
    const estado = row[idxEstado].trim();
    if (estado !== 'CONFIRMADA') continue;

    const fecha = row[idxFechaConf].trim(); // e.g. 2026/04/21 00:00
    if (!fecha) continue;
    
    // Convert 2026/04/21 to 202604
    const parts = fecha.split('/');
    if (parts.length < 2) continue;
    
    const año = parts[0];
    let mes = parts[1];
    
    // REGLA: Mendel del mes anterior impacta en el cierre actual. 
    // E.g. Gastos de Abril (04) se cobran en el cierre de Mayo (05).
    // Let's normalize it to the closure month (periodo)
    let closureMonth = parseInt(mes, 10) + 1;
    let closureYear = parseInt(año, 10);
    if (closureMonth > 12) {
        closureMonth = 1;
        closureYear += 1;
    }
    const periodoStr = `${closureYear}${String(closureMonth).padStart(2, '0')}`;

    parsed.push({
        usuario: row[idxUsuario].trim(), // Not normalized yet, engine.ts or normalization.ts will handle it
        comercio: row[idxComercio].trim(),
        importe: parseFloat(row[idxImporte].trim()) || 0,
        categoria: row[idxCategoria] ? row[idxCategoria].trim() : '',
        periodo: periodoStr
    });
}

const outPath = path.join(__dirname, 'src', 'core', 'data', 'mendel.json');
fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
console.log(`Saved ${parsed.length} Mendel transactions to mendel.json`);
