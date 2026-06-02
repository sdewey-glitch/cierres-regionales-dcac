import { fetchHistoricalSalaries } from './src/core/historical';

async function main() {
    const data = await fetchHistoricalSalaries();
    const abr = data.filter(d => d.año === 2026 && d.mes === 4);
    const totalP = abr.reduce((acc, curr) => acc + curr.componenteP, 0);
    console.log('Excel Total Componente P Abril:', totalP);
}

main().catch(console.error);
