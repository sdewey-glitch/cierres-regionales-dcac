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
    const lines = textData.text.split('\n');
    console.log("Lines with key metrics:");
    for (const line of lines) {
        if (/ajuste|retro|facturar|cierre|personal|regional|oficina|sueldo|total/i.test(line)) {
            console.log(`> ${line.trim()}`);
        }
    }
}

main().catch(console.error);
