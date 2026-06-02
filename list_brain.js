const fs = require('fs');

try {
    const dirs = fs.readdirSync('C:/Users/admin/.gemini/antigravity/brain');
    console.log("Found directories in brain:");
    dirs.forEach(d => {
        const fullPath = `C:/Users/admin/.gemini/antigravity/brain/${d}`;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            console.log(`  -> ${d} (Created: ${stat.birthtime})`);
        }
    });
} catch(e) {
    console.log("Error listing brain directories:", e.message);
}
