const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:/Users/admin/.gemini/antigravity/brain';

async function searchAllTranscripts() {
    try {
        const dirs = fs.readdirSync(brainDir);
        console.log(`Starting search across ${dirs.length} conversation logs...`);
        
        for (const dir of dirs) {
            const transcriptPath = path.join(brainDir, dir, '.system_generated/logs/transcript.jsonl');
            if (fs.existsSync(transcriptPath)) {
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
                            console.log(`MATCH in Conv: ${dir} | Line: ${lineNum}`);
                            try {
                                const step = JSON.parse(line);
                                if (step.content && step.content.length > 5000) {
                                    console.log(`  -> Found long content (${step.content.length} chars) in step ${step.step_index}, type: ${step.type}`);
                                    fs.writeFileSync(`recovered_from_${dir}_step_${step.step_index}.txt`, step.content);
                                }
                            } catch(e) {}
                        }
                    }
                } catch(e) {
                    console.log(`Error reading transcript in ${dir}:`, e.message);
                }
            }
        }
        console.log("Search finished.");
    } catch(e) {
        console.log("Global error:", e.message);
    }
}

searchAllTranscripts();
