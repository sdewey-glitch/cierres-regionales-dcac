import { config } from '../config/env';
import * as fs from 'fs';
import * as path from 'path';

let cachedToken: string | null = null;
let tokenExpiry = 0;
const SESSION_TTL_MS = 110 * 60 * 1000;

export async function getMetabaseSession(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    
    const baseUrl = config.METABASE_URL.replace(/\/$/, ''); // Remove trailing slash
    console.log(`Authenticating Metabase at ${baseUrl}/api/session...`);
    const res = await fetch(`${baseUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: config.METABASE_USERNAME, 
            password: config.METABASE_PASSWORD 
        }),
    });
    
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fallo autenticación Metabase: ${res.status} ${text}`);
    }
    
    const data = await res.json();
    cachedToken = data.id;
    tokenExpiry = Date.now() + SESSION_TTL_MS;
    return data.id;
}

export async function fetchCard(cardId: number, sessionToken: string, parameters?: any[]): Promise<any[]> {
    const baseUrl = config.METABASE_URL.replace(/\/$/, '');
    console.log(`Fetching Card ${cardId} Export from ${baseUrl}...`);
    
    // We use the export /query/json endpoint instead of /query to bypass the 2000 row hard-limit
    // and avoid 504 Gateway Timeouts caused by the dashboard runner.
    const params = parameters && parameters.length > 0
        ? encodeURIComponent(JSON.stringify(parameters))
        : '%5B%5D';
    
    const res = await fetch(`${baseUrl}/api/card/${cardId}/query/json`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Metabase-Session': sessionToken 
        },
        body: `parameters=${params}`
    });
    
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Fallo fetchCard Metabase Export: ${res.status} ${text}`);
    }
    
    const data = await res.json();
    return data;
}

let q95Cache: any[] | null = null;
let q95CacheTime = 0;

/**
 * Fetch Q95 data from Metabase.
 * Always fetches full dataset — filtering is done server-side in the endpoint.
 */
export async function fetchQ95(): Promise<any[]> {
    const now = Date.now();
    if (q95Cache && (now - q95CacheTime) < 3600000) {
        console.log(`[metabase] Loaded Q95 data from memory cache (${q95Cache.length} rows)`);
        return q95Cache;
    }

    try {
        const token = await getMetabaseSession();
        // 298 is the new Card ID for Q95_Engine_Ready
        const data = await fetchCard(298, token);
        // Save to cache
        q95Cache = data;
        q95CacheTime = Date.now();
        console.log(`[metabase] Saved Q95 data to memory cache`);
        return data;
    } catch (e: any) {
        console.warn(`[metabase] Metabase fetch failed: ${e.message}. Attempting to load from memory cache...`);
        if (q95Cache) {
            console.log(`[metabase] Loaded Q95 data from memory cache (${q95Cache.length} rows)`);
            return q95Cache;
        }
        throw e;
    }
}

/**
 * Fetch latest AC assignment dates for all societies from log_modificaciones.
 */
export async function fetchAcAssignmentDates(): Promise<Record<string, string>> {
    const cacheDir = path.join(__dirname, '../core/cache');
    const cacheFile = path.join(cacheDir, 'ac_assignment_dates.json');
    try {
        const token = await getMetabaseSession();
        const baseUrl = config.METABASE_URL.replace(/\/$/, '');
        const query = `
          SELECT
            ST.cuit AS cuit,
            max(LM.timestamp) AS fecha_asignacion
          FROM
            dcac.log_modificaciones AS LM
            INNER JOIN dcac.sociedades_tags AS ST ON LM.registro = ST.id
          WHERE
            LM.tabla = 'sociedades_tags'
            AND LM.campo = 'asociado_comercial'
            AND ST.cuit != ''
          GROUP BY
            ST.cuit
        `;
        const res = await fetch(`${baseUrl}/api/dataset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Metabase-Session': token
            },
            body: JSON.stringify({
                database: 2,
                type: "native",
                native: { query }
            })
        });
        if (!res.ok) throw new Error(`Failed to fetch AC assignment dates: ${res.status}`);
        const data = await res.json();
        const mapping: Record<string, string> = {};
        if (data.data && data.data.rows) {
            for (const row of data.data.rows) {
                const cuit = String(row[0]).trim();
                const fecha = String(row[1]);
                if (cuit && cuit !== '0') {
                    mapping[cuit] = fecha;
                }
            }
        }
        // Save to cache
        try {
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            fs.writeFileSync(cacheFile, JSON.stringify(mapping));
            console.log(`[metabase] Saved AC assignment dates cache to ${cacheFile}`);
        } catch (e: any) {
            console.warn(`[metabase] Failed to write AC assignment dates cache: ${e.message}`);
        }
        return mapping;
    } catch (e: any) {
        console.warn(`[metabase] Failed to fetch AC assignment dates: ${e.message}. Loading from cache...`);
        if (fs.existsSync(cacheFile)) {
            try {
                return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            } catch (err: any) {
                console.error(`[metabase] Failed to parse AC assignment dates cache: ${err.message}`);
            }
        }
        return {};
    }
}
