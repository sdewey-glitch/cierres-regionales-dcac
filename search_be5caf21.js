const fs = require('fs');

const file = 'C:/Users/admin/.gemini/antigravity/brain/be5caf21-09a5-4a42-b51c-4d360df704d7/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    console.log("Lines in be5caf21:", lines.length);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('base_historica') || line.toLowerCase().includes('sheet_flota') || line.toLowerCase().includes('col_flota')) {
            console.log(`Match at line ${idx}! Length: ${line.length}`);
            try {
                const parsed = JSON.parse(line);
                console.log("  type:", parsed.type);
                if (parsed.content) {
                    console.log("  Writing content to match_be5caf21_" + idx + ".txt");
                    fs.writeFileSync(`match_be5caf21_${idx}.txt`, parsed.content);
                }
            } catch(e) {
                console.log("  JSON parse error:", e.message);
            }
        }
    });
} else {
    console.log("be5caf21 log file not found");
}
