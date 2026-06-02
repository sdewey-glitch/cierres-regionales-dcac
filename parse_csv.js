const fs = require('fs');
const csvPath = 'c:/Users/admin/Downloads/570c7d85-30e4-46b6-a1d8-e0c53419b187.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);
const headers = lines[0].split('\",\"').map(h => h.replace(/^\"|\"$/g, ''));
console.log('Headers:', headers);

console.log('\nRow 1:');
const row1 = lines[1].split('\",\"').map(h => h.replace(/^\"|\"$/g, ''));
headers.forEach((h, i) => console.log(`${h}: ${row1[i]}`));
