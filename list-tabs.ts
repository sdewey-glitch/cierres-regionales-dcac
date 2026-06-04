import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    const auth = new google.auth.JWT({
        email: process.env.Google_mail,
        key: (process.env.Google_key || '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const oldId = '1z0zUmbK4ZBSfSD7Qoa8UJeqhiXqCOVfbN8Co9b4Qm2Y';
    const newId = '1zmWxw0BkeuHIh-Ka3IKW5Y7_DF-tcA9QQVZ0_NKzP70';

    try {
        console.log(`Leyendo metadatos de la planilla vieja ${oldId}...`);
        const resOld = await sheets.spreadsheets.get({ spreadsheetId: oldId });
        const oldSheetNames = (resOld.data.sheets || []).map(s => s.properties?.title);
        console.log("Hojas vieja:", oldSheetNames);

        console.log(`Leyendo metadatos de la planilla nueva ${newId}...`);
        const resNew = await sheets.spreadsheets.get({ spreadsheetId: newId });
        const newSheetNames = (resNew.data.sheets || []).map(s => s.properties?.title);
        console.log("Hojas nueva:", newSheetNames);
    } catch (e: any) {
        console.error("❌ Error leyendo planillas:", e.message);
    }
}

run();

