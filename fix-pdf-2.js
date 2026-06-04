const fs = require('fs');
let file = fs.readFileSync('src/core/pdf-template.ts', 'utf8');

// The error is TS18048: 'data.cabInvReg' is possibly 'undefined'.
// It happens on lines like:
// ${data.cabInvReg > 0 ? ...
// We will replace `data.cab` and `data.res` checks with `(data.cab... || 0)`

const toReplace = [
    'cabInvReg', 'resInvReg', 'cabInvNeoReg', 'resInvNeoReg', 'cabFaenaReg', 'resFaenaReg', 'cabCriaReg', 'resCriaReg', 'cabMagReg', 'resMagReg',
    'cabInvOfi', 'resInvOfi', 'cabInvNeoOfi', 'resInvNeoOfi', 'cabFaenaOfi', 'resFaenaOfi', 'cabCriaOfi', 'resCriaOfi', 'cabMagOfi', 'resMagOfi'
];

toReplace.forEach(field => {
    // Replace `data.field < 0` or `data.field > 0` with `(data.field || 0)`
    const regex1 = new RegExp(`data\\.${field}\\s*>`, 'g');
    const regex2 = new RegExp(`data\\.${field}\\s*<`, 'g');
    
    file = file.replace(regex1, `(data.${field} || 0) >`);
    file = file.replace(regex2, `(data.${field} || 0) <`);
});

fs.writeFileSync('src/core/pdf-template.ts', file, 'utf8');
console.log('Fixed undefined checks');
