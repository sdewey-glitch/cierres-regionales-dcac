const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `| **Comp. Regional** | Pool oficina: 8.651 cab · $267,6M · Esc. 5,6% · Tajada 39,9% | $5.942.424 |
| **Comp. Oficina** | Sin directas institucionales en el mes | $0 |
| **Sueldo Bruto** | | **$25.373.353** |
| **(+) Reintegro** | 1.586 km × $465/km (SUV) | +$737.490 |
| **(−) Mendel** | Gastos tarjeta corporativa | −$874.102 |
| **= A Facturar** | | **$25.203.091** |

> Supera ampliamente el mínimo → accede a Regional y Oficina.`;

const replacementStr = `| **Comp. Regional** | Pool oficina: 8.651 cab · $267,6M · Esc. 5,6% · Tajada 39,9% | $5.942.424 |
| **Comp. Oficina** | Participación directas institucionales | $1.200.000 |
| **Sueldo Bruto (= A FACTURAR)** | | **$26.573.353** |
| **(+) Reintegro** | Dato posterior: 1.586 km × $465/km (SUV) | $737.490 |
| **(−) Mendel** | Dato posterior: Gastos tarjeta corporativa | $874.102 |

> Supera ampliamente el mínimo → accede a Regional y Oficina. Los gastos se rinden por fuera de la factura.`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Example A in documento_clevel_cierres.md');
