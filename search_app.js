const fs = require('fs');

try {
    const content = fs.readFileSync('frontend/src/App.tsx', 'utf8');
    console.log("App.tsx length:", content.length);
    const lines = content.split('\n');
    console.log("App.tsx lines:", lines.length);
    
    // Search for tablero
    let matchCount = 0;
    lines.forEach((line, idx) => {
        if (line.includes('tablero') || line.includes('flota') || line.includes('TACO')) {
            matchCount++;
            if (matchCount < 20) {
                console.log(`Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
            }
        }
    });
    console.log("Total matches in App.tsx:", matchCount);
} catch(e) {
    console.log("Error reading App.tsx:", e.message);
}
