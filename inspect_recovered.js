const fs = require('fs');

try {
    const raw = fs.readFileSync('recovered_user_request.txt', 'utf8');
    console.log("Length of recovered request:", raw.length);
    console.log("=== First 300 characters ===");
    console.log(raw.substring(0, 300));
    console.log("============================");
    
    // Find where '<!DOCTYPE html>' or '<html' starts
    const htmlIndex = raw.indexOf('<!DOCTYPE html>');
    if (htmlIndex !== -1) {
        console.log("Found <!DOCTYPE html> at index:", htmlIndex);
        const backendCode = raw.substring(0, htmlIndex).trim();
        const frontendCode = raw.substring(htmlIndex).trim();
        
        fs.writeFileSync('recovered_code.gs', backendCode);
        fs.writeFileSync('recovered_index.html', frontendCode);
        
        console.log(`Successfully split at <!DOCTYPE html>:`);
        console.log(`- saved recovered_code.gs (${backendCode.length} chars)`);
        console.log(`- saved recovered_index.html (${frontendCode.length} chars)`);
    } else {
        console.log("Could not find <!DOCTYPE html> in recovered request.");
    }
} catch(e) {
    console.log("Error:", e.message);
}
