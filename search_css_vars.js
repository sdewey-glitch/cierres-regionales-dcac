const fs = require('fs');
const path = require('path');

const rootDirs = [
    'C:/Users/admin/Desktop',
    'C:/Users/admin/Downloads',
    'C:/Users/admin/Documents',
    'C:/Users/admin/mi-tablero-ganadero',
    'C:/Users/admin/.gemini/antigravity/scratch/Cierre_regionales'
];

function searchDir(dir, depth = 0) {
    if (depth > 4) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch(e) { continue; }
            
            if (stat.isDirectory()) {
                if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'AppData' || file === 'brain') continue;
                searchDir(fullPath, depth + 1);
            } else if (file.endsWith('.html') || file.endsWith('.htlm') || file.endsWith('.txt') || file.endsWith('.gs')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('--bg-primary') || content.includes('TACO Gastos')) {
                        console.log(`Found MATCH: ${fullPath} (Size: ${content.length})`);
                        fs.writeFileSync(`matched_css_${file}`, content);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
}

console.log("Starting search for CSS variables...");
rootDirs.forEach(d => {
    searchDir(d);
});
console.log("Search finished.");
