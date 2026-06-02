const fs = require('fs');
const path = require('path');

function searchDir(dir, depth = 0) {
    if (depth > 5) return;
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
                // Read text files
                if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.gs') || file.endsWith('.txt')) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes('showTab') || content.includes('TACO Gastos') || content.includes('data-tab="tablero"')) {
                            console.log(`Found MATCH in workspace: ${fullPath} (Size: ${content.length})`);
                        }
                    } catch(e) {}
                }
            }
        }
    } catch(e) {}
}

console.log("Searching workspace files...");
searchDir('.');
console.log("Search finished.");
