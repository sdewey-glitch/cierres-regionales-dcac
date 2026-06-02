const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, 'scratch', 'dCaC - Fondo Blanco.png');
const templatePath = path.join(__dirname, 'src', 'core', 'pdf-template.ts');

if (!fs.existsSync(pngPath)) {
    console.error('El logo PNG no existe en scratch/');
    process.exit(1);
}

if (!fs.existsSync(templatePath)) {
    console.error('El template pdf-template.ts no existe en src/core/');
    process.exit(1);
}

// Leer PNG y convertir a base64
const base64Str = fs.readFileSync(pngPath).toString('base64');
const base64ImgTag = `<img src="data:image/png;base64,${base64Str}" width="160" height="32" style="display:block;object-fit:contain;overflow:visible;" />`;

console.log('Imagen convertida a base64. Tamaño base64:', base64Str.length, 'caracteres.');

// Leer pdf-template.ts
let content = fs.readFileSync(templatePath, 'utf8');

// Buscar const LOGO_SVG = ...
const logoRegex = /const LOGO_SVG = `[\s\S]*?`;/;
const newLogoDeclaration = `const LOGO_SVG = \`${base64ImgTag}\`;`;

if (logoRegex.test(content)) {
    content = content.replace(logoRegex, newLogoDeclaration);
    fs.writeFileSync(templatePath, content, 'utf8');
    console.log('✅ Logo actualizado en pdf-template.ts con imagen base64.');
} else {
    console.error('No se pudo encontrar la constante LOGO_SVG en pdf-template.ts');
    process.exit(1);
}
