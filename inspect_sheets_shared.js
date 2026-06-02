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

async function inspectSpreadsheet() {
    try {
        const sheetsAPI = google.sheets({ version: 'v4', auth });
        
        console.log("Fetching spreadsheet metadata...");
        const meta = await sheetsAPI.spreadsheets.get({ spreadsheetId });
        const sheetNames = meta.data.sheets.map(s => s.properties.title);
        console.log("Sheets found in the document:");
        sheetNames.forEach(name => console.log(`  -> ${name}`));
        
        // Inspect the first few rows of each sheet to see if there is code
        for (const name of sheetNames) {
            console.log(`\n=== Sheet: ${name} ===`);
            try {
                const res = await sheetsAPI.spreadsheets.values.get({
                    spreadsheetId,
                    range: `'${name}'!A1:E10`
                });
                const rows = res.data.values;
                if (!rows || rows.length === 0) {
                    console.log("  (Empty or could not read rows)");
                    continue;
                }
                
                rows.slice(0, 5).forEach((row, rIdx) => {
                    console.log(`  Row ${rIdx + 1}: ${JSON.stringify(row).substring(0, 180)}`);
                });
            } catch(e) {
                console.log(`  Error reading rows: ${e.message}`);
            }
        }
        
    } catch(e) {
        console.log("Error connecting to spreadsheet:", e.message);
    }
}

inspectSpreadsheet();
