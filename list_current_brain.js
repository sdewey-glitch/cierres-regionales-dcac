const fs = require('fs');
const path = require('path');

const brainPath = 'C:/Users/admin/.gemini/antigravity/brain/471d74a8-6811-480f-8152-14d380ddbe85';

function listDir(dir, depth = 0) {
    if (depth > 3) return;
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (file === '.system_generated' || file === 'node_modules' || file === '.git') return;
                console.log(`[DIR] ${fullPath}`);
                listDir(fullPath, depth + 1);
            } else {
                console.log(`[FILE] ${fullPath} (${stat.size} bytes)`);
            }
        });
    } catch(e) {
        console.log("Error reading:", dir, e.message);
    }
}

console.log("Listing current brain directory...");
listDir(brainPath);
console.log("Done.");
