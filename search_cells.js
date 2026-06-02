const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const googleEmail = process.env.Google_mail;
const googleKey = process.env.Google_key.replace(/\\n/g, '\n');
const spreadsheetId = '1RQccyLr4b6XpSTVBnCB50kMgI0zIS1vAWMkhHXjiLbs';

const auth = new google.auth.JWT({
    email: googleEmail,
    key: googleKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

async function searchCells() {
    try {
        const sheetsAPI = google.sheets({ version: 'v4', auth });
        
        console.log("Fetching spreadsheet metadata...");
        const meta = await sheetsAPI.spreadsheets.get({ spreadsheetId });
        const sheetNames = meta.data.sheets.map(s => s.properties.title);
        
        for (const name of sheetNames) {
            console.log(`Checking sheet: ${name}`);
            const res = await sheetsAPI.spreadsheets.values.get({
                spreadsheetId,
                range: `'${name}'!A1:Z500`
            });
            const rows = res.data.values;
            if (!rows) continue;
            
            rows.forEach((row, rIdx) => {
                row.forEach((cell, cIdx) => {
                    const str = String(cell);
                    if (str.includes('<!DOCTYPE html>') || str.includes('TACO Gastos') || str.includes('showTab(')) {
                        console.log(`  -> MATCH found in cell ${name}!${String.fromCharCode(65 + cIdx)}${rIdx + 1}`);
                        console.log(`  -> Content starts with: ${str.substring(0, 200)}`);
                        fs.writeFileSync('recovered_from_sheet.html', str);
                    }
                });
            });
        }
        console.log("Search complete.");
    } catch(e) {
        console.log("Error:", e.message);
    }
}

searchCells();
