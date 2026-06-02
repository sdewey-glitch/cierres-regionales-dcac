import { fetchCard, getMetabaseSession } from './src/api/metabase';

async function test() {
    try {
        const token = await getMetabaseSession();
        const data = await fetchCard(95, token); // This now uses query/json
        
        const valentinOps = data.filter((row: any) => 
            (row.vendedor_ac && row.vendedor_ac.toLowerCase().includes('valentin')) ||
            (row.vendedor_repre && row.vendedor_repre.toLowerCase().includes('valentin')) ||
            (row.comprador_ac && row.comprador_ac.toLowerCase().includes('valentin')) ||
            (row.comprador_repre && row.comprador_repre.toLowerCase().includes('valentin')) ||
            (row.operador_nombre && row.operador_nombre.toLowerCase().includes('valentin'))
        );

        console.log(`Found ${valentinOps.length} ops for Valentin.`);
        if (valentinOps.length > 0) {
            const first = valentinOps[0];
            console.log(first);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
test();
