import { fetchMendelGastos } from './src/core/inputs';
import { fetchAjustesManuales } from './src/core/inputs';
import { fetchKms } from './src/core/inputs';
import { config } from './src/config/env';

async function test() {
    console.log("Fetching Mendel Gastos...");
    const mendel = await fetchMendelGastos();
    console.log(`Total Mendel Gastos loaded: ${mendel.length}`);
    const may2026 = mendel.filter(m => m.periodo === '202605');
    console.log(`May 2026 Mendel Gastos: ${may2026.length}`);
    if (may2026.length > 0) {
        console.log("Sample May 2026 Mendel entries:");
        console.log(may2026.slice(0, 10));
    }

    console.log("\nFetching Ajustes Manuales...");
    const ajustes = await fetchAjustesManuales();
    console.log(`Total Ajustes loaded: ${ajustes.length}`);
    const mayAju = ajustes.filter(a => a.año === 2026 && a.mes === 5);
    console.log(`May 2026 Ajustes: ${mayAju.length}`);
    if (mayAju.length > 0) {
        console.log("Sample May 2026 Ajustes:");
        console.log(mayAju.slice(0, 10));
    }
}

test().catch(console.error);
