const fs = require('fs');

try {
    const content = fs.readFileSync('inspect_output.txt', 'utf16le');
    console.log("Length of inspect_output.txt:", content.length);
    console.log("=== First 1000 characters ===");
    console.log(content.substring(0, 1000));
    console.log("============================");
    
    // Check if it lists matching files
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('Match:') || line.includes('Found MATCH:') || line.includes('Specific Match')) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
} catch(e) {
    console.log("Error:", e.message);
}
