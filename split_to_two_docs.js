const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
const md = fs.readFileSync(MD_PATH, 'utf8');

// The goal is to separate the content into EXECUTIVE (business/HR) and TECHNICAL (devs/data)
// Let's extract the sections by their headers.

function extractSection(text, titleRegex) {
    const match = text.match(new RegExp(`(## \\d+\\.\\s+${titleRegex}[\\s\\S]*?)(?=## \\d+\\.|$)`));
    return match ? match[1] : '';
}

const resumen = extractSection(md, 'Resumen Ejecutivo');
const acuerdos = extractSection(md, 'Acuerdos y Modelos Comerciales');
const mecanica = extractSection(md, 'Mecánica de Liquidación.*');
const gastos = extractSection(md, 'Gastos y Deducciones');
const ejemplos = extractSection(md, 'Ejemplos Reales.*');
const reporte = extractSection(md, 'Reporte Individual.*');
const metricas = extractSection(md, 'Métricas Operativas.*');
const antesAhora = extractSection(md, 'Antes vs\\. Ahora');
const glosario = extractSection(md, 'Glosario');
const hojaRuta = extractSection(md, 'Hoja de Ruta.*');

const arquitectura = extractSection(md, 'Arquitectura del Sistema');
const contrato = extractSection(md, 'Contrato de Datos.*');
const flujo = extractSection(md, 'Flujo del Cierre Mensual');
const arquiDatos = extractSection(md, 'Arquitectura de Datos y Procesamiento.*');
const retroactivo = extractSection(md, 'Motor de Ajustes Retroactivos');

// Clean up numbering and build Executive Doc
const buildIndex = (content) => {
    let indexMd = "## Índice\n\n";
    const matches = [...content.matchAll(/^## (\d+)\.\s+(.*?)$/gm)];
    for (const match of matches) {
        const counter = match[1];
        const title = match[2].trim();
        const id = `${counter}-${title}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        indexMd += `${counter}. [${title}](#${id})\n`;
    }
    return `${indexMd}\n<div style="page-break-after: always;"></div>\n\n${content}`;
};

const renumber = (content) => {
    let counter = 1;
    let newContent = content.replace(/^## \d+\.\s+(.*?)$/gm, (match, p1) => {
        return `## ${counter++}. ${p1}`;
    });
    return newContent;
};

// --- EXECUTIVE DOC ---
let execContent = [resumen, acuerdos, mecanica, gastos, ejemplos, reporte, metricas, antesAhora, glosario].join('\n---\n\n');
execContent = renumber(execContent);
const finalExec = buildIndex(execContent);
const execPath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'manual_ejecutivo.md');
fs.writeFileSync(execPath, finalExec);

// --- TECHNICAL DOC ---
let techContent = [arquitectura, contrato, flujo, arquiDatos, retroactivo, hojaRuta].join('\n---\n\n');
techContent = renumber(techContent);
const finalTech = buildIndex(techContent);
const techPath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documentacion_tecnica.md');
fs.writeFileSync(techPath, finalTech);

// Modify generate_pdf.js to handle both files
const genPath = path.join(__dirname, 'generate_pdf.js');
let genCode = fs.readFileSync(genPath, 'utf8');

// We will change it to compile two separate PDFs
const newGenCode = genCode
    .replace("const inputPath = path.join(__dirname, '../brain/57477c14-f997-40d0-a1db-8688bc845850/documento_clevel_cierres.md');", 
             `const execInput = path.join(__dirname, '../brain/57477c14-f997-40d0-a1db-8688bc845850/manual_ejecutivo.md');
              const techInput = path.join(__dirname, '../brain/57477c14-f997-40d0-a1db-8688bc845850/documentacion_tecnica.md');`)
    .replace("const outputPath = path.join(__dirname, 'docs/Cierres_Regionales_deCampoacampo.pdf');",
             `const execOutput = path.join(__dirname, 'docs/Manual_Ejecutivo_deCampoacampo.pdf');
              const techOutput = path.join(__dirname, 'docs/Documentacion_Tecnica_deCampoacampo.pdf');`)
    .replace(/const markdown = fs\.readFileSync\(inputPath, 'utf8'\);/g, '')
    .replace(/const htmlContent = marked\.parse\(markdown\);/g, '');

const runFunctionBody = `
    const browser = await puppeteer.launch({ headless: true });
    
    async function generate(input, output, title) {
        const markdown = fs.readFileSync(input, 'utf8');
        const htmlContent = marked.parse(markdown);
        const page = await browser.newPage();
        
        let localHtml = \`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>\${title}</title>
                \${styleTag}
            </head>
            <body>
                <div class="cover-page">
                    <img src="https://decampoacampo.com/wp-content/uploads/2020/09/Logo-de-campo-a-campo-1.png" class="logo">
                    <div class="title">\${title}</div>
                    <div class="subtitle">Sistema de Liquidaciones Regionales</div>
                    <div class="date">Mayo 2026</div>
                </div>
                <div class="content">
                    \${htmlContent}
                </div>
            </body>
            </html>
        \`;
        
        const dataFlowImgPath = path.join(__dirname, '../brain/57477c14-f997-40d0-a1db-8688bc845850/data_flow_diagram_1778080856527.png');
        if (fs.existsSync(dataFlowImgPath)) {
            const dataFlowImgBase64 = fs.readFileSync(dataFlowImgPath, 'base64');
            localHtml = localHtml.replace(
                /C:\\\\Users\\\\admin\\\\.gemini\\\\antigravity\\\\brain\\\\57477c14-f997-40d0-a1db-8688bc845850\\\\data_flow_diagram_1778080856527.png/g,
                \`data:image/png;base64,\${dataFlowImgBase64}\`
            );
        }

        const flowImgPath = path.join(__dirname, '../brain/57477c14-f997-40d0-a1db-8688bc845850/flow_diagram_1778085929245.png');
        if (fs.existsSync(flowImgPath)) {
            const flowImgBase64 = fs.readFileSync(flowImgPath, 'base64');
            localHtml = localHtml.replace(
                /C:\\\\Users\\\\admin\\\\.gemini\\\\antigravity\\\\brain\\\\57477c14-f997-40d0-a1db-8688bc845850\\\\flow_diagram_1778085929245.png/g,
                \`data:image/png;base64,\${flowImgBase64}\`
            );
        }

        await page.setContent(localHtml, { waitUntil: 'networkidle0' });
        
        await page.pdf({
            path: output,
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
        });
        
        console.log(\`PDF generado: \${output}\`);
        await page.close();
    }

    await generate(execInput, execOutput, "Manual Ejecutivo y Comercial");
    await generate(techInput, techOutput, "Documentación Técnica del Motor");

    await browser.close();
`;

// Inject this into generate_pdf.js
const regexRun = /console\.log\('Launching browser\.\.\.'\);[\s\S]*?await browser\.close\(\);\n}/;
if (regexRun.test(newGenCode)) {
    fs.writeFileSync(genPath, newGenCode.replace(regexRun, runFunctionBody + "\n}"));
    console.log("Documents split successfully and generate_pdf.js updated!");
} else {
    console.log("Could not find replacement block in generate_pdf.js");
}
