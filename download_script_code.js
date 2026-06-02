const { google } = require('googleapis');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const googleEmail = process.env.Google_mail;
const googleKey = process.env.Google_key.replace(/\\n/g, '\n');
const spreadsheetId = '1RQccyLr4b6XpSTVBnCB50kMgI0zIS1vAWMkhHXjiLbs';

const auth = new google.auth.JWT({
    email: googleEmail,
    key: googleKey,
    scopes: [
        'https://www.googleapis.com/auth/script.projects.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
});

async function runDirectRequest() {
    try {
        console.log("Getting OAuth 2.0 access token...");
        await auth.authorize();
        const token = auth.credentials.access_token;
        
        console.log("Querying Apps Script projects with parentId...");
        const urlList = `https://script.googleapis.com/v1/projects?parentId=${spreadsheetId}`;
        
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const resList = await fetch(urlList, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log("Response Status:", resList.status);
        console.log("Response Headers:", JSON.stringify([...resList.headers.entries()]));
        
        const text = await resList.text();
        console.log("Response Text (first 500 chars):", text.substring(0, 500));
        
    } catch(e) {
        console.log("Request error:", e.message);
    }
}

runDirectRequest();
