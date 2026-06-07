# 🧠 MEMORY.MD — Reglas y Lecciones del Proyecto Cierres

> **LEER ESTE ARCHIVO ANTES DE TOCAR CUALQUIER COSA.**
> Es la primera acción obligatoria de cualquier sesión o antes de cualquier edición.

---

## ✅ REGLAS OBLIGATORIAS

### 1. Revisar los manuales y archivos de contexto antes de editar
Antes de escribir una sola línea de código, leer:
- `AGENT.md` — arquitectura, reglas de código, flujo de datos
- `SKILLS.md` — habilidades y convenciones del proyecto
- `docs/biblia_planilla.md` — única fuente de verdad sobre la matemática del motor
- `docs/02_mecanica_de_liquidacion.md` — reglas de las tres componentes
- `docs/04_escalas_y_curvas.md` — fórmulas de escalas logarítmicas
- Cualquier otro doc relevante en `docs/` según el tema a editar

Si el contexto dice algo distinto a lo que estás a punto de implementar → el contexto manda.

### 2. Actualizar los archivos de contexto cuando cambie algo
Cada vez que se cambia una regla de negocio, una columna del Sheet, una fórmula o un comportamiento:
- Actualizar el manual o doc correspondiente con la nueva información
- Si no existe el doc adecuado, crearlo en `docs/`
- Los docs son la memoria del proyecto. Sin ellos, el próximo agente repite los mismos errores

### 3. ⚠️ MUY IMPORTANTE — El proyecto vive en Vercel + GitHub
**El servidor de producción es Vercel. El código fuente es GitHub.**
- **Nada puede depender del servidor local** (`localhost`, `pm2`, rutas locales de Windows, etc.)
- **Nada puede depender de archivos en el disco local** (CSVs, JSONs en el filesystem de la máquina de Admin, etc.)
- Toda data debe venir de: **Google Sheets API**, **Metabase API**, o **variables de entorno** declaradas en Vercel
- Antes de cualquier cambio, preguntarse: ¿esto funciona igual en Vercel (Linux, sin estado, sin filesystem permanente)?
- Los snapshots y datos persistentes deben guardarse en **Google Sheets** o un servicio externo compatible con Vercel (Blob, DB, etc.)
- **No usar `fs.writeFile`** ni acceso a disco local en código que corra en producción

---

## 🐛 ERRORES COMUNES — No repetir

### ❌ Error: `AñoMes` en Bajada ≠ mes de operación (ya documentado arriba)

---

### ❌ Error: `readSheet` con `UNFORMATTED_VALUE` devuelve fechas como número serial
`sheets.ts` usa `valueRenderOption: 'UNFORMATTED_VALUE'`. Esto hace que los campos de tipo DATE en Google Sheets lleguen como **número serial** (ej: `46943` = 2026-05-29), NO como texto "2026-05-29".

---

### ❌ Error: Columna idx 33 de la hoja Bajada — formato YYYYMM, NO fecha
**El campo idx 33 (columna AH) de la hoja Bajada contiene AñoMes en formato `YYYYMM`** (ej: `202605` = mayo 2026), **NO una fecha**. El código anterior intentaba parsearlo como número serial de Google Sheets, obteniendo año ~2454 y filtrando TODOS los lotes → 0 lotes → snapshot devuelto sin modificar → escala incorrecta.

**Regla**: Al filtrar por período en `readBajada`, verificar PRIMERO si el valor >= 100000 (es YYYYMM):
```typescript
const fechaRaw = r[33];
if (typeof fechaRaw === 'number' && fechaRaw >= 100000) {
    // Formato YYYYMM (202605 = mayo 2026)
    rowYear  = Math.floor(fechaRaw / 100);
    rowMonth = fechaRaw % 100;
} else if (typeof fechaRaw === 'string' && fechaRaw.includes('-')) {
    // Texto: "2026-05-29"
    const p = fechaRaw.split('-');
    rowYear = parseInt(p[0]); rowMonth = parseInt(p[1]);
} else if (typeof fechaRaw === 'number' && fechaRaw > 40000) {
    // Serial de GSheets (días desde 1899-12-30)
    const d = new Date((fechaRaw - 25569) * 86400 * 1000);
    rowYear = d.getUTCFullYear(); rowMonth = d.getUTCMonth() + 1;
}
```

---


**Problema**: El campo `AñoMes` (idx 34, col AI) en la hoja Bajada contiene el mes de **liquidación/pago**, NO el mes de operación. Los lotes nuevos (ID 110xxx) pueden tener `AñoMes=202606` aunque la operación sea de mayo 2026.

**Solución correcta**: Filtrar por la **columna Fecha** (idx 33, col AH, formato `YYYY-MM-DD`) que sí refleja el mes real de la operación.
```typescript
const fechaStr = col(r, 33);
const parts = fechaStr.split('-');
const rowYear  = parseInt(parts[0]);
const rowMonth = parseInt(parts[1]);
if (rowYear !== filterYear || rowMonth !== filterMonth) continue;
```

---

### ❌ Error: Confundir Componente Regional con Componente Oficina
**Según `biblia_planilla.md` sección 4:**

| Componente | Qué es | Fuente en Bajada |
|---|---|---|
| **Regional** | Todos los lotes donde el AC es de la misma **Provincia** | Prov_AC_Vend (idx 26, col AA) o Prov_AC_Comp (idx 27, col AB) |
| **Oficina** | Lotes directos del pseudo-usuario "Oficina X" | Ofi_Vendedora (idx 31, col AF) o Ofi_Compradora (idx 32, col AG) |

