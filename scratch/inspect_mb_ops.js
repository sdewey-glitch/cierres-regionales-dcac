const { fetchQ95 } = require('../src/api/metabase');
const { getRoster } = require('../src/core/normalization');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
    console.log("Fetching operations from Metabase...");
    const ops = await fetchQ95();
    console.log(`Total ops loaded: ${ops.length}`);
    
    // Filtrar operaciones de Mayo 2026 (2026-05)
    const mayOps = ops.filter(op => {
        if (!op.fecha_operacion) return false;
        return op.fecha_operacion.startsWith('2026-05');
    });
    
    console.log(`Found ${mayOps.length} operations in May 2026`);
    
    const vendVals = new Set();
    const compVals = new Set();
    
    mayOps.forEach(op => {
        const v = String(op.asociado_comercial_id_vend || op.AC_Vend || op.RepreVendedor || '').trim();
        const c = String(op.asociado_comercial_id_comp || op.AC_Comp || op.RepreComprador || '').trim();
        
        if (v) vendVals.add(v);
        if (c) compVals.add(c);
    });
    
    console.log("Unique Vendedor values in May 2026:", Array.from(vendVals));
    console.log("Unique Comprador values in May 2026:", Array.from(compVals));
}

test().catch(console.error);
