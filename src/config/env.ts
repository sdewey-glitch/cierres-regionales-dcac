import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    METABASE_URL: process.env.METABASE_URL || '',
    METABASE_USERNAME: process.env.METABASE_USERNAME || '',
    METABASE_PASSWORD: process.env.METABASE_PASSWORD || '',
    GOOGLE_KEY: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n'),
    GOOGLE_MAIL: process.env.Google_mail || process.env.GOOGLE_MAIL || '',
    TARGET_SPREADSHEET_ID: process.env.TARGET_SPREADSHEET_ID || '',
    SOURCE_SPREADSHEET_ID: process.env.SOURCE_SPREADSHEET_ID || '',
    HUB_SPREADSHEET_ID: process.env.HUB_SPREADSHEET_ID || '',
    HUB_CONFIGURACIONES_ID: process.env.HUB_CONFIGURACIONES_ID || '',
    HUB_GASTOS_ID: process.env.HUB_GASTOS_ID || '',
    HUB_CIERRES_ID: process.env.HUB_CIERRES_ID || '',
    HUB_TABLERO_ID: process.env.HUB_TABLERO_ID || '',
    HUB_HISTORIAL_ID: process.env.HUB_HISTORIAL_ID || '',
    MASTER_ROSTER_ID: process.env.MASTER_ROSTER_ID || '',
    MENDEL_SPREADSHEET_ID: process.env.MENDEL_SPREADSHEET_ID || '',
    CIERRES_ROOT_FOLDER_ID: process.env.CIERRES_ROOT_FOLDER_ID || '',
};

const missing = Object.entries(config).filter(([_, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
}
