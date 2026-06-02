const fs = require('fs');
const path = require('path');

const rootDirs = [
    'C:/Users/admin/Desktop',
    'C:/Users/admin/Downloads',
];

const filesToInspect = [
    'C:/Users/admin/Desktop/Index.htlm.txt',
    'C:/Users/admin/Desktop/PNL_WEB_APP/Index.htlm',
    'C:/Users/admin/Desktop/PNL_WEB_APP/Index_clean.htlm',
    'C:/Users/admin/Desktop/PNL_WEB_APP/red_comercial.html',
    'C:/Users/admin/Downloads/Index.html'
];

filesToInspect.forEach(fullPath => {
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        console.log(`Checking ${fullPath}...`);
        const keywords = ['tablero', 'flota', 'desvios', 'auditoria', 'Base Mendel', 'Mendel'];
        keywords.forEach(kw => {
            const hasKw = content.toLowerCase().includes(kw.toLowerCase());
            console.log(`  -> "${kw}": ${hasKw ? 'YES' : 'NO'}`);
        });
    } catch(e) {
        console.log(`Error reading ${fullPath}:`, e.message);
    }
});
