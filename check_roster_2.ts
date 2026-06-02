import { getRoster } from './src/core/normalization';

async function main() {
    const r = await getRoster();
    console.log(Array.from(r.values()).find(a => a.nombre === 'Juan José Loza'));
}

main().catch(console.error);
