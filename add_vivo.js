const fs = require('fs');

function addVivoEffect(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    // Find div with bg-white, rounded-something, and shadow-something
    // But don't mess with tooltips or small inputs if we can avoid it.
    // Instead we replace known card classes.
    code = code.replace(/className="(.*?bg-white.*?rounded-lg.*?shadow-sm.*?)"/g, (match, p1) => {
        if (!p1.includes('hover:shadow-xl')) {
            return `className="${p1} transition-all duration-300 hover:shadow-xl hover:-translate-y-1"`;
        }
        return match;
    });
    
    code = code.replace(/className="(.*?bg-white.*?rounded-xl.*?shadow-xl.*?)"/g, (match, p1) => {
        if (!p1.includes('hover:shadow-2xl')) {
            return `className="${p1} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"`;
        }
        return match;
    });

    fs.writeFileSync(filePath, code);
}

addVivoEffect('frontend/src/App.tsx');
addVivoEffect('frontend/src/components/Simulator.tsx');
console.log('Vivo effect added');
