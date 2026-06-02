const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.JWT({
    email: process.env.GOOGLE_MAIL,
    key: process.env.GOOGLE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function go() {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: '1FpgyFCw2hibi3w_jArtohKUxPhvfUpnF9SDDI3YI-aI',
            range: "'Asociados Comerciales'!A1:B5"
        });
        console.log("SUCCESS! Got rows:", res.data.values.length);
    } catch(e) {
        console.log("ERROR:", e.message);
    }
}

go().catch(console.error);
