const fs = require('fs');
const path = require('path');

const downloadsDir = 'C:/Users/admin/Downloads';
try {
    const files = fs.readdirSync(downloadsDir);
    files.forEach(file => {
        const fullPath = path.join(downloadsDir, file);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('doGet') || content.includes('HtmlService') || content.includes('showTab') || content.includes('tablero') || content.includes('gastos') || content.includes('TACO')) {
                    console.log(`Match in Downloads: ${file} (Size: ${content.length})`);
                    if (content.includes('TACO Gastos') || content.includes('showTab')) {
                        console.log(`  -> Specific Match!`);
                        fs.writeFileSync(`matched_download_${file}`, content);
                    }
                }
            }
        } catch(e) {}
    });
} catch(e) {
    console.log("Downloads dir read error:", e.message);
}
