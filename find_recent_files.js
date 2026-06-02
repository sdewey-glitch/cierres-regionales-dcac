const fs = require('fs');
const path = require('path');

const rootDirs = [
    'C:/Users/admin/Desktop',
    'c:/Users/admin/.gemini/antigravity/scratch/Cierre_regionales'
];

const thresholdDate = new Date('2026-06-01T00:00:00Z');

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
                if (stat.mtime > thresholdDate) {
                    console.log(`Modified: ${fullPath} | Size: ${stat.size} bytes | MTime: ${stat.mtime}`);
                }
            }
        }
    } catch(e) {}
}

console.log("Searching for recently modified files...");
rootDirs.forEach(d => {
    searchDir(d);
});
console.log("Search finished.");
