const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
const IMG_DIR = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850');

const md = fs.readFileSync(MD_PATH, 'utf8');

function extractSection(text, titleRegex) {
    const match = text.match(new RegExp(`(## \\d+\\.\\s+${titleRegex}[\\s\\S]*?)(?=## \\d+\\.|$)`));
    return match ? match[1].trim() : '';
}

const s1 = `## Resumen Ejecutivo e Introducción

Este Manual Ejecutivo y Comercial es el documento formal de presentación del esquema de liquidaciones regionales para la Dirección y la Gerencia de deCampoacampo. Su propósito es detallar de manera simple y clara cómo se compone la remuneración variable de nuestra red de ventas y cómo se alinean los incentivos con los objetivos financieros de la empresa.

Para optimizar el riesgo laboral y comercial, la empresa ha estructurado a la fuerza de ventas en cinco **Modelos Contractuales**, cada uno con reglas específicas sobre sus Mínimos Garantizados y su acceso a diferentes componentes variables. Estos modelos son:

- **Modelo Completo:** Para agentes integrales y exclusivos. Cuentan con un salario mínimo asegurado alto y acceso total a comisiones personales, así como participación en bolsas regionales y de la oficina.
- **Modelo Híbrido:** Para perfiles gerenciales zonales o "City Managers". Poseen un salario mínimo asegurado intermedio y comisiones personales exclusivas, sin participar de bolsas compartidas.
- **Modelo Simple:** Para comerciales con diferentes mínimos garantizados. Su esquema variable se compone únicamente de su comisión personal pura, sin acceso a bolsas regionales ni de oficina.
- **Modelo Variable (Representantes):** Para agentes libres con cartera propia. No tienen un mínimo garantizado de base ($0) y su remuneración es 100% variable sobre lo que producen personalmente.
- **Modelo Operario de Carga:** Para el personal logístico de campo (pesadores y revisadores). Tienen un salario base asegurado y un porcentaje fijo sobre la operación técnica.
- **Modelo Corporate (KAM):** Para cuentas clave institucionales B2B. Operan con reglas customizadas dictadas directamente por la Dirección y cuentan con su propio esquema de ingresos asegurados.

### Composición de los Variables
La remuneración variable de los agentes que califican se nutre de tres fuentes principales:
1. **Componente Personal:** Remuneración directa y proporcional al volumen que origina el comercial. Se rige por una escala logarítmica que premia el alto volumen.
2. **Componente Regional (Bolsa):** Un premio territorial originado por la actividad global de la provincia, repartido entre los agentes de la zona proporcionalmente a la cantidad de clientes (CUITs) distintos que aportaron.
3. **Componente Oficina:** Un dividendo institucional derivado de los negocios que caen directamente a la sucursal, repartido en partes iguales entre los miembros del Modelo Completo.

### Indicador Clave: Bonificación Oculta General
El parámetro financiero rector de esta política es la **Bonificación Oculta**, que mide el costo comercial estructural frente al volumen operado. El objetivo directivo es mantener este ratio en **≈ 0,5%** del volumen total del negocio.`;
const s2 = extractSection(md, 'Arquitectura del Sistema');
const s3 = extractSection(md, 'Contrato de Datos.*');
const s4 = extractSection(md, 'Flujo del Cierre Mensual');
const s_mec = fs.readFileSync(path.join(__dirname, 'docs', '02_mecanica_de_liquidacion.md'), 'utf8');
const s_mod = fs.readFileSync(path.join(__dirname, 'docs', '03_modelos_contractuales.md'), 'utf8');
const s_esc = fs.readFileSync(path.join(__dirname, 'docs', '04_escalas_y_curvas.md'), 'utf8');
const s7 = extractSection(md, 'Arquitectura de Datos y Procesamiento.*');
const s8 = fs.readFileSync(path.join(__dirname, 'docs', '08_gastos_y_deducciones.md'), 'utf8');
const s9 = fs.readFileSync(path.join(__dirname, 'docs', '09_historico_minimos.md'), 'utf8');
const s_ajustes = fs.readFileSync(path.join(__dirname, 'docs', '10_ajustes_retroactivos.md'), 'utf8');
const s10 = extractSection(md, 'Ejemplos Reales.*');
const s11 = extractSection(md, 'Reporte Individual.*');
const s12 = extractSection(md, 'Métricas Operativas.*');
const s13 = extractSection(md, 'Antes vs\\. Ahora');
const s14 = extractSection(md, 'Glosario');
const s15 = extractSection(md, 'Hoja de Ruta.*');

