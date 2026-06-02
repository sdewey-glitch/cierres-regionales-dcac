const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let content = fs.readFileSync(filePath, 'utf8');

const targetContent = `### Ejemplo F — Operario de carga (Cat. 9, Fijo)

| Paso | Concepto | Valor |
|------|----------|------:|
| **Datos** | Tropas: 0 · Cabezas: 0 | |
| **Comp. Personal** | Escala fija 10% × $0 | $0 |
| | Mínimo Categoría 9 | $1.450.000 |
| **Sueldo Bruto** | Cobra el mínimo fijo | **$1.450.000** |

> Operario sin ventas propias → cobra el mínimo de su categoría.`;

const replacementContent = `### Ejemplo F — Operario de carga (Cat. 9, Fijo)

| Paso | Concepto | Valor |
|------|----------|------:|
| **Datos** | Tropas: 12 · Cabezas: 500 | |
| | Resultado Ajustado | $2.000.000 |
| **Comp. Personal** | Escala fija 10% × $2.000.000 | $200.000 |
| | Mínimo Categoría 9 | $1.450.000 |
| **Sueldo Bruto** | El 10% no cubre su mínimo → la empresa paga el piso | **$1.450.000** |

> Su productividad variable fue de $200k, pero al estar blindado, cobra el Mínimo Garantizado.

### Ejemplo G — Corporate (Cuentas Clave B2B)

| Paso | Concepto | Valor |
|------|----------|------:|
| **Datos** | Tropas Institucionales: 18 · Cabezas: 1.086 | |
| | Resultado Ajustado | $30.582.524 |
| **Comp. Personal** | Escala Directiva (Customizada a 20,6%) | $6.300.000 |
| | Mínimo Categoría 2 (Corporate) | $3.851.170 |
| | → Fijo | $3.851.170 |
| | → Variable (diferencia) | $2.448.830 |
| **Comp. Regional/Oficina** | **0%** (Excepción Contractual B2B) | $0 |
| **Sueldo Bruto** | | **$6.300.000** |

> Supera su mínimo, pero por ser Corporate, no participa de premios territoriales.`;

content = content.replace(targetContent, replacementContent);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done replacement in documento_clevel_cierres.md');
