const fs = require('fs');

try {
    const raw = fs.readFileSync('recovered_user_request.txt', 'utf8');
    
    // Find index of 'y el front'
    const frontMarker = 'y el front';
    const markerIndex = raw.indexOf(frontMarker);
    
    if (markerIndex !== -1) {
        const backendCode = raw.substring(0, markerIndex).replace('Buenas me armar una tarjeta de gastos, este es mi codigo.gs', '').trim();
        const frontendCode = raw.substring(markerIndex + frontMarker.length).trim();
        
        fs.writeFileSync('recovered_code.gs', backendCode);
        fs.writeFileSync('recovered_index.html', frontendCode);
        
        console.log("Successfully extracted:");
        console.log(`- Backend code saved to recovered_code.gs (${backendCode.length} chars)`);
        console.log(`- Frontend code saved to recovered_index.html (${frontendCode.length} chars)`);
    } else {
        console.log("Could not find 'y el front' marker in recovered request.");
    }
} catch(e) {
    console.log("Error extracting parts:", e.message);
}
