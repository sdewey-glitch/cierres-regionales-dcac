import * as fs from 'fs';
import * as path from 'path';
import { saveMonthSnapshot } from './src/core/snapshot';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

async function run() {
    console.log("Iniciando migración de snapshots locales a Google Sheets...");
    const snapshotsDir = path.join(__dirname, 'src/core/snapshots');
    
    if (!fs.existsSync(snapshotsDir)) {
        console.error(`❌ Directorio no encontrado: ${snapshotsDir}`);
        return;
    }

    const files = fs.readdirSync(snapshotsDir);
    const closureFiles = files.filter(f => f.match(/^cierre_\d{4}_\d{2}\.json$/));
    
    console.log(`Se encontraron ${closureFiles.length} archivos de cierre para migrar.`);

    for (const file of closureFiles) {
        const match = file.match(/^cierre_(\d{4})_(\d{2})\.json$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const filePath = path.join(snapshotsDir, file);
            
            console.log(`Procesando ${file}...`);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (!Array.isArray(data)) {
                    console.warn(`⚠️ Advertencia: El archivo ${file} no contiene un array válido. Saltando.`);
                    continue;
                }

                await saveMonthSnapshot(year, month, data);
                console.log(`✅ Migrado ${file} exitosamente a Google Sheets.`);
            } catch (e: any) {
                console.error(`❌ Error migrando ${file}:`, e.message);
            }
        }
    }
    console.log("¡Migración finalizada!");
}

run();
