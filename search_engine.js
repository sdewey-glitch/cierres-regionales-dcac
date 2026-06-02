const fs = require('fs');

const content = fs.readFileSync('./src/server.ts', 'utf-8');
const lines = content.split('\n');

console.log("=== BUSCANDO ENDPOINTS DE RECALCULO/SYNC ===");
lines.forEach((line, index) => {
    if (line.includes('app.post') || line.includes('app.get') || line.includes('recalculate') || line.includes('sync') || line.includes('refresh') || line.includes('save') || line.includes('cierre')) {
        console.log(`Línea ${index + 1}: ${line.trim()}`);
    }
});
