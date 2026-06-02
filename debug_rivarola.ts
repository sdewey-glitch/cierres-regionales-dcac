import { calculateDynamicMonth } from './src/core/engine';

async function run() {
    try {
        console.log('Ejecutando motor en modo debug para Sebastian Rivarola (Mayo 2026)...');
        const results = await calculateDynamicMonth(2026, 5);
        const s = results.find(r => r.asociadoComercial.toLowerCase().includes('rivarola'));
        
        if (s) {
            console.log('Resultados encontrados:');
            console.log({
                nombre: s.asociadoComercial,
                kms: s.kms,
                auto: s.auto,
                precio: s.precioPorKm,
                reintegro: s.reintegroMovilidad,
                amort: s.amortizacioneDcac,
                sueldoBruto: s.sueldoBruto,
                cierreReal: s.cierreReal
            });
        } else {
            console.log('No se encontró a Sebastian Rivarola en los resultados.');
        }
    } catch (e) {
        console.error('Error in debug:', e);
    }
}

run();
