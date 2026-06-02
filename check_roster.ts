import { getRoster } from './src/core/normalization';

async function main() {
    const data = await getRoster();
    console.log(data.find(a => a.nombre_ac.includes('Loza')));
    console.log(data.find(a => a.nombre_ac.includes('Ganis')));
}

main().catch(console.error);
