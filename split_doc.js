const fs = require('fs');
const path = require('path');

const MD_PATH = path.join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'documento_clevel_cierres.md');
let md = fs.readFileSync(MD_PATH, 'utf8');

const newContent = `
## 5. Acuerdos y Modelos Comerciales

La red comercial de deCampoacampo opera bajo distintos acuerdos contractuales, diseñados para incentivar el rendimiento según el perfil y la jerarquía del asociado. Cada modelo define a qué porciones de la estructura remunerativa tiene acceso el agente.

### 5.1 Modelo Completo (Estándar Regional)
Es el modelo núcleo de la empresa. El comercial trabaja bajo el paraguas total de dCaC y está integrado a una **Oficina Regional** (ej. Río Cuarto, Entre Ríos).
- **Componentes que cobra:** Los 3 completos. Componente Personal (Curva AC), Componente Regional (Bolsa de la provincia), y Componente de Oficina.
- **Riesgo:** Cubierto por el **Mínimo Garantizado** de su categoría.

### 5.2 Modelo City Manager (Híbrido)
Aplica a comerciales que gestionan una zona o tienen acuerdos comerciales paralelos o en transición.
- **Componentes que cobra:** Componente Personal (Curva AC). 
- **Castigos:** El Componente Regional se liquida al **50%**. Pierde el acceso al Componente de Oficina (**0%**).
- **Riesgo:** Cubierto por el **Mínimo Garantizado**.

### 5.3 Modelo Simple (Independientes)
Aplica a comerciales que operan de forma aislada, sin estar anclados a una Oficina Regional física.
- **Componentes que cobra:** Únicamente Componente Personal (Curva AC). Al no tener equipo, **no participan** de la Bolsa Regional ni de la Bolsa de Oficina.
- **Riesgo:** Cubierto por el **Mínimo Garantizado**.

### 5.4 Modelo Corporate
Aplica a ejecutivos de cuentas institucionales y grandes empresas (Ej: L. Frutos).
- **Componentes que cobra:** Reglas customizadas de comisiones que operan por fuera del esquema provincial estándar.
- **Riesgo:** Cubierto por el **Mínimo Garantizado** de categoría Corporate.

### 5.5 Modelo Variable (Sin Mínimo)
Aplica a comisionistas externos o representantes de alto riesgo (Ej: Acuña).
- **Componentes que cobra:** El 100% de lo que produzcan en base a su Componente Personal. Acceden a la Bolsa Regional si corresponde a su geografía.
- **Riesgo:** Riesgo total. **No tienen red de seguridad** (Mínimo Garantizado = $0). Si no operan, no cobran.

### 5.6 Modelo Operario de Carga
Aplica al personal de logística y carga en el campo.
- **Componentes que cobra:** Comisión fija y estática del **10%** sobre el resultado de la operación (no usan curva logarítmica). No acceden al Componente de Oficina.
- **Riesgo:** Cubiertos por un Mínimo Garantizado específico para su rol.

---

## 6. Mecánica de Liquidación (Lógica Comercial)

La remuneración se rige por la siguiente estructura conceptual:
> **Fórmula:** Sueldo Bruto = Fijo (Mínimo Garantizado) + Variable Personal + Componente Regional + Componente Oficina

### El Componente Personal (CP)
Es la comisión directa por las operaciones donde el comercial fue vendedor o comprador. Mientras más cabezas opera, la comisión porcentual disminuye gradualmente mediante una **curva logarítmica** (para comerciales estándar, arranca en 30% y cae hasta 15%).
> **Fórmula:** Componente Personal = Suma de Resultados × Escala Curva

**Fijo vs. Variable:**
- Si el CP no supera el Mínimo Garantizado: El comercial cobra el Mínimo y su "Variable Personal" es $0. **Pierde los premios colectivos** (Regional/Oficina).
- Si el CP supera el Mínimo Garantizado: El comercial cobra su Mínimo y la diferencia se etiqueta como "Variable Personal". Se habilitan los premios colectivos.

### El Componente Regional (Bolsa Provincial)
Premia la dominancia territorial. Se junta el resultado total generado por todos los agentes de una misma provincia. Luego, esa gran "Bolsa" se reparte según la "Tajada" de cada agente (quien operó más CUITs distintos en la provincia, se lleva una porción mayor).
> **Fórmula:** Bolsa Provincial = Total Resultados de la Provincia × Curva Provincial
> **Fórmula:** Tajada = CUITs propios / Total CUITs de la provincia
> **Fórmula:** Componente Regional = Bolsa Provincial × Tajada

### El Componente de Oficina (Operaciones Directas)
Premia la eficiencia institucional de las sucursales. Las operaciones que "caen solas" o no tienen un comercial asignado en esa zona, se agrupan en una gran bolsa y se dividen en partes iguales entre todos los miembros de esa Oficina.
> **Fórmula:** Bolsa Oficina = Total Operaciones Directas × Curva Oficina
> **Fórmula:** Componente Oficina = Bolsa Oficina / Cantidad de Miembros

---

## 7. Arquitectura de Datos y Procesamiento (Parte Técnica)

Esta sección detalla cómo los conceptos comerciales se traducen en extracciones de bases de datos y algoritmos en el motor de liquidación (\`engine.ts\`).

### 7.1 Origen de los Parámetros Contractuales
El motor se alimenta en tiempo real de Google Sheets para conocer la estructura:
1. **BDROSTER**: Define el "Quién". Asigna a cada nombre su \`oficina\`, \`modalidad\` (Híbrida, Variable, etc.) y \`categoria\` (1 al 10).
2. **ESCALAS RAC AC**: Define el "Cuánto". Es una matriz mensual que cruza la categoría del Roster para inyectar la variable de **Mínimo Garantizado** en pesos.

### 7.2 Flujo de las Operaciones
La base de la verdad operativa es la vista **Q95** en ClickHouse.
1. Se filtran estrictamente los estados válidos (\`TROPAS VENDIDAS\`, \`A LIQUIDAR\`).
2. **Topes Dinámicos**: El algoritmo aplica un \`Math.max()\` y \`Math.min()\` sobre el campo \`rendimiento\`. Si una tropa de invernada excede el 8.0% de rinde, se recorta el \`resultado_final\` matemáticamente.
3. **Distribución de Puntas**: Se dividen los importes aplicando constantes fijas: \`2/3\` (66.7%) para el comercial hallado en \`ac_legajo_vend\` o \`ac_sociedad_vend\` y \`1/3\` para el de compra.

### 7.3 Motor Algorítmico (Ciclos de Cálculo)
El cálculo requiere **dos pasadas (loops)** sobre la data, ya que los premios colectivos necesitan totales absolutos antes de poder distribuirse.

**Ciclo 1: Agregación Regional**
El código itera todas las operaciones para construir el "Pool".
- Por cada operación, se suma el \`resultado\` en el contador global de la provincia.
- Por cada operación, el CUIT o Razón Social se inserta en una estructura \`Set<string>\` (que nativamente ignora duplicados). Esto genera el conteo perfecto de "Sociedades Únicas" operadas en el mes para la provincia.
- Las operaciones donde los campos \`id_ac_vend\` e \`id_ac_comp\` son nulos se capturan y se envían a un objeto virtual llamado "Pool de Oficina".

**Ciclo 2: Asignación por Agente**
El código itera el Roster. Para cada comercial:
- Se usa \`Math.log10()\` para calcular su Curva de Componente Personal basada en su conteo de \`cabezas\`.
- Se evalúa si su \`res.componenteP > minimo\`. Si no, se fuerzan \`res.componenteR = 0\` y \`res.componenteO = 0\`.
- Para su Componente Regional, se consulta el \`Set\` global de su provincia calculado en el Ciclo 1. Se extrae el tamaño de su \`Set\` individual y se divide sobre el total para obtener la fracción matemática exacta de la Tajada.
- Para el Componente de Oficina, se divide el Pool de Oficina capturado en el Ciclo 1 por el tamaño del array de comerciales filtrados por su misma oficina y modalidad "Completa".
`;

