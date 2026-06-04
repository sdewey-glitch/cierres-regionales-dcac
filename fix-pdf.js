const fs = require('fs');
const { execSync } = require('child_process');

try {
    // 1. Restore file
    execSync('"C:\\Program Files\\Git\\cmd\\git.exe" checkout src/core/pdf-template.ts', { stdio: 'inherit' });
    
    let file = fs.readFileSync('src/core/pdf-template.ts', 'utf8');

    // 2. Fix TypeScript errors (isFrutos duplicate)
    file = file.replace(/const isFrutos = \(data\.modalidad \|\| ''\)\.toLowerCase\(\)\.includes\('frutos'\) \|\| \(data\.modalidad \|\| ''\)\.toLowerCase\(\)\.includes\('kam'\) \|\| \(data\.asociadoComercial \|\| ''\)\.toLowerCase\(\)\.includes\('frutos'\);/, '// duplicate isFrutos');

    // 3. Fix undefined parameters for fmt and fmtNum (Regional and Oficina components breakdown)
    file = file.replace(/fmt\((data\.\w+Reg)\)/g, 'fmt($1 || 0)')
               .replace(/fmt\((data\.\w+Ofi)\)/g, 'fmt($1 || 0)')
               .replace(/fmtNum\((data\.\w+Reg)\)/g, 'fmtNum($1 || 0)')
               .replace(/fmtNum\((data\.\w+Ofi)\)/g, 'fmtNum($1 || 0)');
               
    // 4. Inject TOTAL row
    const targetConceptos = `                    <td style="padding:8px 10px;font-size:11px;font-weight:600;color:\${data.componenteO < 0 ? B.danger : B.text};text-align:right">\${fmt(data.componenteO)}</td>
                </tr>\` : ''}
            </table>`;
            
    const replaceConceptos = `                    <td style="padding:8px 10px;font-size:11px;font-weight:600;color:\${data.componenteO < 0 ? B.danger : B.text};text-align:right">\${fmt(data.componenteO)}</td>
                </tr>\` : ''}
                <tr style="border-top:1px solid \${B.border}">
                    <td style="padding:10px 10px;font-size:10px;font-weight:800;color:\${B.dark}">TOTAL</td>
                    <td style="padding:10px 10px;font-size:11px;font-weight:800;color:\${B.dark};text-align:right">\${fmt(data.cierreReal)}</td>
                </tr>
            </table>`;
            
    if (file.includes(targetConceptos)) {
        file = file.replace(targetConceptos, replaceConceptos);
        console.log("Injection of TOTAL successful!");
    } else {
        console.error("Could not find the target to inject TOTAL");
    }

    fs.writeFileSync('src/core/pdf-template.ts', file, 'utf8');
    console.log("Fixes applied successfully.");
} catch (e) {
    console.error("Error:", e);
}
