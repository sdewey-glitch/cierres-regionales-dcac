const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/server.ts');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
console.log('Total lines before:', lines.length);

// Remove lines 960 through 1013 (0-indexed: 959-1012)
// These contain the old classifyQ95Channel function body that was orphaned
const fixed = [...lines.slice(0, 959), ...lines.slice(1013)];
console.log('Total lines after:', fixed.length);
console.log('Removed', lines.length - fixed.length, 'lines (old classifyQ95Channel body)');

fs.writeFileSync(filePath, fixed.join('\n'), 'utf8');
console.log('File fixed!');
