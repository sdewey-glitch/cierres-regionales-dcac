import { google } from 'googleapis';
import { config } from '../config/env';
import { Readable } from 'stream';

// Root folder ID for Cierres AC
const CIERRES_ROOT_FOLDER = '1ryE13Qo7C_DAknwFTZq9QWKUhkUOu4Oh';

function getDriveClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.drive({ version: 'v3', auth });
}

/**
 * Lists subfolders in a given parent folder.
 */
export async function listDriveFolders(parentId: string): Promise<{id: string, name: string}[]> {
    const drive = getDriveClient();
    const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
        pageSize: 100,
    });
    return (res.data.files || []).map(f => ({ id: f.id!, name: f.name! }));
}

/**
 * Lists PDF files in a given folder.
 */
export async function listDriveFiles(folderId: string): Promise<{id: string, name: string, webViewLink: string}[]> {
    const drive = getDriveClient();
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        orderBy: 'name',
        pageSize: 500,
    });
    return (res.data.files || []).map(f => ({
        id: f.id!,
        name: f.name!,
        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    }));
}

// ── Month name mapping (Spanish) ──
const MONTH_MAP: Record<string, number> = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
};

// ── Cache ──
let cachedLinks: Map<string, string> | null = null;
let lastLinksFetch = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Gets the folder structure: year > month > files, cached for 1 hour.
 * Returns a map: agentName_YYYYMM -> webViewLink
 *
 * Folder structure:
 *   CIERRES_ROOT_FOLDER/
 *     2025/
 *       Cierre Enero 2025/
 *         Agustin Mascotena - Enero 2025.pdf
 *       Cierre Abril 2025/
 *         ...
 *     2026/
 *       ...
 */
export async function getCierreLinks(): Promise<Map<string, string>> {
    const now = Date.now();
    if (cachedLinks && (now - lastLinksFetch < CACHE_TTL)) {
        return cachedLinks;
    }

    console.log('[drive] Obteniendo estructura de carpetas de Cierres AC...');
    const links = new Map<string, string>();

    try {
        // 1. List year folders
        const yearFolders = await listDriveFolders(CIERRES_ROOT_FOLDER);
        console.log(`[drive] Carpetas año encontradas: ${yearFolders.map(f => f.name).join(', ')}`);

        for (const yearFolder of yearFolders) {
            const yearMatch = yearFolder.name.match(/(\d{4})/);
            if (!yearMatch) continue;
            const year = parseInt(yearMatch[1], 10);

            // 2. List month folders inside year folder
            const monthFolders = await listDriveFolders(yearFolder.id);

            for (const monthFolder of monthFolders) {
                // Folder name like "Cierre Enero 2026" or "Cierre Abril 2026"
                // Extract month name
                const folderLower = monthFolder.name.toLowerCase();
                let folderMonth = 0;
                for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
                    if (folderLower.includes(monthName)) {
                        folderMonth = monthNum;
                        break;
                    }
                }
                if (!folderMonth) continue;

                // 3. List PDF files inside month folder
                const files = await listDriveFiles(monthFolder.id);

                for (const file of files) {
                    // Parse file name: "Agustin Mascotena - Abril 2026.pdf"
                    // Pattern: <agent name> - <month name> <year>.pdf
                    const nameWithoutExt = file.name.replace(/\.pdf$/i, '').trim();
                    const dashIndex = nameWithoutExt.lastIndexOf(' - ');

                    if (dashIndex === -1) continue;

                    const agentName = nameWithoutExt.substring(0, dashIndex).trim().toLowerCase();
                    // Use the folder's year and month (more reliable than parsing from filename)
                    const yyyymm = year * 100 + folderMonth;
                    const linkKey = `${agentName}_${yyyymm}`;
                    const linkUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

                    links.set(linkKey, linkUrl);
                }
            }
        }

        console.log(`[drive] ✅ ${links.size} links de cierre mapeados`);
        cachedLinks = links;
        lastLinksFetch = now;
    } catch (e: any) {
        console.error(`[drive] Error obteniendo links:`, e.message);
        // If we had a previous cache, return it even if expired
        if (cachedLinks) {
            console.warn('[drive] Usando cache expirado como fallback');
            return cachedLinks;
        }
        throw e;
    }

    return links;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Funciones de escritura en Drive (subir PDFs, crear carpetas) ──
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cliente de Drive con permisos de escritura (drive.file + drive).
 * Separado del cliente de solo lectura para respetar el principio de menor privilegio.
 */