const s_webapp_exec = `
## Herramientas Digitales: Web App y Simulador

> [!TIP]
> **Acceso a la Web App y Simulador de Cierres**  
> Podés ingresar a la consola operativa en vivo haciendo clic en el siguiente enlace:
> **[▶ Ingresar al Simulador deCampoacampo](http://localhost:5174/)**

El sistema cuenta con una plataforma web interactiva diseñada para la Dirección y la red comercial:

### Dashboard de Cierres Mensuales
Una interfaz gráfica donde se publican los cierres oficiales. Cada comercial puede visualizar su recibo de sueldo interactivo, desglosado por:
- Operaciones realizadas (volumen y rentabilidad).
- Composición de sus premios (Personal, Regional, Oficina).
- Resumen de deducciones (Mendel, KMS, Amortizaciones).

### Simulador Operativo
Permite a la Dirección Administrativa correr escenarios (ej. "¿Qué pasa si modificamos la curva?") o pre-visualizar el cierre en curso antes de congelarlo a fin de mes. Al estar conectado directamente al motor, el simulador refleja en tiempo real el impacto de cualquier variable operativa.
`;

const s_webapp_tech = `
## Arquitectura Frontend: Web App y Simulador

La plataforma de visualización está construida como una Single Page Application (SPA) orientada a consumir el motor de cálculo mediante una API REST.

### Stack Tecnológico
- **Frontend:** React + Vite + Tailwind CSS.
- **Backend API:** Node.js (Express) ejecutándose en \`src/server.ts\`.

### Endpoints Principales
- \`GET /api/snapshots\`: Lista y sirve los cierres históricos inmutables almacenados en disco (JSON).
- \`POST /api/generate\`: Gatilla el motor \`engine.ts\` calculando comisiones al vuelo y devolviendo la interfaz \`CommercialResult[]\`. Este endpoint es el núcleo del **Simulador en tiempo real**.
- \`POST /api/roster\`: Interfaz bidireccional para que la web app actualice las configuraciones contractuales directamente en Google Sheets.
`;

