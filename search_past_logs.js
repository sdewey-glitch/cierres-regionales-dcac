const fs = require('fs');
const path = require('path');
const readline = require('readline');

const pastLogsPath = 'C:/Users/admin/.gemini/antigravity/brain/cf3621ad-d5e2-448f-8ae9-5c8fd24a9283/.system_generated/logs/transcript.jsonl';

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

        let idx = 0;
        for await (const line of rl) {
            idx++;
            try {
                const step = JSON.parse(line);
                // Look for write_to_file calls that write index.html or Codigo.gs
                if (step.tool_calls) {
                    step.tool_calls.forEach(tc => {
                        if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
                            const args = tc.arguments || tc.Arguments;
                            if (args) {
                                console.log(`Step ${step.step_index} (Line ${idx}) called ${tc.name} on: ${args.TargetFile || args.AbsolutePath}`);
                            }
                        }
                    });
                }
            } catch(e) {}
        }
        console.log("Search finished.");
    } catch(e) {
        console.log("Error:", e.message);
    }
}

searchPastLogs();
