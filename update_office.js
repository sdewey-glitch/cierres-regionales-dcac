const fs = require('fs');

let code = fs.readFileSync('src/core/engine.ts', 'utf8');

const search = `oficina: rosterEntry?.oficina || (comercial.toLowerCase().includes('oficina') ? comercial : '')`;
const replace = `oficina: rosterEntry?.oficina || (comercial.toLowerCase().includes('oficina') ? comercial : (comercial.toLowerCase() === 'lucila frutos' ? 'Oficina Rio 4to' : (comercial.toLowerCase() === 'agustin acuna' ? 'Oficina Bavio' : '')))`;

code = code.replace(search, replace);

fs.writeFileSync('src/core/engine.ts', code);
console.log('Replaced successfully');
