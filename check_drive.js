const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.Google_mail,
        private_key: (process.env.Google_key || '').replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
});

async function listFiles(folderId) {
    const drive = google.drive({ version: 'v3', auth });
    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 50,
        });
        const files = res.data.files;
        if (files.length === 0) {
            console.log(`No files found in ${folderId}.`);
        } else {
            files.forEach((file) => {
                console.log(`${file.id} - ${file.name} (${file.mimeType})`);
            });
        }
    } catch (err) {
        console.error('The API returned an error:', err.message);
    }
}

// Check 'Cierre Abril 2026' folder id
listFiles('1aMnDrG4L4BEqKi0f_m__tsreeku7_cey');
