const fs = require('fs');
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
                if (step.type === 'USER_INPUT') {
                    console.log(`[USER INPUT] Step ${step.step_index}, Length: ${step.content ? step.content.length : 0}`);
                    if (step.content && step.content.includes('Base Mendel')) {
                        console.log(`  -> Match found in Step ${step.step_index}! Saving to recovered_user_request.txt`);
                        fs.writeFileSync('recovered_user_request.txt', step.content);
                    }
                }
            } catch (e) {}
        }
        console.log("Transcript search finished.");
    } catch (e) {
        console.log("Error reading transcript:", e.message);
    }
}

searchTranscript();
