const fs = require('fs');
let file = fs.readFileSync('src/core/pdf-template.ts', 'utf8');

const target = `</tr>\` : ''}
                </table>`;

const replacement = `</tr>\` : ''}
                <tr style="border-top:1px solid \${B.border}">
                    <td style="padding:10px 10px;font-size:10px;font-weight:800;color:\${B.dark}">TOTAL</td>
                    <td style="padding:10px 10px;font-size:11px;font-weight:800;color:\${B.dark};text-align:right">\${fmt(data.cierreReal)}</td>
                </tr>
                </table>`;

file = file.replace(target, replacement);
fs.writeFileSync('src/core/pdf-template.ts', file, 'utf8');
console.log('Fila TOTAL inyectada correctamente');
