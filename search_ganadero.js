const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/admin/mi-tablero-ganadero';

function searchDir(dir, depth = 0) {
    if (depth > 4) return;
    try {
        if (!fs.existsSync(dir)) return;
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
                    if (content.includes('TACO Gastos') || content.includes('showTab(')) {
                        console.log(`Found MATCH in mi-tablero-ganadero: ${fullPath} (Size: ${content.length})`);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
}

console.log("Searching in mi-tablero-ganadero...");
searchDir(targetDir);
console.log("Search finished.");
