const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let content = fs.readFileSync(filePath, 'utf8');

// Replace ### 7.1 Ejemplo -> ### Ejemplo
content = content.replace(/^###\s+\d+\.\d+\s+(.*)$/gm, '### $1');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed headings in documento_clevel_cierres.md');
