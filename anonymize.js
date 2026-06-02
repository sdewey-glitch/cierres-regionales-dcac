const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let content = fs.readFileSync(filePath, 'utf8');

const namesToAnonymize = [
    "V. Torriglia", "S. Saparrat", "S. Julián", "A. García", "M. Pons", "D. Menghi",
    "L. Frutos", "A. Deambrocio", "S. Poullion", "H. Ganis", "F. Sansot", "J.J. Loza",
    "J. Olmedo", "E. Sánchez", "L. Sposito", "M. Rapp", "S. Bunge", "S. Rivarola",
    "P. Cieri", "A. Mascotena", "I. Diehl", "A. Acuña", "N. Echezarreta", "M. Barboza",
    "F. Alonso", "A. Reynot", "A. Broggi", "S. De Aduriz"
];

namesToAnonymize.forEach((name, index) => {
    // Escape dots
    const regex = new RegExp(name.replace(/\./g, '\\.'), 'g');
    content = content.replace(regex, `Agente ${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26) > 0 ? Math.floor(index / 26) : ''}`);
});

// Replace loose mentions
content = content.replace(/Nota sobre D\. Menghi:/g, "Nota sobre el Agente:");
content = content.replace(/Olmedo, Sánchez, Sposito, Rapp, Bunge/g, "Estos agentes");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Anonymized successfully.');
