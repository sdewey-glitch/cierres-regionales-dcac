import { fetchKms } from './src/core/inputs';

async function main() {
    const data = await fetchKms();
    console.log(data.filter(k => k.comercial.toLowerCase().includes('loza') || k.comercial.toLowerCase().includes('jose')));
}

main().catch(console.error);