function getDriveWriteClient() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
}

// Mapeo inverso: número de mes → nombre en español (capitalizado)
const MONTH_NAMES: Record<number, string> = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

/**
 * Busca o crea una carpeta de año (ej. '2026') dentro de CIERRES_ROOT_FOLDER.
 * @returns El ID de la carpeta del año.
 */
export async function getOrCreateYearFolder(year: number): Promise<string> {
    const drive = getDriveWriteClient();
    const folderName = String(year);

    // Buscar carpeta existente
    const search = await drive.files.list({
        q: `'${CIERRES_ROOT_FOLDER}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
    });

    const existing = search.data.files || [];
    if (existing.length > 0) {
        console.log(`[drive] Carpeta año '${folderName}' encontrada: ${existing[0].id}`);
        return existing[0].id!;
    }

    // Crear carpeta nueva
    const create = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [CIERRES_ROOT_FOLDER],
        },
        fields: 'id',
    });

    console.log(`[drive] Carpeta año '${folderName}' creada: ${create.data.id}`);
    return create.data.id!;
}

/**
 * Busca o crea una carpeta de mes (ej. 'Cierre Junio 2026') dentro de la carpeta del año.
 * Usa getOrCreateYearFolder internamente para obtener/crear la carpeta padre.
 * @returns El ID de la carpeta del mes.
 */
export async function getOrCreateMonthFolder(year: number, month: number): Promise<string> {
    const drive = getDriveWriteClient();
    const yearFolderId = await getOrCreateYearFolder(year);

    const monthName = MONTH_NAMES[month];
    if (!monthName) {
        throw new Error(`[drive] Número de mes inválido: ${month}. Debe ser entre 1 y 12.`);
    }

    const folderName = `Cierre ${monthName} ${year}`;

    // Buscar carpeta existente
    const search = await drive.files.list({
        q: `'${yearFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
    });

    const existing = search.data.files || [];
    if (existing.length > 0) {
        console.log(`[drive] Carpeta mes '${folderName}' encontrada: ${existing[0].id}`);
        return existing[0].id!;
    }

    // Crear carpeta nueva
    const create = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [yearFolderId],
        },
        fields: 'id',
    });

    console.log(`[drive] Carpeta mes '${folderName}' creada: ${create.data.id}`);
    return create.data.id!;
}

/**
 * Sube un buffer PDF a una carpeta específica de Drive.
 * Configura permisos para que cualquiera con el link pueda ver.
 * @returns El ID del archivo y el link de vista web.
 */
export async function uploadPdfToDrive(
    folderId: string,
    fileName: string,
    pdfBuffer: Buffer
): Promise<{ fileId: string; webViewLink: string }> {
    const drive = getDriveWriteClient();

    // Subir archivo PDF usando Readable stream
    const fileRes = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType: 'application/pdf',
            parents: [folderId],
        },
        media: {
            mimeType: 'application/pdf',
            body: Readable.from(pdfBuffer),
        },
        fields: 'id, webViewLink',
    });

    const fileId = fileRes.data.id!;

    // Configurar permiso público (cualquiera con el link puede ver)
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    // Obtener link de vista web actualizado
    const fileInfo = await drive.files.get({
        fileId,
        fields: 'webViewLink',
    });

    const webViewLink = fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`[drive] ✅ PDF '${fileName}' subido exitosamente. ID: ${fileId}`);
    return { fileId, webViewLink };
}

/**
 * Elimina un archivo de Drive por su ID.
 * Útil para re-subir archivos actualizados.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
    const drive = getDriveWriteClient();

    await drive.files.delete({ fileId });
    console.log(`[drive] 🗑️ Archivo eliminado: ${fileId}`);
}

/**
 * Descarga el contenido de un archivo de Drive por su ID.
 * Retorna un Buffer con los datos binarios.
 */
export async function downloadDriveFile(fileId: string): Promise<Buffer> {
    const drive = getDriveClient();
    const res = await drive.files.get({
        fileId,
        alt: 'media',
    }, { responseType: 'arraybuffer' });
    return Buffer.from(res.data as ArrayBuffer);
}
