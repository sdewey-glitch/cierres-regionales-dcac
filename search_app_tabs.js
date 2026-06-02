const fs = require('fs');

try {
    const content = fs.readFileSync('frontend/src/App.tsx', 'utf8');
    const keywords = ['yoy', 'ranking', 'general', 'individual', 'pnl', 'reporte', 'flota', 'desvios', 'auditoria', 'tablero'];
    
    console.log("App.tsx keyword matches:");
    keywords.forEach(kw => {
        const matches = content.toLowerCase().split(kw.toLowerCase()).length - 1;
        console.log(`  -> "${kw}": ${matches} matches`);
    });
} catch(e) {
    console.log("Error:", e.message);
}
