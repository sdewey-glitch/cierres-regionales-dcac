import { listDriveFiles } from './src/api/drive';
import { downloadDriveFile } from './src/api/drive';
const pdf = require('pdf-parse');

async function main() {
    const files = await listDriveFiles('1aMnDrG4L4BEqKi0f_m__tsreeku7_cey'); // Cierre Abril 2026 folder
    const v = files.find(f => f.name.toLowerCase().includes('valentin'));
    if (!v) return;
    const buffer = await downloadDriveFile(v.id);
    const p = new pdf.PDFParse({ data: buffer });
    const textData = await p.getText();
    console.log("PDF TEXT (first 3000 chars):");
    console.log(textData.text.substring(0, 3000));
}

main().catch(console.error);
