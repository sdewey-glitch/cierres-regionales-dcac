const fs = require('fs');
const path = require('path');

const logFile = 'C:/Users/admin/.gemini/antigravity/brain/471d74a8-6811-480f-8152-14d380ddbe85/.system_generated/logs/transcript.jsonl';
if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const step0 = JSON.parse(lines[0]);
    fs.writeFileSync('user_raw_request.txt', step0.content);
    console.log("Extracted raw user request successfully! Size:", step0.content.length);
} else {
    console.log("Log file not found");
}
