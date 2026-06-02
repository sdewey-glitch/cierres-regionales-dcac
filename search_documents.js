const fs = require('fs');
const path = require('path');

const targetDirs = [
    'C:/Users/admin',
    'C:/Users/admin/Documents'
];

function searchDir(dir, depth = 0) {
    if (depth > 3) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch(e) { continue; }
            
            if (stat.isDirectory()) {
                if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'AppData' || file === 'brain' || file === '.gemini') continue;
                searchDir(fullPath, depth + 1);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (['.html', '.htlm', '.txt', '.gs'].includes(ext)) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes('TACO Gastos') || content.includes('data-tab="tablero"')) {
                            console.log(`Found MATCH: ${fullPath} (Size: ${content.length})`);
                        }
                    } catch(e) {}
                }
            }
        }
    } catch(e) {}
}

console.log("Searching user root and Documents...");
targetDirs.forEach(d => {
    searchDir(d);
});
console.log("Search finished.");
