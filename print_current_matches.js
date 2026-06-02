const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:/Users/admin/.gemini/antigravity/brain/471d74a8-6811-480f-8152-14d380ddbe85/.system_generated/logs/transcript.jsonl';

async function printMatches() {
    try {
        const fileStream = fs.createReadStream(transcriptPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let lineNum = 0;
        for await (const line of rl) {
            lineNum++;
            if (line.includes('TACO Gastos') || line.includes('showTab(\'tablero\')') || line.includes('showTab("tablero")')) {
                try {
                    const step = JSON.parse(line);
                    console.log(`Step: ${step.step_index} | Type: ${step.type} | Src: ${step.source} | Len: ${step.content ? step.content.length : 0} chars`);
                    if (step.content) {
                        console.log(`  Preview: ${step.content.substring(0, 150).replace(/\r?\n/g, ' ')}`);
                    }
                } catch(e) {}
            }
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
}

printMatches();
