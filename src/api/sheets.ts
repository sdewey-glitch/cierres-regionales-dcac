import { google } from 'googleapis';
import { config } from '../config/env';

function getSheetsClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.sheets({ version: 'v4', auth });
}

/**
 * Ejecuta una función con reintentos y backoff exponencial.
 * Reintenta en errores 429 (Quota exceeded) y 500/503 transitorios.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4, label = 'sheets'): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            lastError = e;
            const status = e?.status || e?.code || e?.response?.status;
            const isQuota = status === 429 || status === 'RESOURCE_EXHAUSTED' ||
                (e?.message || '').includes('Quota exceeded') ||
                (e?.message || '').includes('quota');
            const isTransient = status === 500 || status === 503 || status === 'UNAVAILABLE';

            if ((isQuota || isTransient) && attempt < maxRetries) {
                const waitMs = Math.pow(2, attempt + 1) * 1000 + Math.random() * 500;
                console.warn(`[${label}] ⏳ Quota/error (intento ${attempt + 1}/${maxRetries}), esperando ${Math.round(waitMs)}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

/**
 * Cache in-memory de hojas conocidas para evitar múltiples spreadsheets.get() por minuto.
 * Clave: `${spreadsheetId}::${sheetName}` → true si existe confirmado
 */
const knownSheets = new Map<string, boolean>();

export async function readSheet(spreadsheetId: string, range: string): Promise<any[][]> {
    return withRetry(async () => {
        const sheets = getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            valueRenderOption: 'UNFORMATTED_VALUE',
        });
        return res.data.values || [];
    }, 4, `readSheet(${range})`);
}

export async function writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    return withRetry(async () => {
        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values },
        });
    }, 4, `writeSheet(${range})`);
}

export async function appendSheet(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    return withRetry(async () => {
        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values },
        });
    }, 4, `appendSheet(${range})`);
}

export async function clearSheetRange(spreadsheetId: string, range: string): Promise<void> {
    return withRetry(async () => {
        const sheets = getSheetsClient();
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
    }, 4, `clearSheet(${range})`);
}

export async function createSheetIfNotExists(spreadsheetId: string, sheetName: string): Promise<void> {
    const cacheKey = `${spreadsheetId}::${sheetName}`;

    // Si ya sabemos que existe, skip sin ningún request a la API
    if (knownSheets.get(cacheKey)) {
        return;
    }

    return withRetry(async () => {
        const sheets = getSheetsClient();

        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetList = metadata.data.sheets || [];

        // Poblar cache con todas las hojas conocidas de este spreadsheet
        for (const s of sheetList) {
            if (s.properties?.title) {
                knownSheets.set(`${spreadsheetId}::${s.properties.title}`, true);
            }
        }

        if (knownSheets.get(cacheKey)) {
            console.log(`[sheets] Hoja '${sheetName}' ya existe`);
            return;
        }

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: { title: sheetName }
                    }
                }]
            }
        });

        // Marcar como existente en cache
        knownSheets.set(cacheKey, true);
        console.log(`[sheets] ✅ Hoja '${sheetName}' creada`);
    }, 3, `createSheet(${sheetName})`);
}
