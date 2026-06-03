import { fetchQ95 } from '../src/api/metabase';
import { getRoster, normalizeName } from '../src/core/normalization';
import { classifyChannel } from '../src/core/engine';

async function run() {
    const q95 = await fetchQ95();
    const roster = await getRoster();
    
    let mismatches = 0;
    
    for (const op of q95.slice(0, 1000)) {
        // Venta
        const acIdVend = op.asociado_comercial_id_vend || op.AC_Vend || '';
        const acSocVend = op.asociado_comercial_soc_vend || '';
        const repreVend = op.RepreVendedor || op.repre_vendedor || '';
        const vendRaw = acIdVend || acSocVend || repreVend || '';
        
        const acVend = vendRaw ? await normalizeName(String(vendRaw)) : null;
        const currentCanal = classifyChannel(acVend, repreVend, op.Canal_Venta, roster).toUpperCase();
        const dbCanal = (op.Canal_Venta || '').toUpperCase().trim();
        
        if (dbCanal && currentCanal !== dbCanal) {
            mismatches++;
            if (mismatches <= 5) {
                console.log(`Mismatch Vend: AC=${acVend}, Rep=${repreVend}, DB_Canal=${dbCanal}, Classified=${currentCanal}, RosterTipo=${acVend ? roster.get(acVend.toLowerCase())?.tipo : ''}`);
            }
        }
    }
    
    console.log(`Total mismatches in first 1000 rows: ${mismatches}`);
}

run().catch(console.error);
