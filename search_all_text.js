const fs = require('fs');
const path = require('path');

const rootDirs = [
    'C:/Users/admin/Desktop',
    'C:/Users/admin/Downloads',
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
            } else {
                const ext = path.extname(file).toLowerCase();
                if (['.html', '.htlm', '.txt', '.gs', ''].includes(ext)) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes('TACO Gastos') || content.includes('data-tab="tablero"') || content.includes('showTab(')) {
                            console.log(`Found MATCH: ${fullPath} (Size: ${content.length})`);
                        }
                    } catch(e) {}
                }
            }
        }
    } catch(e) {}
}

console.log("Searching all files for TACO Gastos / tablero...");
rootDirs.forEach(d => {
    searchDir(d);
});
console.log("Search finished.");
