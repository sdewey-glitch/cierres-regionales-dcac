import { fetchQ95 } from '../src/api/metabase';
import { getRoster, normalizeName } from '../src/core/normalization';

function newClassifyChannel(
    acName: string | null,
    repreName: string | null,
    dbChannel: string | null,
    roster: Map<string, any>
): 'Regional' | 'Representante' | 'Comisionista' | 'Directo' {
    const ac = acName ? acName.trim().toLowerCase() : '';
    const rep = repreName ? repreName.trim().toLowerCase() : '';

    const acEntry = ac ? roster.get(ac) : null;
    const repEntry = rep ? roster.get(rep) : null;
    
    // 1. Validar por tipo en Roster (prioridad 1)
    const entryToUse = acEntry || repEntry;
    
    if (entryToUse && entryToUse.tipo) {
        const tipo = entryToUse.tipo.toLowerCase();
        if (tipo === 'regional' || tipo === 'city manager') return 'Regional';
        if (tipo === 'representante') return 'Representante';
        if (tipo === 'corporate' || tipo === 'oficina' || tipo === 'operario de carga') return 'Directo';
        if (tipo === 'comisionista') return 'Comisionista';
    }
    
    // 2. Si no está en Roster o no tiene tipo, utilizar el canal que viene de la base de datos (Q95)
    if (dbChannel) {
        const db = dbChannel.trim().toLowerCase();
        if (db.includes('regional')) return 'Regional';
        if (db.includes('representante')) return 'Representante';
        if (db.includes('comisionista')) return 'Comisionista';
        if (db.includes('directo')) return 'Directo';
    }

    // 3. Fallbacks heredados
    const tieneREP = rep && rep !== 'directo' && rep !== 'directa' && !rep.includes('pedro genta') && !rep.includes('bernado');
    if (tieneREP) {
        const isR4 = rep.includes('rio 4to') || rep.includes('rio cuarto');
        const isER = rep.includes('entre rios');
        if (isR4 || isER) return 'Directo';
        return 'Representante';
    }

    return 'Directo';
}

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
        const currentCanal = newClassifyChannel(acVend, repreVend, op.Canal_Venta, roster).toUpperCase();
        const dbCanal = (op.Canal_Venta || '').toUpperCase().trim();
        
        if (dbCanal && currentCanal !== dbCanal) {
            mismatches++;
            if (mismatches <= 5) {
                console.log(`Mismatch Vend: AC=${acVend}, Rep=${repreVend}, DB_Canal=${dbCanal}, Classified=${currentCanal}, RosterTipo=${acVend ? roster.get(acVend.toLowerCase())?.tipo : ''}`);
            }
        }
    }
    
    console.log(`Total mismatches with NEW logic in first 1000 rows: ${mismatches}`);
}

run().catch(console.error);
