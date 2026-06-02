const fs = require('fs');
const html = fs.readFileSync('C:/Users/admin/Desktop/PNL_WEB_APP/Index.htlm', 'utf8');

console.log("Size:", html.length);

// Print HTML tags and body structure roughly
const lines = html.split('\n');
console.log("Lines:", lines.length);

// Find where <nav class="nav"> starts and ends
let navLineStart = -1;
let navLineEnd = -1;
lines.forEach((line, idx) => {
    if (line.includes('<nav class="nav">') || line.includes('<nav class="flex')) {
        navLineStart = idx;
    }
    if (navLineStart !== -1 && navLineEnd === -1 && line.includes('</nav>')) {
        navLineEnd = idx;
    }
});

console.log(`nav element found from line ${navLineStart + 1} to ${navLineEnd + 1}:`);
if (navLineStart !== -1) {
    console.log(lines.slice(navLineStart, navLineEnd + 1).join('\n'));
}

// Find showTab function definition in Javascript
let showTabStart = -1;
lines.forEach((line, idx) => {
    if (line.includes('function showTab(')) {
        showTabStart = idx;
    }
});

console.log(`showTab function found at line ${showTabStart + 1}`);
if (showTabStart !== -1) {
    console.log(lines.slice(showTabStart, showTabStart + 20).join('\n'));
}

// Find where the tabs pages divs are defined (e.g. <div id="tab-tablero" or <div id="tab-desvios")
lines.forEach((line, idx) => {
    if (line.includes('id="tab-') || line.includes("id='tab-")) {
        console.log(`Tab container div found at line ${idx + 1}: ${line.trim()}`);
    }
});
