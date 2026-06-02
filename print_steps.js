const fs = require('fs');

const file = 'C:/Users/admin/.gemini/antigravity/brain/cf3621ad-d5e2-448f-8ae9-5c8fd24a9283/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const stepIndices = [119, 185, 192];
stepIndices.forEach(idx => {
    if (lines[idx]) {
        console.log(`=== STEP ${idx} ===`);
        const parsed = JSON.parse(lines[idx]);
        console.log("type:", parsed.type);
        console.log("content length:", parsed.content ? parsed.content.length : 0);
        console.log("preview content:", parsed.content ? parsed.content.substring(0, 500) : '');
    }
});
