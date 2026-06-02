const fs = require('fs');

const content = fs.readFileSync('./src/core/engine.ts', 'utf-8');
const lines = content.split('\n');

console.log("=== BUSCANDO fetchAjustesManuales EN engine.ts ===");
lines.forEach((line, index) => {
    if (line.includes('fetchAjustesManuales') || line.includes('ajustesManuales')) {
        console.log(`Línea ${index + 1}: ${line.trim()}`);
    }
});
