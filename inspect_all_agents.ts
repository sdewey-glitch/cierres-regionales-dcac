import { google } from 'googleapis';
import { config } from './src/config/env';

async function main() {
    const auth = new google.auth.JWT({
        email: config.GOOGLE_MAIL,
        key: config.GOOGLE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const SID = config.SOURCE_SPREADSHEET_ID;

    // Read the Roster to get all agents
    const roster = await sheets.spreadsheets.values.get({
        spreadsheetId: SID,
        range: "'Import Roster'!A2:W50",
        valueRenderOption: 'FORMATTED_VALUE'
    });

    const agents = (roster.data.values || [])
        .filter(row => row[0] && String(row[0]).trim())
        .map(row => ({
            nombre: String(row[0]).trim(),
            codigo: String(row[1] || ''),
            provincia: String(row[2] || ''),
            partido: String(row[3] || ''),
            oficina: String(row[4] || ''),
            tipo: String(row[5] || ''),
            modalidad: String(row[6] || ''),
            escalas: String(row[7] || ''),
            detalleEscalas: String(row[8] || ''),
            activo: String(row[9] || ''),
            categoria: String(row[22] || ''),
        }));

    console.log(`Total agentes en Roster: ${agents.length}\n`);

    // Now read the "Reporte Mensual AC" formulas - specifically the conditional formulas
    // The key formulas that change per agent are in F5 (Mínimo check), D8 (Escala), F12 (Oficina Comp)
    // Let's read them with FORMULA render

    // Read the formula cells that have agent-specific logic
    const formulaCells = await sheets.spreadsheets.values.get({
        spreadsheetId: SID,
        range: "'Reporte Mensual AC'!A4:R18",
        valueRenderOption: 'FORMULA'
    });
    const rows = formulaCells.data.values || [];

    // Extract all agent names mentioned in formulas
    const allFormulas = rows.map(r => r.join(' ')).join(' ');
    
    // Find all names referenced in IF/OR conditions
    const nameRegex = /\"([A-Z][a-z]+ [A-Z][a-z]+[^\"]*)\"/g;
    const mentionedNames = new Set<string>();
    let match;
    while ((match = nameRegex.exec(allFormulas)) !== null) {
        mentionedNames.add(match[1]);
    }

    console.log('=== Nombres mencionados en fórmulas (excepciones hardcodeadas) ===');
    for (const name of [...mentionedNames].sort()) {
        console.log(`  - ${name}`);
    }

    // Now categorize each agent
    console.log('\n=== MATRIZ COMPLETA DE AGENTES ===\n');
    console.log('Nombre | Tipo | Modalidad | Cat | Oficina | Escala | Excepciones');
    console.log('---|---|---|---|---|---|---');

    for (const a of agents) {
        const excepciones: string[] = [];
        const n = a.nombre;

        // Check formula exceptions
        if (allFormulas.includes(`"${n}"`)) {
            // Check F5 (mínimo logic)
            const f5 = rows[1]?.[5] || '';
            if (f5.includes(n)) {
                if (f5.includes(`"${n}"`) && f5.includes('""')) excepciones.push('Sin check mínimo');
                if (f5.includes(`"${n}"`) && f5.includes('Minimo')) excepciones.push('Mínimo especial');
            }

            // Check D8 (escala)
            const d8 = rows[4]?.[3] || '';
            if (d8.includes(n)) {
                if (d8.includes('0.1')) excepciones.push('Escala fija 10%');
            }

            // Check F12 (oficina)
            const f12 = rows[8]?.[5] || '';
            if (f12.includes(n)) excepciones.push('Oficina condicional');

            // Check gastos
            const gastos = rows.map(r => (r[10] || '') + ' ' + (r[12] || '')).join(' ');
            if (gastos.includes(n)) excepciones.push('Gastos especiales');

            // Check M17 (monto total facturar)
            const m17 = rows[13]?.[12] || '';
            if (m17.includes(n)) excepciones.push('Fórmula Monto Total especial');
        }

        // Determine scale type from modalidad/tipo
        let escalaType = 'Curva AC';
        if (a.tipo.includes('Operario')) escalaType = 'Fijo 10%';
        if (a.tipo === 'Oficina') escalaType = 'N/A (pseudo)';
        if (a.modalidad.includes('Sin minimo')) escalaType += ' (sin piso)';

        console.log(`${n} | ${a.tipo} | ${a.modalidad} | ${a.categoria} | ${a.oficina} | ${escalaType} | ${excepciones.join(', ') || '-'}`);
    }

    // Also read the Reporte Mensual Oficina AC - B4 filter values
    console.log('\n\n=== Reporte Mensual Oficina AC - Estructura ===');
    const ofiRep = await sheets.spreadsheets.values.get({
        spreadsheetId: SID,
        range: "'Reporte Mensual Oficina AC'!A1:T20",
        valueRenderOption: 'FORMULA'
    });
    ofiRep.data.values?.forEach((row, i) => {
        const cells = row.map((c: any, j: number) => {
            if (!c || String(c).length < 2) return null;
            return `[${j}]${c}`;
        }).filter(Boolean);
        if (cells.length > 0) console.log(`  Fila ${i+1}: ${cells.join(' | ')}`);
    });
}

main().catch(console.error);
