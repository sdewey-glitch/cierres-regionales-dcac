import { fetchGastos, fetchMendelGastos, fetchKms } from '../src/core/inputs';
import { getRoster } from '../src/core/normalization';

async function test() {
    console.log("Cargando inputs...");
    const [gastos, mendel, kms] = await Promise.all([
        fetchGastos(),
        fetchMendelGastos(),
        fetchKms()
    ]);
    
    console.log(`Total gastos en BDGASTOS: ${gastos.length}`);
    console.log(`Total gastos en Config_Mendel: ${mendel.length}`);
    console.log(`Total entradas en KMS: ${kms.length}`);
    
    const year = 2026;
    const month = 5;
    const name = "sebastian saparrat";
    
    console.log(`\n=== DATOS PARA ${name.toUpperCase()} (${year}-${month}) ===`);
    
    const kmsCom = kms.filter(k => k.año === year && k.mes === month && k.comercial.toLowerCase() === name);
    console.log("KMS:", kmsCom);
    
    const gastCom = gastos.filter(g => g.año === year && g.mes === month && g.comercial.toLowerCase() === name);
    console.log("BDGASTOS:", gastCom);
    
    const mendCom = mendel.filter(m => m.periodo === "202605" && m.usuario.toLowerCase().includes("saparrat"));
    console.log("MENDEL:", mendCom);
}

test().catch(console.error);
