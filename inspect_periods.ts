import { fetchMendelGastos } from './src/core/inputs';

async function test() {
    const mendel = await fetchMendelGastos();
    console.log(`Loaded ${mendel.length} entries.`);
    const periods = new Map<string, number>();
    mendel.forEach(m => {
        periods.set(m.periodo, (periods.get(m.periodo) || 0) + 1);
    });
    console.log("Distinct periods and entry counts:");
    console.log(JSON.stringify(Array.from(periods.entries()), null, 2));
}

test().catch(console.error);
