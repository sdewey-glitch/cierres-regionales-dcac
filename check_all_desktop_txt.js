const fs = require('fs');
const path = require('path');

const desktopDir = 'C:/Users/admin/Desktop';
const files = fs.readdirSync(desktopDir);

files.forEach(file => {
    const fullPath = path.join(desktopDir, file);
    try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('doGet') || content.includes('HtmlService') || content.includes('showTab') || content.includes('tablero') || content.includes('gastos')) {
                console.log(`Match: ${file} (Size: ${content.length})`);
                if (content.includes('TACO Gastos') || content.includes('showTab')) {
                    console.log(`  -> Specific Match!`);
                }
            }
        }
    } catch(e) {}
});
