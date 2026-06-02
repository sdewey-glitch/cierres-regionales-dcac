const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

const tableContent = `
### 5.7 Categorías y Mínimos Garantizados

Cada modelo se cruza con la **Categoría** (1 a 10) del comercial para asignar el valor exacto de su cobertura. A continuación se detallan los valores vigentes (referencia Abril 2026):

| Categoría | Nomenclatura Roster | Mínimo Garantizado |
|:---:|---------------------|-------------------:|
| **1** | Top AC | **$3.851.170** |
| **2** | Corporate | **$3.851.170** |
| **3** | General | **$1.925.585** |
| **4** | Acuerdo | **$2.160.000** |
| **5** | Híbrido | **$1.600.000** |
| **6** | Sin Mínimo | **$0** |
| **7** | Operario 1 | **$1.500.000** |
| **8** | Operario 2 | **$1.475.000** |
| **9** | Operario 3 | **$1.450.000** |
| **10**| Operario 4 | **$1.300.000** |

> **Nota:** Estos montos se actualizan dinámicamente desde la planilla central y actúan como piso remunerativo. Si el comercial no cubre su costo, la empresa asume la diferencia asegurándole este valor de bolsillo (previo a deducciones de gastos).

---
`;

if (md.includes('### 5.6 Modelo Operario de Carga')) {
    md = md.replace('### 5.6 Modelo Operario de Carga\nAplica al personal de logística y carga en el campo.\n- **Componentes que cobra:** Comisión fija y estática del **10%** sobre el resultado de la operación (no usan curva logarítmica). No acceden al Componente de Oficina.\n- **Riesgo:** Cubiertos por un Mínimo Garantizado específico para su rol.\n\n---', '### 5.6 Modelo Operario de Carga\nAplica al personal de logística y carga en el campo.\n- **Componentes que cobra:** Comisión fija y estática del **10%** sobre el resultado de la operación (no usan curva logarítmica). No acceden al Componente de Oficina.\n- **Riesgo:** Cubiertos por un Mínimo Garantizado específico para su rol.\n\n' + tableContent);
}

fs.writeFileSync(MD_PATH, md);
console.log('Minimums table added.');
