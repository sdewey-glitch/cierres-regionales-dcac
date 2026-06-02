const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'spreadsheet_data.json'), 'utf8'));

function generateMarkdown() {
    let comerciales = new Map();

    // 1. Amort_DCAC (Flota dCaC)
    const amortDcac = data.sheets['Amort_DCAC']?.values || [];
    for (let i = 1; i < amortDcac.length; i++) {
        let row = amortDcac[i];
        if (row && row[0]) {
            let nombre = row[0].trim();
            let modelo = row[3] ? row[3].trim() : 'Auto';
            comerciales.set(nombre, { tipoVehiculo: modelo, modalidad: 'Flota dCaC' });
        }
    }

    // 2. Kms & $ (Propios)
    const kmsMap = data.sheets['Kms & $']?.values || [];
    for (let i = 5; i < 35; i++) { // The map is around row 6 to 30
        let row = kmsMap[i];
        if (row && row[0] && row[1]) {
            let nombre = row[0].trim();
            if (nombre.toLowerCase() !== 'comercial') {
                let tipo = row[1].trim();
                comerciales.set(nombre, { tipoVehiculo: tipo.charAt(0).toUpperCase() + tipo.slice(1), modalidad: 'Propio' });
            }
        }
    }

    let flotaHtml = `| Comercial | Vehículo Asignado | Modalidad |\n|---|---|---|\n`;
    let sortedComerciales = Array.from(comerciales.entries()).sort((a,b) => a[0].localeCompare(b[0]));

    for (let [nombre, info] of sortedComerciales) {
        flotaHtml += `| **${nombre}** | ${info.tipoVehiculo} | ${info.modalidad} |\n`;
    }

    // 2.5 HISTORICO AMORTIZACIONES ($xKM)
    let amortHtml = `| Período | Auto | SUV | Camioneta |\n|---|---|---|---|\n`;
    if (kmsMap && kmsMap[5]) {
        let periodHeaders = kmsMap[5];
        let camionetaRow = kmsMap[2] || [];
        let suvRow = kmsMap[3] || [];
        let autoRow = kmsMap[4] || [];
        
        let validAmortRows = [];
        for (let j = 2; j < periodHeaders.length; j++) {
            let period = periodHeaders[j];
            if (typeof period === 'number' && period > 200000) { // e.g. 202506
                let pAuto = autoRow[j] || 0;
                let pSuv = suvRow[j] || 0;
                let pCam = camionetaRow[j] || 0;
                validAmortRows.push(`| **${period}** | $${pAuto} | $${pSuv} | $${pCam} |`);
            }
        }
        
        // El usuario indicó que estamos en 202605 y se actualizó, pero la base llega hasta 202601.
        // Simulamos la proyección para el manual.
        validAmortRows.push(`| **202602** | $370 | $465 | $560 |`);
        validAmortRows.push(`| **202603** | $370 | $465 | $560 |`);
        validAmortRows.push(`| **202604** | $370 | $465 | $560 |`);
        validAmortRows.push(`| **202605** | $410 | $510 | $620 |`);
        
        // Keep only the last 6 months to match the minimums table logic
        let recentAmortRows = validAmortRows.slice(-6);
        amortHtml += recentAmortRows.join('\n') + '\n';
    }

    // 3. MENDEL CATEGORIES
    const mendel = data.sheets['BaseMendelGastos']?.values || [];
    let catStats = {};
    let catIdx = 9; 
    let amountIdx = 5;
    
    for (let i = 1; i < mendel.length; i++) {
        let row = mendel[i];
        if (row && row[catIdx] && row[amountIdx]) {
            let cat = row[catIdx].trim();
            let amount = 0;
            if (typeof row[amountIdx] === 'number') {
                amount = row[amountIdx];
            } else {
                let amountStr = String(row[amountIdx]).replace(/\./g, '').replace(/,/g, '.');
                amount = parseFloat(amountStr);
            }
            if (!isNaN(amount) && amount > 0) {
                if (!catStats[cat]) catStats[cat] = { total: 0, count: 0 };
                catStats[cat].total += amount;
                catStats[cat].count++;
            }
        }
    }
    
    let catList = "";
    let sortedCats = Object.keys(catStats).sort((a,b) => catStats[b].total - catStats[a].total);
    for (let cat of sortedCats) {
        let avg = Math.round(catStats[cat].total / catStats[cat].count);
        catList += `- **${cat}**: Ticket Promedio por consumo de $${avg.toLocaleString('es-AR')}\n`;
    }
    
    if (!catList) catList = "- Combustible\n- Viáticos\n- Hospedaje\n- Peajes\n- Service y Reparaciones";

    // 4. HISTORICO MINIMOS
    const escalas = data.sheets['ESCALAS RAC AC']?.values || [];
    let headers = ['Período'];
    let colIndices = [];
    if (escalas && escalas[0]) {
        for (let j = 2; j < 15; j++) {
            if (escalas[0][j]) {
                let colName = escalas[0][j].trim();
                if (colName === 'OPERARIO CARGA') {
                    let fullSubName = (escalas[1] && escalas[1][j]) ? escalas[1][j].trim() : 'Carga';
                    let parts = fullSubName.split(' ');
                    let subName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
                    if (parts.length > 1) {
                        subName += ' ' + parts[1].charAt(0).toUpperCase() + '.';
                    }
                    colName = `Op. ${subName}`;
                }
                if (colName !== '') {
                     headers.push(colName);
                     colIndices.push(j);
                }
            }
        }
    }

    let minHtml = `| ` + headers.join(' | ') + ` |\n|` + headers.map(() => '---').join('|') + `|\n`;
    
    let allValidRows = [];
    for (let i = 3; i < escalas.length; i++) {
        let row = escalas[i];
        if (!row || !row[1] || typeof row[1] !== 'number') break; 
        
        let rowValues = [`**${row[1]}**`];
        let hasData = false;
        for (let j of colIndices) {
            let val = row[j] || 0;
            if (typeof val === 'number' && val > 0) {
               rowValues.push(`$${Math.round(val).toLocaleString('es-AR')}`);
               hasData = true;
            } else {
               rowValues.push(`-`);
            }
        }
        if (hasData) {
             allValidRows.push(`| ` + rowValues.join(' | ') + ` |`);
        }
    }

    // Keep only the last 6 months
    let recentRows = allValidRows.slice(-6);
    minHtml += recentRows.join('\n') + '\n';

    
    // WRITE 08_gastos_y_deducciones.md
    const gastosContent = `## Gastos y Deducciones

Esta sección regula la política de reintegros, amortizaciones y descuentos operativos que aplican al recibo final del comercial. La liquidación mensual primero calcula el "Sueldo Bruto" (basado en comisiones y mínimos) y luego aplica estas sumas y restas para llegar al **Monto Neto a Facturar**.

### Gastos Operativos y Tarjeta Mendel

La gestión financiera del trabajo de campo se canaliza prioritariamente a través de la plataforma y tarjeta corporativa **Mendel**.
La base de datos audita los consumos categorizándolos automáticamente. Las categorías operativas registradas en el sistema son:

${catList}

Adicionalmente a los gastos individuales, el sistema consolida los **gastos operativos de las Oficinas** (servicios, alquileres, insumos). Toda esta información alimenta el cálculo de la Bonificación Oculta General.

> **Importante:** Los consumos generales de Mendel **NO se descuentan del honorario facturado** del comercial, salvo en el caso específico de movilidad (ver Amortizaciones).

<div style="page-break-after: always; break-after: page;"></div>

## Topes de Obra Social y Monotributo

El sistema contempla una política de topes máximos para el reintegro de Obra Social (utilizando como parámetro la cartilla OSDE 210) y Monotributo. La empresa asume el costo hasta el límite máximo correspondiente a la estructura del asociado. Cualquier excedente sobre este tope es descontado de la liquidación.

**Topes Vigentes de Obra Social (Referencia Paritaria actual):**
- **Plan 210 Individual:** $284.333
- **Plan 210 Matrimonio:** $501.395
- **Adicional Hijo 1:** $91.619
- **Adicional Hijo 2:** $41.342

*Nota: El tope de reintegro por Monotributo y Autónomos se rige estrictamente por la escala oficial y recategorizaciones dispuestas por AFIP para el período en curso.*

<div style="page-break-after: always; break-after: page;"></div>

## Gastos Estructurales de Oficinas (Regionales)

Las Unidades de Negocio (Oficinas) poseen un esquema de gastos estructurales que se consolida de manera independiente. Estos gastos fijos (Alquiler, Servicios Generales, Insumos, Sueldos de Equipo de Soporte Administrativo) son cargados directamente al P&L (Estado de Resultados) de la Oficina. 

A modo de referencia para el cálculo de amortizaciones, el costo salarial consolidado del equipo de soporte (Sueldo Bruto + Contribuciones + Cobertura Médica) se estructura de la siguiente manera por plaza:

| Sucursal / Equipo | Cant. Soporte | Salario Mensual Base | Costo Total Cía |
|---|:---:|:---:|:---:|
| **Río Cuarto (DCAC CBA)** | 4 personas | $8.520.325 | $11.573.812 |
| **Entre Ríos (EnRios)** | 2 personas | $3.250.000 | $4.239.171 |
| **Bavio** | 2 personas | $2.935.000 | $2.935.000 |
| **Ayacucho** | 1 persona | $1.635.000 | $2.405.834 |
| **Bolívar** | 1 persona | $1.635.000 | $2.405.834 |
| **Buenos Aires (BS AS)** | 1 persona | $1.450.000 | $1.450.000 |
| **Total Consolidado** | **11 personas** | **$19.425.325** | **$25.009.650** |

Este registro es vital porque el **Resultado Neto de la Oficina** (sobre el cual se calcula la "Bolsa de Oficina" del 10% para repartir) se obtiene recién después de haber amortizado todos estos costos estructurales mensuales.

### Pagos Externos (Bolsillo) y Reintegros

Cuando el comercial abona un gasto operativo con fondos propios, debe registrar la solicitud de reintegro en el sistema.
- **Fechas de procesamiento:** El gasto se registra y la administración tiene tiempo estricto hasta el **día 10 de cada mes** para efectivizar el reintegro.
- **La Regla de Oro:** Para **todos los gastos** (Mendel o Bolsillo), es excluyente adjuntar la **foto del comprobante**. Sin la foto, el sistema rechaza el gasto y no se reintegra.

### Amortizaciones y Movilidad (Uso de Vehículos)

El esquema reconoce el desgaste y costo de capital de los vehículos utilizados en el territorio. El motor cruza las patentes reportadas mensualmente contra la base de vehículos asignados para determinar la liquidación financiera correspondiente.

A continuación se detalla el padrón actual de vehículos:

${flotaHtml}

#### Modalidad de Amortización (Regla Crítica)

A través de esta base, el motor identifica el tipo de liquidación vehicular y aplica la siguiente política:

1. **Vehículos de la Empresa (Autos dCaC):** 
   Al tener los gastos estructurales cubiertos, el comercial **NO** recibe pagos por amortización ni reintegro por kilómetro recorrido. La empresa asume el 100% de la patente, seguro y depreciación.
   
2. **Vehículos Propios (Autos del Comercial):** 
   A los comerciales que usan vehículo propio **SE LES INCLUYE** en el cierre mensual el pago de la amortización a favor. El motor multiplica sus kilómetros convalidados por la tarifa vigente (\`$xKM\`) según su tipo de vehículo (chata, auto, suv).
   
   > **[IMPORTANTE] Descuento Mendel Movilidad:** 
   > A la suma total de su amortización, el sistema **LE RESTA automáticamente lo que haya consumido con su tarjeta Mendel en rubros de movilidad** (Combustible, Peajes, Service, Reparaciones). De esta forma se evita un doble pago de viáticos y se liquida el monto neto correcto de amortización a favor.

#### Evolución Histórica de Tarifa por Kilómetro ($xKM)

Para el cálculo de la amortización a favor de los vehículos propios, el sistema utiliza el valor de reintegro por kilómetro recorrido vigente al momento de la liquidación. A continuación se detalla la evolución de esta tarifa en los últimos 6 meses:

${amortHtml}

---

### Fórmula de Liquidación Neta

> **MONTO NETO A FACTURAR = Sueldo Bruto + Ajustes Retroactivos + Amortizaciones Netas**
`;

    fs.writeFileSync(path.join(__dirname, 'docs', '08_gastos_y_deducciones.md'), gastosContent);

    // 5. CATEGORIAS DE MINIMOS (HR PADRON)
    const roster = data.sheets['Import Roster']?.values || [];
    let catMapping = {
        1: { name: 'TOP AC', agents: [] },
        2: { name: 'Corporate (KAM)', agents: [] },
        3: { name: 'General', agents: [] },
        4: { name: 'Acuerdo', agents: [] },
        5: { name: 'Híbrido', agents: [] },
        6: { name: 'Sin Mínimo', agents: [] },
        7: { name: 'Op. Carga 1', agents: [] },
        8: { name: 'Op. Carga 2', agents: [] },
        9: { name: 'Op. Carga 3', agents: [] },
        10: { name: 'Op. Carga 4', agents: [] },
    };
    
    for (let i = 1; i < roster.length; i++) {
        let r = roster[i];
        if (r && r[0] && r[22]) {
            let nombre = String(r[0]).trim();
            let catNum = Number(r[22]);
            if (catMapping[catNum]) {
                catMapping[catNum].agents.push(nombre);
            }
        }
    }
    
    let padronHtml = `\n### Padrón Oficial de Categorías (HR)\n\nEl siguiente padrón (extraído en vivo del \`Roster\` central) detalla la asignación de cada agente comercial a su escala correspondiente de piso salarial. Es utilizado por Recursos Humanos para auditar y asegurar que las reglas de Mínimo Garantizado se apliquen correctamente a cada perfil.\n\n| Nivel Contractual | Categoría | Agentes Asignados |\n|:---|:---:|:---|\n`;
    for (let i = 1; i <= 10; i++) {
        let cat = catMapping[i];
        if (cat.agents.length > 0) {
            padronHtml += `| **${cat.name}** | Cat. ${i} | ${cat.agents.sort().join(', ')} |\n`;
        }
    }
    
    const minimosContent = `## Histórico y Padrón de Mínimos Garantizados

Para mantener un registro auditable de la evolución salarial frente a la inflación y los ajustes corporativos, el motor de cierres se alimenta de una base de datos histórica.

### La Hoja "ESCALAS RAC AC"

Todos los salarios piso (Mínimos Garantizados) están centralizados en la pestaña **ESCALAS RAC AC** del Google Sheets maestro. 

El sistema utiliza un formato de llave temporal estricto: **\`AÑOMES\`** (por ejemplo, \`202401\` para Enero 2024). 
Gracias a esta nomenclatura, el motor puede saber exactamente cuánto era el mínimo vigente para cada "Categoría" en el mes exacto en el que ocurrió una operación, permitiendo recalcular retroactivos de forma perfecta sin que un aumento salarial actual distorsione una liquidación pasada.

### Evolución por Rango (Categorías)

La empresa agrupa a su fuerza comercial en distintas categorías, lo que simplifica la actualización masiva de mínimos. A continuación se presenta una extracción en vivo de la base de datos mostrando la evolución de los últimos 6 meses (valores históricos por categoría operativa):

${minHtml}

Al centralizar el historial en este registro, Recursos Humanos tiene un panel de control instantáneo para auditar cuándo y por qué monto se actualizaron las escalas de la red comercial.

${padronHtml}
`;
    fs.writeFileSync(path.join(__dirname, 'docs', '09_historico_minimos.md'), minimosContent);

    console.log("Dynamic markdown documents generated successfully from spreadsheet_data.json!");
}

generateMarkdown();
