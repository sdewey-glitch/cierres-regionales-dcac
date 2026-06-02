const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

// 1. Remove the cover
md = md.replace(/<div class="cover">[\s\S]*?<\/div>/, '').trim();

// 2. Remove the old Index
md = md.replace(/## Índice[\s\S]*?(<div style="page-break-after: always;"><\/div>|## 1\.)/, '').trim();
// Clean any leading <div page-break...>
md = md.replace(/^<div style="page-break-after: always;"><\/div>/, '').trim();

// 3. Split into sections
const parts = md.split(/^## /m);
const intro = parts.shift(); // any stuff before the first ## 

const sections = {};
for (const part of parts) {
    const titleMatch = part.match(/^(\d+)\.\s+(.*?)$/m);
    if (!titleMatch) {
        // Find title without number
        const titleMatch2 = part.match(/^(.*?)$/m);
        if (titleMatch2) {
            sections[titleMatch2[1].trim()] = part;
        } else {
            console.log("No title found for part", part.substring(0, 50));
        }
    } else {
        sections[titleMatch[2].trim()] = part.substring(titleMatch[0].length).trim();
    }
}

// 4. Define the new chronological order
const order = [
    "Resumen Ejecutivo",
    "Arquitectura del Sistema",
    "Contrato de Datos — Especificación de Inputs",
    "Flujo del Cierre Mensual",
    "Estructura Organizacional",
    "Modelo de Cálculo de Comisiones",
    "Gastos y Deducciones",
    "Motor de Ajustes Retroactivos",
    "Ejemplos Reales de Liquidación — Abril 2026",
    "Reporte Individual por Comercial — Abril 2026",
    "Métricas Operativas — Abril 2026",
    "Antes vs. Ahora",
    "Glosario",
    "Hoja de Ruta — Qué Podemos Construir"
];

let newMd = "";
let indexMd = "## Índice\n\n";

let counter = 1;
for (const title of order) {
    let content = sections[title];
    if (!content) {
        // Try finding by partial match
        const key = Object.keys(sections).find(k => k.includes(title) || title.includes(k));
        if (key) content = sections[key];
    }
    
    if (content) {
        const id = `${counter}-${title}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        indexMd += `${counter}. [${title}](#${id})\n`;
        newMd += `## ${counter}. ${title}\n\n${content}\n\n---\n\n`;
        counter++;
    } else {
        console.log("Section not found:", title);
        console.log("Available:", Object.keys(sections));
    }
}

// Clean up ending ---
newMd = newMd.replace(/---\n\n$/, '');

const finalMd = `${indexMd}\n<div style="page-break-after: always;"></div>\n\n${newMd}`;

fs.writeFileSync(MD_PATH, finalMd);
console.log('Markdown reorganized.');
