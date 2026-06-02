import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { fetchCard, getMetabaseSession } from './src/api/metabase';
import { config } from './src/config/env';

async function compareLots() {
    console.log("Iniciando comparación de lotes...");

    // 1. Fetch from Google Sheets
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: config.GOOGLE_MAIL,
            private_key: config.GOOGLE_KEY
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1Ca2nQls-9yyHTWqDXETHqIeVXOPRo6rqllySS8_73uA';
    
    let sheetLots = new Map<number, any>();
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'Reporte Mensual Oficina AC'!A1:Z200`, 
        });

        const rows = response.data.values;
        if (rows && rows.length) {
            const torrigliaRows = rows.filter(r => r.some(c => String(c).toLowerCase().includes('valentin torriglia')));
            torrigliaRows.forEach(r => {
                const idLote = Number(String(r[0]).trim()); // Id_lote column
                if (!isNaN(idLote) && idLote > 0) {
                    sheetLots.set(idLote, {
                        id: idLote,
                        tipo: r[1],
                        fecha: r[2],
                        vendedor: r[3],
                        comprador: r[4],
                        cabezas: Number(r[5]) || 0,
                        resultado: r[9]
                    });
                }
            });
        }
    } catch (e: any) {
        console.error("Error leyendo Google Sheets:", e.message);
        return;
    }

    // 2. Fetch from Metabase
    let mbLots = new Map<number, any>();
    try {
        const token = await getMetabaseSession();
        const data = await fetchCard(95, token);
        
        // Filter ops for Valentin from April 2026
        const valentinOps = data.filter((row: any) => {
            const isValentin = (
                (row.vendedor_ac && row.vendedor_ac.toLowerCase().includes('valentin')) ||
                (row.vendedor_repre && row.vendedor_repre.toLowerCase().includes('valentin')) ||
                (row.comprador_ac && row.comprador_ac.toLowerCase().includes('valentin')) ||
                (row.comprador_repre && row.comprador_repre.toLowerCase().includes('valentin')) ||
                (row.operador_nombre && row.operador_nombre.toLowerCase().includes('valentin')) ||
                (row.AC_Vend && row.AC_Vend.toLowerCase().includes('valentin')) ||
                (row.AC_Comp && row.AC_Comp.toLowerCase().includes('valentin'))
            );
            
            const opDate = row.fecha_operacion || row.fecha_publicaciones || row.fecha_concretada;
            const isApril2026 = opDate && typeof opDate === 'string' && opDate.startsWith('2026-04');
            
            const estado = String(row.ESTADO || '').toUpperCase();
            const estadoTrop = String(row.Estado_Trop || '').toUpperCase();
            const invalidStates = ['PUBLICADO', 'NO CONCRETADAS', 'OFRECIMIENTOS', 'BAJA', 'REVISAR', 'PUBLICADAS', 'DADAS DE BAJA', 'PUBLICADO OCULTO'];
            const isValid = !invalidStates.includes(estado) && !invalidStates.includes(estadoTrop);
            
            return isValentin && isApril2026 && isValid;
        });

        valentinOps.forEach((op: any) => {
            const id = Number(op.id_lote || op.id);
            if (!isNaN(id) && id > 0) {
                mbLots.set(id, {
                    id: id,
                    tipo: op.Tipo || op.tipo_negocio,
                    fecha: op.fecha_operacion,
                    estado: op.ESTADO,
                    cabezas: Number(op.Cabezas || op.cantidad) || 0
                });
            }
        });

    } catch (e: any) {
        console.error("Error leyendo Metabase:", e.message);
        return;
    }

    // 3. Compare
    const sheetOnly = [];
    const mbOnly = [];
    const inBoth = [];

    let sumSheet = 0;
    for (const [id, lot] of sheetLots.entries()) {
        sumSheet += lot.cabezas;
        if (!mbLots.has(id)) {
            sheetOnly.push(lot);
        } else {
            inBoth.push({ sheet: lot, mb: mbLots.get(id) });
        }
    }

    let sumMb = 0;
    for (const [id, lot] of mbLots.entries()) {
        sumMb += lot.cabezas;
        if (!sheetLots.has(id)) {
            mbOnly.push(lot);
        }
    }

    // 4. Generate Markdown Report
    let md = `# Comparación de Tropas: Valentín Torriglia (Abril 2026)

Este reporte detalla exactamente qué lotes fueron contabilizados en tu **Reporte Mensual Oficina AC** (Google Sheets) frente a lo que devuelve la API de **Metabase (Card 95)**.

## Resumen de Cabezas
* **Google Sheets:** ${sumSheet} cabezas operadas
* **Metabase Q95:** ${sumMb} cabezas operadas
* **Diferencia:** ${sumSheet - sumMb} cabezas

---

### 🚨 Lotes SOLO en Google Sheets (Faltan en Metabase)
Estos lotes están en tu Excel pero Metabase **NO los devuelve** bajo el filtro de Abril 2026 y/o bajo el nombre de Valentín Torriglia.
| ID Lote | Tipo | Fecha | Vendedor | Comprador | Cabezas | Resultado |
|---------|------|-------|----------|-----------|---------|-----------|
`;
    
    sheetOnly.forEach(l => {
        md += `| ${l.id} | ${l.tipo} | ${l.fecha} | ${l.vendedor} | ${l.comprador} | **${l.cabezas}** | ${l.resultado} |\n`;
    });

    md += `\n### ❓ Lotes SOLO en Metabase (No están en tu Sheet)
Estos lotes están impactando en el cálculo del Motor, pero no los incluiste en el Sheet de Abril.
| ID Lote | Tipo | Fecha Op | Estado | Cabezas |
|---------|------|----------|--------|---------|
`;

    mbOnly.forEach(l => {
        md += `| ${l.id} | ${l.tipo} | ${l.fecha} | ${l.estado} | **${l.cabezas}** |\n`;
    });

    md += `\n### ✅ Lotes en AMBOS sistemas
Existen ${inBoth.length} lotes que coinciden en ambos lados.\n`;

    const reportPath = path.join(__dirname, 'artifacts/comparacion_tropas.md');
    fs.mkdirSync(path.join(__dirname, 'artifacts'), { recursive: true });
    fs.writeFileSync(reportPath, md, 'utf8');
    
    console.log("Reporte generado en: artifacts/comparacion_tropas.md");
}

compareLots();
