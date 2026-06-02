// Quick test to verify pool building logic
const pool = new Map<string, { cabezas: number, resultado: number, socOpGen: number, count: number, tropas: number }>();

const testAgents = [
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 828, tropasGeneral: 10 },
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 185, tropasGeneral: 3 },
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 200, tropasGeneral: 3 },
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 1218, tropasGeneral: 15 },
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 101, tropasGeneral: 2 },
    { oficina: 'Oficina Rio 4to', cabezasGeneral: 1970, tropasGeneral: 36 },
];

for (const res of testAgents) {
    const ofi = res.oficina;
    const current = pool.get(ofi) || { cabezas: 0, resultado: 0, socOpGen: 0, count: 0, tropas: 0 };
    current.cabezas += res.cabezasGeneral;
    current.count += 1;
    current.tropas += res.tropasGeneral;
    pool.set(ofi, current);
}

const result = pool.get('Oficina Rio 4to');
console.log('Pool result:', result);
console.log('Expected tropas: 69, Got:', result?.tropas);
console.log('Expected cabezas: 4502, Got:', result?.cabezas);
