const fs = require('fs');
let code = fs.readFileSync('src/core/engine.ts', 'utf8');

const searchOfi = `oficina: rosterEntry?.oficina || (comercial.toLowerCase().includes('oficina') ? comercial : (comercial.toLowerCase() === 'lucila frutos' ? 'Oficina Rio 4to' : (comercial.toLowerCase() === 'agustin acuna' ? 'Oficina Bavio' : ''))),`;
const replaceOfi = `oficina: comercial.toLowerCase() === 'lucila frutos' ? 'Oficina Rio 4to' : (comercial.toLowerCase() === 'agustin acuna' ? 'Oficina Bavio' : (rosterEntry?.oficina || (comercial.toLowerCase().includes('oficina') ? comercial : ''))),`;

const searchTipo = `tipo: rosterEntry?.tipo || ((comercial.toLowerCase().includes('oficina') || comercial.toLowerCase() === 'lucila frutos' || comercial.toLowerCase() === 'agustin acuna') ? 'Oficina' : 'Desconocida'),`;
const replaceTipo = `tipo: (comercial.toLowerCase() === 'lucila frutos' || comercial.toLowerCase() === 'agustin acuna') ? 'Oficina' : (rosterEntry?.tipo || (comercial.toLowerCase().includes('oficina') ? 'Oficina' : 'Desconocida')),`;

code = code.replace(searchOfi, replaceOfi);
code = code.replace(searchTipo, replaceTipo);

fs.writeFileSync('src/core/engine.ts', code);
console.log('Fixed office overrides');
