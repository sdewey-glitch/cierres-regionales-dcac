const fs = require('fs');
const file = 'frontend/src/components/Hub.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
// Keep lines 0-726 (1-727 in 1-indexed) and lines 1465+ (1466+ in 1-indexed)
const before = lines.slice(0, 727);  // lines[0..726]
const after = lines.slice(1465);     // lines[1465..]
const result = [...before, ...after];
fs.writeFileSync(file, result.join('\n'), 'utf8');
console.log(`Before: ${lines.length} lines → After: ${result.length} lines`);
console.log(`Removed: ${lines.length - result.length} lines`);
