const fs = require('fs');

const enginePath = 'src/core/engine.ts';

if (fs.existsSync(enginePath)) {
    const lines = fs.readFileSync(enginePath, 'utf8').split('\n');
    lines.forEach((line, idx) => {
        const lower = line.toLowerCase();
        if (lower.includes('gastos') || lower.includes('dcac') || lower.includes('amortizacion') || lower.includes('ajustes')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
} else {
    console.log('Engine file not found');
}
