const fs = require('fs');

const filesToInspect = [
    'C:/Users/admin/Desktop/Index.htlm.txt',
    'C:/Users/admin/Desktop/PNL_WEB_APP/Index.htlm',
    'C:/Users/admin/Desktop/PNL_WEB_APP/Index_clean.htlm',
    'C:/Users/admin/Desktop/PNL_WEB_APP/red_comercial.html',
    'C:/Users/admin/Downloads/Index.html'
];

filesToInspect.forEach(fullPath => {
    try {
        if (!fs.existsSync(fullPath)) return;
        const buffer = fs.readFileSync(fullPath);
        
        // Try to detect UTF-16LE by check BOM (0xFF, 0xFE)
        let isUtf16 = false;
        if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
            isUtf16 = true;
        }
        
        const encoding = isUtf16 ? 'utf16le' : 'utf8';
        const content = buffer.toString(encoding);
        
        console.log(`File: ${fullPath}`);
        console.log(`  Encoding detected: ${encoding}`);
        console.log(`  Size in chars: ${content.length}`);
        
        const keywords = ['tablero', 'flota', 'desvios', 'auditoria', 'Base Mendel', 'Mendel'];
        keywords.forEach(kw => {
            const hasKw = content.toLowerCase().includes(kw.toLowerCase());
            console.log(`    -> "${kw}": ${hasKw ? 'YES' : 'NO'}`);
        });
    } catch(e) {
        console.log(`Error checking ${fullPath}:`, e.message);
    }
});
