const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

const googleEmail = process.env.Google_mail;
const googleKey = process.env.Google_key.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
    email: googleEmail,
    key: googleKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
});

async function listSharedFiles() {
    try {
        const drive = google.drive({ version: 'v3', auth });
        
        console.log("Listing files in Google Drive shared with service account...");
        const res = await drive.files.list({
            pageSize: 100,
            fields: 'files(id, name, mimeType, modifiedTime, owners)',
            q: "sharedWithMe = true or mimeType = 'application/vnd.google-apps.script'"
        });
        
        const files = res.data.files;
        if (!files || files.length === 0) {
            console.log("No files found.");
            return;
        }
        
        console.log(`Found ${files.length} files:`);
        files.forEach(f => {
            console.log(`  - Name: ${f.name} | ID: ${f.id} | MimeType: ${f.mimeType} | Modified: ${f.modifiedTime}`);
        });
        
    } catch(e) {
        console.log("Error listing shared files:", e.message);
    }
}

listSharedFiles();
