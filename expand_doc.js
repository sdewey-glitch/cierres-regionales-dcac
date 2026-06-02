const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

const newContent = `
## 5. Estructura Organizacional y Modelos Comerciales

El esquema remunerativo de deCampoacampo es altamente parametrizable y se adapta a diferentes perfiles de negocio. Todo el sistema se basa en un cruce entre el **Roster Comercial** (quién es quién) y las **Escalas de Mínimos** (cuánto se asegura a cada uno).

### 5.1 Perfiles y Modalidades Contractuales

| Perfil / Modalidad | Descripción Comercial | Impacto Técnico en la Liquidación |
|-------------------|-----------------------|------------------------------------|
| **Completa** | El comercial estándar ("Regional"). Trabaja con el paraguas total de dCaC. | Cobra Componente Personal (Curva AC). Cobra 100% de su tajada Regional. Cobra 100% de su parte de Oficina. |
| **Híbrida** | Comercial con negocios paralelos o en transición. | Cobra Componente Personal. Se le castiga el Regional al **50%**. **No cobra** componente de Oficina (0%). |
| **Sin Mínimo** | Representantes o comisionistas puros (Ej: Acuña). Ganan más % pero asumen riesgo total. | El \`Mínimo Garantizado\` es forzado a $0. La \`Variable Personal\` es directamente el 100% de lo que produzcan. |
| **Fijo (Operarios)** | Personal de logística y carga en el campo. | Escala personal estática (**10%** del resultado), sin curva logarítmica. No cobran Oficina. |
| **Corporate / Especial** | Cuentas institucionales (Ej: L. Frutos). | Reglas customizadas inyectadas directamente en el código base (ignorando reglas provinciales estándar). |

### 5.2 El Origen de los Datos (La Parte Técnica)

Para construir la estructura, el motor (script \`engine.ts\`) consulta dos fuentes principales en tiempo real:

1. **BDROSTER (Google Sheets)**:
   - Se lee la pestaña "Roster".
   - Cada comercial tiene campos clave: \`oficina\` (determina su grupo), \`categoria\` (número del 1 al 10), \`modalidad\` (Completa, Hibrida, etc).
2. **ESCALAS RAC AC (Google Sheets)**:
   - Contiene la matriz de dinero garantizado según la inflación del mes.
   - El motor cruza el \`Mes/Año\` del cierre con la \`Categoría\` del comercial en el Roster para obtener su **Mínimo Garantizado**.

---

## 6. Modelo de Cálculo de Comisiones (Deep Dive)

La fórmula maestra que rige la liquidación mensual es:

> **Sueldo Bruto = Fijo (Mínimo Garantizado) + Variable Personal + Componente Regional + Componente Oficina**

A continuación, abrimos la "caja negra" de cómo se calculan estas métricas, desde la filosofía comercial hasta la matemática en el código.

### 6.1 Paso 1: Procesamiento de Operaciones y Topes de Rendimiento

**La Lógica Comercial:**
No todas las operaciones son iguales. Para evitar distorsiones por rentabilidades irreales (muy altas o muy bajas), se aplican **Topes de Rendimiento** (Rinde). 
- Invernada: Piso -4,5% / Tope 8,0%
- Faena: Piso -2,0% / Tope 6,0%

**Explicación de la Fórmula:**
Si una tropa rinde por encima del tope, el sistema recorta el resultado proporcionalmente.
\`Resultado Ajustado = Resultado Real × (Tope % / Rendimiento Real %)\`

**Puntas Vendedora y Compradora:**
El negocio ganadero tiene dos puntas. El comercial que consigue la venta (hacienda) se lleva el **66,7% (2/3)** del resultado ajustado. El que consigue la compra se lleva el **33,3% (1/3)**. Si el mismo comercial hace ambas puntas ("Doble Punta"), se lleva el 100%.

**La Parte Técnica:**
El motor lee las operaciones desde la vista **Q95** en la base ClickHouse. Filtra por los estados operativos válidos (\`TROPAS VENDIDAS\`, \`A LIQUIDAR\`, etc.). Para cada \`id_lote\`, extrae \`importe_vendedor\` e \`importe_comprador\`, calcula el rendimiento global de la operación y aplica los topes usando \`Math.max()\` y \`Math.min()\`. Luego divide los importes según quién esté asignado en los campos \`ac_legajo_vend\` o \`ac_sociedad_vend\`.

### 6.2 Paso 2: El Componente Personal (CP)

**La Lógica Comercial:**
Es la comisión directa por lo que el comercial operó. Mientras más volumen (cabezas) opera un comercial, el porcentaje de comisión que se lleva disminuye gradualmente para hacer el negocio sustentable a gran escala.

**Explicación de la Fórmula Logarítmica:**
La escala no baja de a saltos bruscos, sino siguiendo una curva matemática suave (logaritmo base 10).
Para la **Curva AC** (comerciales estándar), el porcentaje arranca en 30% (para 100 cabezas) y baja hasta el 15% (para 4.000 cabezas o más).

\`Escala % = 15% + (30% - 15%) × [ 1 - ( LOG(Cabezas) - LOG(100) ) / ( LOG(4000) - LOG(100) ) ]\`
\`Componente Personal = Suma Total de Resultados Ajustados × Escala %\`

**La Parte Técnica:**
En TypeScript (\`calculator.ts\`), se utiliza la función matemática \`Math.log10()\`. El sistema cuenta las cabezas totales donde el comercial tuvo participación (si participó solo en la compra, cuenta igual la cabeza). Genera el porcentaje exacto (ej. 23.45%) y lo multiplica por la suma de sus resultados ponderados (los 2/3 y 1/3 mencionados en el Paso 1).

**El Juego con el Mínimo Garantizado:**
- Si el \`Componente Personal\` es **menor** al Mínimo: El comercial cobra el Mínimo garantizado completo. Su "Variable Personal" es $0. Además, como penalidad por no cubrir su costo, **pierde el derecho a cobrar los premios colectivos** (Regional y Oficina).
- Si el \`Componente Personal\` es **mayor** al Mínimo: El comercial cubrió su cuota. En el recibo verá: \`Fijo = Mínimo\` y \`Variable Personal = Componente Personal - Mínimo\`. Automáticamente se le habilitan los cobros de Regional y Oficina.

### 6.3 Paso 3: Componente Regional ("La Bolsa Provincial")

**La Lógica Comercial:**
Para fomentar el trabajo en equipo y la dominancia territorial, los comerciales de una misma provincia comparten un "pozo" de dinero extraído del volumen total generado en esa zona. Quien más cuentas distintas (sociedades) operó en el mes, se lleva una porción ("Tajada") más grande de esa bolsa.

**Explicación de las Fórmulas:**
1. \`Bolsa Provincial = (Suma de todos los Resultados de la Provincia) × (Escala Provincial)\`
   *(Nota: La Escala Provincial es una curva logarítmica que va del 10% al 5% según cabezas provinciales).*
2. \`Tajada del Comercial = (Cantidad de CUITs/Sociedades que operó) / (Total de CUITs/Sociedades operadas en la provincia)\`
3. \`Componente Regional = Bolsa Provincial × Tajada del Comercial\`

**La Parte Técnica:**
El script \`engine.ts\` realiza dos iteraciones (loops) sobre los datos. 
En el **primer loop**, agrupa todas las operaciones por "Oficina" y cuenta las \`cabezas\`, suma los \`resultados\`, e inserta cada Razón Social en un objeto \`Set<string>\` (colección única sin duplicados) para contar las sociedades.
En el **segundo loop**, cuando liquida a cada comercial, va al objeto de su oficina, extrae la \`Bolsa Provincial\` previamente calculada, y divide la longitud de su propio \`Set<string>\` de sociedades contra el total de la provincia para obtener el porcentaje de Tajada exacto.

### 6.4 Paso 4: Componente Oficina (Operaciones Directas)

**La Lógica Comercial:**
Hay operaciones institucionales ("directas") donde la empresa no tuvo intervención de un comercial de campo (nadie figura como AC). Para incentivar a las oficinas regionales (Río Cuarto, Entre Ríos, etc.), la empresa reparte la comisión de esas operaciones entre todos los miembros de esa oficina en partes iguales.

**Explicación de las Fórmulas:**
1. Todas las operaciones directas de una zona se le asignan a un "Pseudo-Agente" (ej: "Oficina Río 4to").
2. Se calcula su ganancia aplicando la **Curva de Oficina** (que va del 20% al 5%).
3. \`Bolsa Institucional = Resultado del Pseudo-Agente × Curva de Oficina\`
4. \`Componente Oficina = Bolsa Institucional / Cantidad de Comerciales Reales en la Oficina\`

**La Parte Técnica:**
Las filas de la base Q95 que tienen los campos \`ac_legajo_vend\` y \`ac_sociedad_vend\` vacíos o nulos son procesadas por una sub-rutina en \`engine.ts\`. Se acumulan en un "Pool de Oficina". Finalmente, el sistema cuenta cuántos comerciales en el Roster pertenecen a esa oficina y tienen modalidad "Completa" (los Híbridos y Operarios se excluyen del divisor). La \`Bolsa Institucional\` resultante se divide y se inyecta en el objeto de resultados de cada comercial bajo la clave \`res.componenteO\`.
`;

const regex = /## 5\. Estructura Organizacional[\s\S]*?## 7\. Gastos y Deducciones/g;

if (regex.test(md)) {
    md = md.replace(regex, newContent + "\n---\n\n## 7. Gastos y Deducciones");
    fs.writeFileSync(MD_PATH, md);
    console.log("Success! File rewritten.");
} else {
    console.log("Could not find the sections to replace.");
}
