const fs = require('fs');
const readline = require('readline');

const pastLogsPath = 'C:/Users/admin/.gemini/antigravity/brain/bacd5f2f-5c7d-47d0-9516-e06c914fb9c4/.system_generated/logs/transcript.jsonl';

async function searchPastLogs() {
    try {
        if (!fs.existsSync(pastLogsPath)) {
            console.log("Past logs path does not exist:", pastLogsPath);
            return;
        }
        const fileStream = fs.createReadStream(pastLogsPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            try {
                const step = JSON.parse(line);
                if (step.content && (step.content.includes('TACO Gastos') || step.content.includes('showTab(\'tablero\')') || step.content.includes('showTab("tablero")'))) {
                    console.log(`Found MATCH in past logs step ${step.step_index}, type: ${step.type}`);
                    fs.writeFileSync('recovered_past_request.txt', step.content);
                    console.log("Saved content to recovered_past_request.txt");
                }
            } catch(e) {}
        }
        console.log("Search finished.");
    } catch(e) {
        console.log("Error:", e.message);
    }
}

searchPastLogs();