// --- FORMATTING HELPERS ---
const buildIndex = (content) => {
    let indexMd = "## Índice\n\n";
    const matches = [...content.matchAll(/^(#{2,3})\s+(.*?)$/gm)];
    for (const match of matches) {
        const level = match[1].length;
        let title = match[2].trim();
        
        // Ensure we handle the "X. Title" format that might have been prepended by renumber
        if (level === 2 && /^\d+\.\s+/.test(title)) {
            // Already has number, let it be. But the ID generator removes dots.
        }

        const id = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        if (title === 'Índice') continue;
        
        if (level === 2) {
            indexMd += `- [${title}](#${id})\n`;
        } else if (level === 3) {
            indexMd += `  - [${title}](#${id})\n`;
        }
    }
    return `${indexMd}\n\n<div style="page-break-after: always; break-after: page;"></div>\n\n${content}`;
};

const renumber = (content) => {
    let counter = 1;
    // Match any ## heading, ignoring any existing numbers to renumber cleanly
    return content.replace(/^##\s+(?:\d+\.\s+)?(.*?)$/gm, (match, p1) => {
        // Skip adding numbers to Índice if it somehow gets caught
        if (p1.trim().toLowerCase() === 'índice') return match;
        return `## ${counter++}. ${p1}`;
    });
};

// --- BUILD EXECUTIVE DOC ---
let execContent = [s1, s_mec, s_mod, s_esc, s8, s9, s_ajustes, s_webapp_exec, s10, s14].filter(Boolean).join('\n\n<div style="page-break-after: always; break-after: page;"></div>\n\n');
execContent = renumber(execContent);
const finalExec = buildIndex(execContent);
const execPath = path.join(IMG_DIR, 'manual_ejecutivo.md');
fs.writeFileSync(execPath, finalExec);

// --- BUILD TECHNICAL DOC ---
let techContent = [s2, s3, s4, s7, s9, s_webapp_tech, s14, s15].filter(Boolean).join('\n\n<div style="page-break-after: always; break-after: page;"></div>\n\n');
techContent = renumber(techContent);
const finalTech = buildIndex(techContent);
const techPath = path.join(IMG_DIR, 'documentacion_tecnica.md');
fs.writeFileSync(techPath, finalTech);

async function generatePDF(mdContent, outputPath, title, subtitle) {
    let mdProc = mdContent;
    
    // Replace images with base64
    mdProc = mdProc.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        if (src.startsWith('http') || src.startsWith('data:')) return match;
        
        let resolvedPath = path.isAbsolute(src) ? src : path.resolve(path.join(__dirname, 'docs'), src);
        if (!fs.existsSync(resolvedPath) && !path.isAbsolute(src)) {
            resolvedPath = path.resolve(IMG_DIR, src);
        }
        
        try {
            const imgBuf = fs.readFileSync(resolvedPath);
            const ext = path.extname(resolvedPath).slice(1) || 'png';
            const b64 = imgBuf.toString('base64');
            return `![${alt}](data:image/${ext};base64,${b64})`;
        } catch (e) {
            return `<!-- image not found: ${src} -->`;
        }
    });

    let htmlBody = marked.parse(mdProc);
    htmlBody = htmlBody.replace(/<h([2-3])[^>]*>(.*?)<\/h\1>/g, (match, level, text) => {
        // Strip HTML tags from text to create clean ID
        const cleanText = text.replace(/<[^>]+>/g, '').trim();
        const id = cleanText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `<h${level} id="${id}">${text}</h${level}>`;
    });
    
    // Evitar que los bloques de Casos y Modelos se partan
    htmlBody = htmlBody.replace(/(<h[34][^>]*>(?:Caso|Modelo).*?)(?=<h[234]|$)/gis, '<div style="page-break-inside: avoid;">\n$1\n</div>');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { margin: 20mm 18mm 20mm 18mm; size: 210mm 297mm; }
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; font-size: 10.5pt; line-height: 1.6; color: #2d3748; margin: 0; padding: 0; }
a { color: #2b6cb0; text-decoration: none; font-weight: 500; }
a:hover { text-decoration: underline; }
h1 { font-size: 22pt; font-weight: 700; color: #1a365d; margin: 0 0 4pt 0; border-bottom: 3px solid #2b6cb0; padding-bottom: 8pt; }
h2 { font-size: 15pt; font-weight: 600; color: #1a365d; margin: 24pt 0 8pt 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4pt; page-break-after: avoid; }
h3 { font-size: 12pt; font-weight: 600; color: #2b6cb0; margin: 16pt 0 6pt 0; page-break-after: avoid; }
h4 { font-size: 10.5pt; font-weight: 600; color: #2d3748; margin: 12pt 0 4pt 0; }
p { margin: 0 0 8pt 0; text-align: justify; }
strong { color: #1a365d; font-weight: 600; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 16pt 0; }
table { width: 100%; border-collapse: collapse; margin: 12pt 0 16pt 0; font-size: 9.5pt; page-break-inside: auto; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
thead { display: table-header-group; }
tbody { display: table-row-group; }
tr { page-break-inside: avoid; page-break-after: auto; }
th { background: #1a365d; color: #ffffff; font-weight: 600; padding: 8pt 10pt; text-align: left; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; border-bottom: 2px solid #2b6cb0; }
td { padding: 7pt 10pt; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; color: #334155; }
tr:nth-child(even) { background: #f8fafc; }
code { background: #edf2f7; padding: 2pt 5pt; border-radius: 4px; font-size: 8.5pt; font-family: monospace; color: #c53030; }
pre { background: #2d3748; color: #e2e8f0; padding: 10pt 14pt; border-radius: 6pt; font-size: 9pt; overflow-x: auto; margin: 8pt 0; page-break-inside: avoid; }
pre code { background: none; color: inherit; padding: 0; }
blockquote { border-left: 4px solid #ecc94b; background: #fffff0; padding: 8pt 12pt; margin: 12pt 0; font-style: italic; color: #4a5568; }
img { max-width: 80%; height: auto; margin: 16pt auto; display: block; border-radius: 6pt; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
ul, ol { margin: 4pt 0 12pt 0; padding-left: 20pt; }
li { margin-bottom: 4pt; }
.cover { text-align: center; padding: 120pt 40pt 60pt; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; }
.cover .logo { font-size: 48pt; font-weight: 700; color: #1a365d; letter-spacing: -2px; margin-bottom: 8px; }
.cover .logo span { font-weight: 300; }
.cover h1 { font-size: 26pt; border: none; color: #1a365d; margin-top: 20pt; text-align: center; }
.cover .subtitle { font-size: 14pt; color: #4a5568; margin-top: 12pt; font-weight: 400; }
.cover .meta { font-size: 10.5pt; color: #718096; margin-top: 50pt; text-align: center; background: #f7fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; }
.cover .line { width: 100px; height: 4px; background: #2b6cb0; margin: 30pt auto; border-radius: 2px; }
</style>
</head>
<body>
<div class="cover">
  <div class="logo">d<span>CaC</span></div>
  <div class="subtitle" style="font-weight:700;color:#2b6cb0;margin-top:0;">deCampoacampo</div>
  <div class="line"></div>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  <div class="meta">
    <p><strong>Versión 4.0</strong> — Mayo 2026</p>
    <p><strong>Última actualización:</strong> ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    <p><strong>Clasificación:</strong> Confidencial — Uso Interno</p>
  </div>
</div>
<div class="content">
${htmlBody}
</div>
</body>
</html>`;

    console.log(`Lanzando Puppeteer para ${title}...`);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 2000));

    await page.pdf({
        path: outputPath,
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-family:sans-serif;font-size:7.5pt;font-weight:bold;color:#a0aec0;width:100%;display:flex;justify-content:space-between;padding:0 18mm;"><span>${title}</span><span>deCampoacampo</span></div>`,
        footerTemplate: '<div style="font-family:sans-serif;font-size:7pt;color:#a0aec0;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    await browser.close();
    console.log('PDF generado:', outputPath);
}

async function run() {
    await generatePDF(finalExec, path.join(__dirname, 'docs', 'Manual_Ejecutivo_Comercial.pdf'), 'Manual Ejecutivo y Comercial', 'Esquema de Liquidaciones y Acuerdos Comerciales');
    await generatePDF(finalTech, path.join(__dirname, 'docs', 'Documentacion_Tecnica_Motor.pdf'), 'Documentación Técnica del Motor', 'Arquitectura de Datos y Procesamiento');
}

run().catch(console.error);
