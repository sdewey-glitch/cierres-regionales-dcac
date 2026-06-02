const fs = require('fs');
const path = require('path');

const rootDir = 'C:/Users/admin/Desktop/Mis_Agentes_y_Skills';

function searchDir(dir, depth = 0) {
    if (depth > 6) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            let stat;
            try {
                stat = fs.statSync(fullPath);
            } catch(e) { continue; }
            
            if (stat.isDirectory()) {
                searchDir(fullPath, depth + 1);
            } else if (file.endsWith('.html') || file.endsWith('.htlm') || file.endsWith('.txt') || file.endsWith('.gs')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('doGet') || content.includes('tab-tablero') || content.includes('TACO Gastos')) {
                        console.log(`Match in Mis_Agentes: ${fullPath} (Size: ${content.length})`);
                        fs.writeFileSync(`matched_mis_agentes_${file}`, content);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {}
}

if (fs.existsSync(rootDir)) {
    console.log("Searching in Mis_Agentes_y_Skills...");
    searchDir(rootDir);
} else {
    console.log("Mis_Agentes_y_Skills directory does not exist.");
}
