import { fetchQ95 } from './src/api/metabase';

async function main() {
    const data = await fetchQ95();
    if (data.length > 0) {
        const estados = new Set();
        data.forEach(d => {
            if (d.Estado_Trop) estados.add(d.Estado_Trop);
        });
        console.log("ESTADO_TROP:", [...estados]);
    }
}
main();
