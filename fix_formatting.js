const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

// Replace multiline code blocks that contain formulas
md = md.replace(/```\n([\s\S]*?)\n```/g, (match, p1) => {
    // Check if it's a code block containing formulas
    if (p1.includes('=') || p1.includes('Bonificación')) {
        return p1.split('\n')
                 .filter(line => line.trim() !== '')
                 .map(line => `> **Fórmula:** ${line.trim()}`)
                 .join('\n\n');
    }
    return match; // leave other code blocks alone if any
});

// Replace inline backticks used for formulas
// E.g. `Resultado Ajustado = Resultado Real × (Tope % / Rendimiento Real %)`
md = md.replace(/`([^`]*?=[^`]*?)`/g, (match, p1) => {
    return `\n> **Fórmula:** ${p1.trim()}\n`;
});

// Replace other inline backticks (variables, script names) with bold text to remove the code formatting entirely
md = md.replace(/`([^`]+)`/g, '**$1**');

fs.writeFileSync(MD_PATH, md);
console.log('Formatting fixed.');
