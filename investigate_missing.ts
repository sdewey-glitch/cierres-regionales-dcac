// Quick check: what are the actual column names for AC fields in Q95 export?
import { setQ95Cache } from './src/core/engine';
import { fetchQ95 } from './src/api/metabase';

async function check() {
    const data = await fetchQ95();
    const sample = data[0];
    const acFields = Object.keys(sample).filter(k => 
        k.toLowerCase().includes('asoc') || 
        k.toLowerCase().includes('ac') || 
        k.toLowerCase().includes('repre') ||
        k.toLowerCase().includes('vend') ||
        k.toLowerCase().includes('comp')
    );
    console.log('Campos AC-related en Q95:');
    acFields.forEach(f => console.log(`  "${f}": "${sample[f]}"`));
}

check().catch(e => console.error(e.message));
