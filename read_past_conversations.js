const fs = require('fs');
const path = require('path');

const ids = [
    'cf3621ad-d5e2-448f-8ae9-5c8fd24a9283',
    'be5caf21-09a5-4a42-b51c-4d360df704d7'
];

ids.forEach(id => {
    const logPath = `C:/Users/admin/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;
    if (fs.existsSync(logPath)) {
        console.log(`Checking past conversation: ${id}`);
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        console.log(`  Lines count: ${lines.length}`);
        
        // Find if there is any mention of HTML Service or index.html code
        lines.forEach((line, idx) => {
            if (line.includes('HtmlService.createHtmlOutputFromFile') || line.includes('TACO Gastos')) {
                console.log(`  Line ${idx} contains matching keywords! length: ${line.length}`);
                // Try parsing JSON to see if we can extract HTML
                try {
                    const step = JSON.parse(line);
                    if (step.content && step.content.includes('<!DOCTYPE html>')) {
                        console.log(`    Found HTML content in step ${idx}! Writing to past_html_${id}_step_${idx}.txt`);
                        fs.writeFileSync(`past_html_${id}_step_${idx}.txt`, step.content);
                    }
                    if (step.tool_calls) {
                        step.tool_calls.forEach((tc, tIdx) => {
                            if (tc.args && JSON.stringify(tc.args).includes('<!DOCTYPE html>')) {
                                console.log(`    Found HTML in tool call ${tIdx}!`);
                                fs.writeFileSync(`past_html_tool_${id}_step_${idx}_${tIdx}.txt`, JSON.stringify(tc.args));
                            }
                        });
                    }
                } catch(e) {
                    console.log("    JSON parse error:", e.message);
                }
            }
        });
    } else {
        console.log(`Past conversation ${id} log file does not exist at ${logPath}`);
    }
});