// Replace sections 5 and 6
const regex = /## 5\. Estructura Organizacional[\s\S]*?## 7\. Gastos y Deducciones/g;

if (regex.test(md)) {
    md = md.replace(regex, newContent + "\n---\n\n## 8. Gastos y Deducciones");
    
    // Also we need to shift the numbers of Gastos y Deducciones and Motor de Ajustes from 7,8 to 8,9
    md = md.replace(/## 8\. Motor de Ajustes Retroactivos/g, '## 9. Motor de Ajustes Retroactivos');
    md = md.replace(/## 9\. Ejemplos Reales de Liquidación/g, '## 10. Ejemplos Reales de Liquidación');
    md = md.replace(/## 10\. Reporte Individual por Comercial/g, '## 11. Reporte Individual por Comercial');
    md = md.replace(/## 11\. Métricas Operativas/g, '## 12. Métricas Operativas');
    md = md.replace(/## 12\. Antes vs\. Ahora/g, '## 13. Antes vs. Ahora');
    md = md.replace(/## 13\. Glosario/g, '## 14. Glosario');
    md = md.replace(/## 14\. Hoja de Ruta/g, '## 15. Hoja de Ruta');

    fs.writeFileSync(MD_PATH, md);
    console.log("Success! File split and rewritten.");
} else {
    console.log("Could not find the sections to replace.");
}
