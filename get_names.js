const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.JWT({
    email: process.env.GOOGLE_MAIL,
    key: process.env.GOOGLE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function go() {
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '1FpgyFCw2hibi3w_jArtohKUxPhvfUpnF9SDDI3YI-aI',
        range: "'Asociados Comerciales'!A:A"
    });
    
    console.log(res.data.values.filter(r => r[0] && (r[0].toLowerCase().includes('luli') || r[0].toLowerCase().includes('sposito'))));
}

go().catch(console.error);
