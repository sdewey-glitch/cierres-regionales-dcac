import { getRoster } from './src/core/normalization';

async function test() {
    console.log("Loading Roster...");
    const roster = await getRoster();
    console.log(`Active roster entries: ${roster.size}`);
    
    console.log("\nVehicles assigned in Roster:");
    for (const [name, entry] of roster.entries()) {
        if (entry.activo) {
            console.log(`- ${entry.nombre}: Auto='${entry.auto}', AmortizacioneDcac='${entry.amortizacioneDcac || 0}', Categoria='${entry.categoria}'`);
        }
    }
}

test().catch(console.error);
