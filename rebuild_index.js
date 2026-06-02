const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

// Remove current index
md = md.replace(/## Índice[\s\S]*?(<div style="page-break-after: always;"><\/div>|## 1\.)/, '').trim();
md = md.replace(/^<div style="page-break-after: always;"><\/div>/, '').trim();

let indexMd = "## Índice\n\n";

const matches = [...md.matchAll(/^## (\d+)\.\s+(.*?)$/gm)];
for (const match of matches) {
    const counter = match[1];
    const title = match[2].trim();
    const id = `${counter}-${title}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    indexMd += `${counter}. [${title}](#${id})\n`;
}

const finalMd = `${indexMd}\n<div style="page-break-after: always;"></div>\n\n${md}`;

fs.writeFileSync(MD_PATH, finalMd);
console.log('Index rebuilt.');
