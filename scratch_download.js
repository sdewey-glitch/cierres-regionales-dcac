const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
    require('dotenv').config({ path: dotenvPath });
}

// Configuración de credenciales
const GOOGLE_MAIL = process.env.GOOGLE_MAIL;
const GOOGLE_KEY = (process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n');

if (!GOOGLE_MAIL || !GOOGLE_KEY) {
    console.error('Faltan credenciales en .env: GOOGLE_MAIL o GOOGLE_KEY');
    process.exit(1);
}

const auth = new google.auth.JWT({
    email: GOOGLE_MAIL,
    key: GOOGLE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

const FOLDER_ID = '10OTbtUWAl5_wtG3_dhwMpi02Chh6FpYE';

async function run() {
    try {
        console.log(`Buscando archivos en la carpeta: ${FOLDER_ID}...`);
        const res = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webContentLink)',
        });
        
        const files = res.data.files || [];
        console.log(`Encontrados ${files.length} archivos:`);
        for (const file of files) {
            console.log(`- Nombre: ${file.name} | ID: ${file.id} | MimeType: ${file.mimeType}`);
            
            // Descargar el archivo
            console.log(`  Descargando ${file.name}...`);
            const fileStream = fs.createWriteStream(path.join(__dirname, 'scratch', file.name));
            
            const download = await drive.files.get(
                { fileId: file.id, alt: 'media' },
                { responseType: 'stream' }
            );
            
            await new Promise((resolve, reject) => {
                download.data
                    .on('end', () => {
                        console.log(`  Archivo ${file.name} descargado.`);
                        resolve();
                    })
                    .on('error', err => {
                        console.error(`  Error descargando ${file.name}:`, err.message);
                        reject(err);
                    })
                    .pipe(fileStream);
            });
        }
        console.log('Finalizado.');
    } catch (e) {
        console.error('Error listing/downloading files:', e.message);
    }
}

run();
