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
            if (line.includes('TACO') || line.includes('tab-tablero') || line.includes('flota-patente')) {
                console.log(`  Match found at line ${idx}! Length: ${line.length}`);
                try {
                    const step = JSON.parse(line);
                    console.log(`    type: ${step.type}`);
                    if (step.content && step.content.includes('<!DOCTYPE html>')) {
                        console.log(`    Found HTML content in step ${idx}! Writing to full_html_${id}_step_${idx}.html`);
                        fs.writeFileSync(`full_html_${id}_step_${idx}.html`, step.content);
                    }
                    if (step.tool_calls) {
                        step.tool_calls.forEach((tc, tIdx) => {
                            if (tc.args && JSON.stringify(tc.args).includes('<!DOCTYPE html>')) {
                                console.log(`    Found HTML in tool call ${tIdx}!`);
                                fs.writeFileSync(`full_html_tool_${id}_step_${idx}_${tIdx}.html`, JSON.stringify(tc.args));
                            }
                        });
                    }
                } catch(e) {
                    console.log(`    JSON parse error: ${e.message}`);
                }
            }
        });
    }
});
