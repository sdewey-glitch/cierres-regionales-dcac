import { fetchCard, getMetabaseSession } from './src/api/metabase';

async function test() {
    try {
        const token = await getMetabaseSession();
        const data = await fetchCard(95, token);
        
        const lote = data.find((row: any) => row.id_lote === 109969 || String(row.id_lote) === '109969');
        
        if (lote) {
            console.log("Found Lote 109969:");
            console.log(lote);
        } else {
            console.log("Lote 109969 NOT FOUND in Q95!");
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
test();