- Regional filtra por `result.provincia` (ej: "Cordoba")
- Oficina filtra por `result.oficina` (ej: "Oficina Rio 4to")

---

### ❌ Error: Asumir que `readBajada` sin filtro es rápido
La hoja Bajada acumula todo el histórico (todas las meses). Sin filtro de período retorna miles de filas (910+ lotes de histórico). Siempre pasar `filterYear` y `filterMonth` al llamar `readBajada` para reportes de un mes específico.

---

### ❌ Error: El mapa bajada guarda solo la primera fila de cada lote
Cada lote en la hoja Bajada puede tener **múltiples filas** (una por participante: AC vendedor, AC comprador, Oficina, etc.). El `readBajada` construye un Map donde la **primera fila** define `resultadoTopeado`, `cantidad`, `tipo`. Las filas siguientes del mismo lote solo actualizan los campos de AC y Oficina si no estaban seteados.

**Consecuencia**: No asumir que `resultado` de una fila = resultado del lote. El resultado real está solo en la primera fila de cada lote (las otras tienen `resultado = 0`).

---

### ❌ Error: Recalcular cierreReal sin incluir componenteR y componenteO actualizados
Cuando se recalculan `componenteR` y `componenteO` al final de `loadAgentDataFromBajada`, el `cierreReal` ya fue calculado antes con los valores anteriores. Hay que recalcular `cierreReal` DESPUÉS de actualizar los componentes.

---

### ❌ Error: Escala provincial vs escala AC vs escala Oficina
Según la Biblia:
- **Personal** → `escalaAC` (30% a 15%, tope 4.000 cab) o `escalaPersonal` (22% a 14%, tope 6.000) para gente de Oficina
- **Regional** → `escalaProvincial` (10% a 5%, tope 15.000 cab)  
- **Oficina** → `escalaOficina` (20% a 5%, tope 2.000 cab)

No intercambiar estas escalas entre componentes.

---

### ❌ Error: Asumir que `comercial_venta` / `comercial_compra` siempre tienen valor en el snapshot
Estos campos pueden ser `undefined` si el lote no tiene AC asignado. Siempre usar `op.comercial_venta?.toLowerCase()` (opcional chaining) y manejar el caso fallback en el else.

---

### 🔒 ZONA CRÍTICA — NO MODIFICAR: Lógica de cierres congelados

**Archivos involucrados**: `src/core/historico-cierres.ts` y `src/api/dispatch.ts`

**Cómo funciona** (NO romper):
1. Al congelar: `saveHistoricCierre` guarda en `Historico_Cierres` (totales) y `Historico_Tropas` (detalle por lote).
2. Al leer: `getAgentData` detecta si el agente está congelado (hoja `Cierres_Congelados`) → llama `loadHistoricCierre`.
3. `loadHistoricCierre` arma el `CommercialResult` desde los Sheets. La columna `Resultado` de `Historico_Tropas` (r[4]) se mapea a **`resultado_topeado_venta`** para que `recalcularEscalaAgente` pueda sumarla correctamente.

**Error que YA fue corregido y NO debe revertirse**:
```typescript
// ✅ CORRECTO — así debe quedar en loadHistoricCierre para ambas colecciones (tropas y todasTropas):
resultado_topeado_venta: Number(r[4]) || 0,  // ← Total guardado al congelar
resultado_topeado_compra: 0,
ganancia_personal_venta: Number(r[5]) || 0,  // ← Ganancia guardada al congelar
```
```typescript
// ❌ NUNCA así (causa resultado=0 en todos los reportes congelados):
resultado_topeado_venta: 0,
resultado_topeado_compra: 0,
ganancia_personal_venta: 0,
```

---

### ❌ Error: Llamar `source=bajada` para agentes fuera de la cobertura de Bajada
Cuando el usuario tiene seleccionado `source=bajada` en el frontend y navega a un agente de otra región (La Pampa, Entre Ríos, etc.) que no está cubierto por la hoja Bajada:
- El `bajadaMap` no tiene lotes de ese agente → `tropasBajadaSet.size === 0`
- El guard en `loadAgentDataFromBajada` detecta esto y retorna el snapshot sin modificar
- **NO** genera resultado=0

Este guard está en `bajada.ts` justo después del loop principal. No eliminarlo.

---

## 📋 COLUMNAS CLAVE DE LA HOJA BAJADA (`'Bajada'!A:AU`)

| Idx | Col | Campo |
|-----|-----|-------|
| 0 | A | id_lote |
| 4 | E | cantidad (cabezas) |
| 21 | V | Tipo (Faena/Invernada/etc.) |
| 24 | Y | AC_Vendedor |
| 25 | Z | AC_Comprador |
| 26 | AA | Prov_AC_Vendedor → Componente **Regional** |
| 27 | AB | Prov_AC_Comprador → Componente **Regional** |
| 28 | AC | Resultado_Topeado |
| 31 | AF | Ofi_Vendedora → Componente **Oficina** |
| 32 | AG | Ofi_Compradora → Componente **Oficina** |
| 33 | AH | Fecha (YYYY-MM-DD) → usar para filtrar por período |
| 34 | AI | AñoMes (⚠️ mes de liquidación, NO usar para filtrar período) |

---

## 🔍 CHECKLIST ANTES DE CADA CAMBIO

- [ ] Leí `memory.md` completo
- [ ] Leí los docs relevantes en `docs/`
- [ ] El cambio NO depende de localhost ni del filesystem local
- [ ] El cambio funciona en Vercel (Linux, sin estado)
- [ ] Si cambié una regla de negocio → actualicé el doc correspondiente
- [ ] Si descubrí un error nuevo → lo agregué a esta lista en `memory.md`
