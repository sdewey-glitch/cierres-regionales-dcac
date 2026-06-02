const fs = require('fs');

const content = fs.readFileSync('./frontend/src/components/VariablesHub.tsx', 'utf-8');
const lines = content.split('\n');

console.log("=== BUSCANDO AJUSTES EN VariablesHub.tsx ===");
lines.forEach((line, index) => {
    if (line.includes('ajustes') || line.includes('Ajustes') || line.includes('Manual') || line.includes('manual') || line.includes('api/')) {
        console.log(`Línea ${index + 1}: ${line.trim()}`);
    }
});
