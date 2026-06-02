import { fetchScales } from './src/core/inputs';

async function test() {
    const scales = await fetchScales();
    console.log(scales.get(202604));
}
test();
