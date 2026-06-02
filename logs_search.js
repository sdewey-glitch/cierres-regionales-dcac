const fs = require('fs');

const logPath = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\cf3621ad-d5e2-448f-8ae9-5c8fd24a9283\\.system_generated\\logs\\transcript.jsonl';
let out = '';

if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    lines.forEach((line, idx) => {
        if (!line.trim()) return;
        try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'USER_INPUT') {
                out += `\n=================== STEP ${parsed.step_index || idx} ===================\n`;
                out += parsed.content + '\n';
            }
        } catch(e) {}
    });
    fs.writeFileSync('user_inputs.txt', out, 'utf8');
    console.log('User inputs written successfully');
} else {
    console.log('Log file not found');
}
