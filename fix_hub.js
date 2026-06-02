const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/Hub.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines:', lines.length);

// Find the component's return statement - it should be "  return ("
let returnLine = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trimEnd() === '  return (') {
        returnLine = i;
        break;
    }
}
console.log('Component return at line:', returnLine + 1);

// The good new renderRedModal ends at line 1388 ("  };") and line 1389 (blank)
// Everything from 1390 (index 1389) to returnLine-1 is garbage
console.log('Garbage from line', 1391, 'to line', returnLine);
console.log('Garbage lines count:', returnLine - 1390);

// Reconstruct: keep lines 0..1388 (1389 lines), add blank, then keep returnLine..end
const goodStart = lines.slice(0, 1389); // lines 1 through 1389 (indices 0..1388)
const goodEnd = lines.slice(returnLine); // return ( through end

const fixed = [...goodStart, '', ...goodEnd];
console.log('Fixed total lines:', fixed.length);

fs.writeFileSync(filePath, fixed.join('\n'), 'utf8');
console.log('File fixed successfully!');
