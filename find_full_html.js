const fs = require('fs');
const path = require('path');

const ids = [
    'cf3621ad-d5e2-448f-8ae9-5c8fd24a9283',
    'be5caf21-09a5-4a42-b51c-4d360df704d7'
];

ids.forEach(id => {
    const logPath = `C:/Users/admin/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;
    if (fs.existsSync(logPath)) {
        console.log(`Searching in ${id}...`);
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.toLowerCase().includes('base target="_top"') || line.toLowerCase().includes('sheet_name = \'base mendel\'') || line.includes('function doGet(')) {
                console.log(`  Match found at line ${idx}! Length: ${line.length}`);
                try {
                    const step = JSON.parse(line);
                    const text = step.content || JSON.stringify(step);
                    // Search for start and end of HTML
                    const htmlStart = text.indexOf('<!DOCTYPE html>');
                    const htmlEnd = text.indexOf('</html>');
                    if (htmlStart !== -1 && htmlEnd !== -1) {
                        const html = text.substring(htmlStart, htmlEnd + 7);
                        console.log(`  Found HTML in step ${idx}! Writing to full_html_${id}_step_${idx}.html`);
                        fs.writeFileSync(`full_html_${id}_step_${idx}.html`, html);
                    } else {
                        console.log(`  No complete HTML tags in step ${idx} text`);
                    }
                } catch(e) {
                    console.log(`  JSON Parse Error at line ${idx}: ${e.message}`);
                }
            }
        });
    }
});
