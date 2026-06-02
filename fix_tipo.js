const fs = require('fs');
let code = fs.readFileSync('src/core/engine.ts', 'utf8');

const search = `tipo: rosterEntry?.tipo || (comercial.toLowerCase().includes('oficina') ? 'Regional' : 'Desconocida'),`;
const replace = `tipo: rosterEntry?.tipo || ((comercial.toLowerCase().includes('oficina') || comercial.toLowerCase() === 'lucila frutos' || comercial.toLowerCase() === 'agustin acuna') ? 'Oficina' : 'Desconocida'),`;

code = code.replace(search, replace);
fs.writeFileSync('src/core/engine.ts', code);
console.log('Fixed tipo assignment');
