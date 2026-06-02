const fs = require('fs');

try {
    const content = fs.readFileSync('logs_analysis.txt', 'utf8');
    const lines = content.split('\n');
    console.log("Lines in logs_analysis.txt:", lines.length);
    let matchCount = 0;
    lines.forEach((line, idx) => {
        if (line.includes('TACO Gastos') || line.includes('showTab(')) {
            matchCount++;
            if (matchCount < 30) {
                console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
            }
        }
    });
    console.log("Total matches:", matchCount);
} catch(e) {
    console.log("Error reading logs_analysis.txt:", e.message);
}
