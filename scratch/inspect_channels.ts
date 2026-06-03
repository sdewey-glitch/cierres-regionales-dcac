import { fetchQ95 } from '../src/api/metabase';

async function run() {
    const q95 = await fetchQ95();
    
    const uniqueCanales = new Set();
    const acTiposDb = new Set();
    
    for (const op of q95) {
        if (op.Canal_Venta) uniqueCanales.add(String(op.Canal_Venta).trim().toUpperCase());
        if (op.Canal_compra) uniqueCanales.add(String(op.Canal_compra).trim().toUpperCase());
    }
    
    console.log("Unique Canales in DB:", Array.from(uniqueCanales));
}

run().catch(console.error);
