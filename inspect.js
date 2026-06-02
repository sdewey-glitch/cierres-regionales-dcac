const { google } = require('C:/Users/admin/mi-tablero-ganadero/node_modules/googleapis');
const fs = require('fs');

async function main() {
    const envPath = 'C:/Users/admin/mi-tablero-ganadero/.env.local';
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    });

    const googleKey = env.Google_key || env.GOOGLE_KEY;
    const googleMail = env.Google_mail || env.GOOGLE_MAIL;

    if (!googleKey || !googleMail) {
        console.error("No Google credentials found in .env.local");
        return;
    }

    const privateKey = googleKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
        email: googleMail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';

    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Spreadsheet Title:", meta.data.properties.title);
        
        for (const sheet of meta.data.sheets) {
            const title = sheet.properties.title;
            console.log("\n--- Sheet:", title, "---");
            
            // fetch first 2 rows
            const data = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${title}'!A1:Z2`
            });
            
            if (data.data.values && data.data.values.length > 0) {
                console.log("Headers:", data.data.values[0]);
                if (data.data.values.length > 1) {
                    console.log("Row 1:", data.data.values[1]);
                }
            } else {
                console.log("(Empty)");
            }
        }
    } catch (e) {
        console.error("Error reading spreadsheet:", e.message);
    }
}

main();
