const fs = require('fs');
const path = require('path');

const rootDirs = [
    'C:/Users/admin/Desktop',
    'C:/Users/admin/Downloads',
    'C:/Users/admin/Documents',
    'C:/Users/admin'
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
                    if (content.includes('data-tab="tablero"') || content.includes("onclick=\"showTab('tablero')\"") || content.includes("showTab('tablero')")) {
                        console.log(`Found MATCH: ${fullPath} (Size: ${content.length})`);
                        // Write to a temporary file in our workspace
                        fs.writeFileSync(`matched_tablero_${file}`, content);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
}

console.log("Starting search for tablero files...");
rootDirs.forEach(d => {
    searchDir(d);
});
console.log("Search finished.");
