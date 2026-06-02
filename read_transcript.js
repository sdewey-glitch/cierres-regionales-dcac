const fs = require('fs');
const path = require('path');
const readline = require('readline');

const transcriptPath = 'C:/Users/admin/.gemini/antigravity/brain/471d74a8-6811-480f-8152-14d380ddbe85/.system_generated/logs/transcript.jsonl';

async function searchTranscript() {
    try {
        const fileStream = fs.createReadStream(transcriptPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                const step = JSON.parse(line);
                if (step.source === 'USER_EXPLICIT' || (step.content && step.content.includes('TACO Gastos'))) {
                    console.log(`Found step index: ${step.step_index}, type: ${step.type}`);
                    if (step.content && step.content.includes('TACO Gastos')) {
                        console.log("Found HTML in step content!");
                        // Save content to a file in workspace
                        fs.writeFileSync('recovered_user_request.txt', step.content);
                        console.log("Saved content to recovered_user_request.txt");
                    }
                }
            } catch (e) {
                // Ignore parse errors for partial lines
            }
        }
        console.log("Search complete.");
    } catch (e) {
        console.log("Error reading transcript:", e.message);
    }
}

searchTranscript();
