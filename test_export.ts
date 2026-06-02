import { config } from './src/config/env';
import { getMetabaseSession } from './src/api/metabase';

async function fetchExport(cardId: number, token: string) {
    const baseUrl = config.METABASE_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/api/card/${cardId}/query/json`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Metabase-Session': token 
        },
        body: "parameters=%5B%5D" // [] encoded
    });
    
    if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
    }
    const data = await res.json();
    return data;
}

async function test() {
    try {
        const token = await getMetabaseSession();
        console.log("Fetching Card 95 Export...");
        const data = await fetchExport(95, token);
        console.log("Export 95 rows:", data.length);
        
        // Find how many operations are from April 2026
        const april = data.filter((row: any) => row.fecha_operacion && row.fecha_operacion.includes('2026-04'));
        console.log("April 2026 operations:", april.length);
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
test();
