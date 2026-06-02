const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail || process.env.GOOGLE_MAIL,
        private_key: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

async function listSheets() {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';

    try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        console.log("Available sheets:");
        metadata.data.sheets.forEach(s => {
            console.log(`- ${s.properties.title} (ID: ${s.properties.sheetId})`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listSheets();
