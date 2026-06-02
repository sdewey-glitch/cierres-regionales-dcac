import { google } from 'googleapis';
import { config } from './src/config/env';

async function main() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });
    
    // Export the presentation as plain text
    const res = await drive.files.export({
        fileId: '1RfvQrnqVOna1bP8pEOXQGkcg9jbva27_0M-YhdvPLSw',
        mimeType: 'text/plain'
    });
    
    console.log(res.data);
}

main().catch(console.error);
