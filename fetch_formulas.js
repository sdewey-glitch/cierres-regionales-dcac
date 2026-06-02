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

    const auth = new google.auth.JWT({
        email: googleMail,
        key: googleKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';

    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        const result = {
            title: meta.data.properties.title,
            sheets: {}
        };
        
        for (const sheet of meta.data.sheets) {
            const title = sheet.properties.title;
            console.log("Fetching formulas for:", title);
            
            // Get formulas
            const formulaData = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${title}'!A1:BZ100`, // First 100 rows
                valueRenderOption: 'FORMULA'
            });

            // Get unformatted values for data types
            const valueData = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${title}'!A1:BZ100`,
                valueRenderOption: 'UNFORMATTED_VALUE'
            });

            result.sheets[title] = {
                formulas: formulaData.data.values || [],
                values: valueData.data.values || []
            };
        }
        
        fs.writeFileSync('spreadsheet_data.json', JSON.stringify(result, null, 2));
        console.log("Saved to spreadsheet_data.json");
    } catch (e) {
        console.error("Error reading spreadsheet:", e.message);
    }
}

main();
