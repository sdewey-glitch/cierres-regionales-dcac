const fs = require('fs');

const logPath = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\cf3621ad-d5e2-448f-8ae9-5c8fd24a9283\\.system_generated\\logs\\transcript.jsonl';

if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, 'utf8').split('\n');
    lines.forEach((line, idx) => {
        if (!line.trim()) return;
        try {
            const parsed = JSON.parse(line);
            const content = parsed.content || '';
            const match = content.toLowerCase().includes('logo') || 
                          content.toLowerCase().includes('decampoacampo') || 
                          content.toLowerCase().includes('decampo a campo') ||
                          content.toLowerCase().includes('foto');
            
            if (match) {
                console.log(`\n=================== STEP ${parsed.step_index || idx} (${parsed.source}) ===================`);
                console.log(content);
            }
        } catch(e) {}
    });
} else {
    console.log('Log file not found');
}
