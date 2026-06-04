const fs = require('fs');

let content = fs.readFileSync('src/core/engine.ts', 'utf-8');

// replace saveSnapshot definition with empty or remove it
content = content.replace(/export function saveSnapshot\([\s\S]*?\}\n\n\/\/ Retroactive/g, "// Retroactive");

// replace calculateRetroactiveAdjustments content
const retroRegex = /const snapshotPath = path\.join\(dir, `cierre_\$\{pastYear\}_\$\{String\(pastMonth\)\.padStart\(2, '0'\)\}\.json`\);\s+if \(!fs\.existsSync\(snapshotPath\)\) \{\s+console\.log\(`\[retro\] No hay snapshot estÃ¡tico para \$\{pastYear\}-\$\{pastMonth\}, skip`\);\s+continue;\s+\}\s+const frozenData: CommercialResult\[\] = JSON\.parse\(fs\.readFileSync\(snapshotPath, 'utf8'\)\);/g;

// Since there is an encoding issue with the á/ǭ/etc, I will just match by `const snapshotPath = path.join(dir,` up to `readFileSync(snapshotPath, 'utf8'));`

let parts = content.split("const snapshotPath = path.join(dir, `cierre_${pastYear}_${String(pastMonth).padStart(2, '0')}.json`);");
if(parts.length > 1) {
    let secondPart = parts[1];
    let indexEnd = secondPart.indexOf("const dynamicResults = await calculateDynamicMonth(pastYear, pastMonth);");
    let replacedSecondPart = `
        const frozenData = await loadMonthSnapshot(pastYear, pastMonth);
        if (!frozenData) {
            console.log(\`[retro] No hay snapshot estático para \${pastYear}-\${pastMonth}, skip\`);
            continue;
        }
        ` + secondPart.substring(indexEnd);
    content = parts[0] + replacedSecondPart;
}

// Add loadMonthSnapshot to imports
content = content.replace("import { CommercialResult, LoteChange, RetroactiveAdjustment } from './types';", "import { CommercialResult, LoteChange, RetroactiveAdjustment } from './types';\nimport { loadMonthSnapshot } from './snapshot';");

fs.writeFileSync('src/core/engine.ts', content, 'utf-8');
console.log('engine.ts updated successfully.');
