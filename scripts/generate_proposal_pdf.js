const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const MD_PATH = path.join(__dirname, 'docs', 'propuesta_red_regional.md');
const OUT_PATH = path.join(__dirname, 'docs', 'Propuesta_Metricas_Red_Regional.pdf');

async function main() {
    let md = fs.readFileSync(MD_PATH, 'utf8');

    // Remove mermaid blocks if any (replaced by text references)
    md = md.replace(/```mermaid[\s\S]*?```/g, '*(Ver diagrama en versión digital)*');

    let htmlBody = marked.parse(md);

    // Add automatic IDs to headings for internal links
    htmlBody = htmlBody.replace(/<h([2-3])>(.*?)<\/h\1>/g, (match, level, text) => {
        const id = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `<h${level} id="${id}">${text}</h${level}>`;
    });

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { margin: 20mm 18mm 20mm 18mm; size: A4; }
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
table { width: 100%; border-collapse: collapse; margin: 8pt 0 16pt 0; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #1a365d; color: white; font-weight: 600; padding: 6pt 8pt; text-align: left; }
td { padding: 5pt 8pt; border-bottom: 1px solid #e2e8f0; }
tr:nth-child(even) { background: #f7fafc; }
code { background: #edf2f7; padding: 2pt 4pt; border-radius: 4pt; font-size: 9pt; font-family: monospace; color: #e53e3e; }
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
.index-container { background: #f7fafc; border: 1px solid #e2e8f0; padding: 20pt; border-radius: 8px; margin-bottom: 20pt; }
</style>
</head>
<body>
<div class="cover">
  <div class="logo">d<span>CaC</span></div>
  <div class="subtitle" style="font-weight:700;color:#2b6cb0;margin-top:0;">deCampoacampo</div>
  <div class="line"></div>
  <h1>Propuesta Ejecutiva — Métricas de Red Regional</h1>
  <div class="subtitle">Módulo de Análisis y Visualización de la Red de Asociados Comerciales</div>
  <div class="meta">
    <p><strong>Versión 1.0</strong> — Mayo 2026</p>
    <p><strong>Audiencia:</strong> Dirección Comercial · Gerencia de Operaciones</p>
    <p><strong>Clasificación:</strong> Confidencial — Uso Interno</p>
  </div>
</div>
<div class="content">
${htmlBody}
</div>
</body>
</html>`;

    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for Google Fonts
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 2000));

    await page.pdf({
        path: OUT_PATH,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-family:Inter,sans-serif;font-size:7pt;color:#999;width:100%;text-align:right;padding-right:18mm;">deCampoacampo — Métricas Red Regional</div>',
        footerTemplate: '<div style="font-family:Inter,sans-serif;font-size:7pt;color:#999;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    await browser.close();
    console.log('PDF generado:', OUT_PATH);
}

main().catch(e => { console.error(e); process.exit(1); });
