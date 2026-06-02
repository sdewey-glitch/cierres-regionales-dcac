const fs = require('fs');
const html = fs.readFileSync('C:/Users/admin/Desktop/PNL_WEB_APP/Index.htlm', 'utf8');

const lines = html.split('\n');
console.log("Lines count:", lines.length);

// Search for cambiarPestana function
let cambiarPestanaStart = -1;
lines.forEach((line, idx) => {
    if (line.includes('function cambiarPestana')) {
        cambiarPestanaStart = idx;
    }
});

console.log(`cambiarPestana function found at line ${cambiarPestanaStart + 1}`);
if (cambiarPestanaStart !== -1) {
    console.log(lines.slice(cambiarPestanaStart, cambiarPestanaStart + 25).join('\n'));
}

// Search for references to tabs, let's list matches for "pestana" or "pestaña"
console.log("=== Matches for 'pesta' ===");
lines.forEach((line, idx) => {
    if (line.includes('pestaña') || line.includes('pestana')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});

// Search for the section where tabs are rendered
console.log("=== Matches for 'tab-' ===");
lines.forEach((line, idx) => {
    if (line.includes('id="tab-') && (line.includes('div') || line.includes('section'))) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
