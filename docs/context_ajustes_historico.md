# Contexto: Hoja "Ajustes Historico" y Módulo de Ajustes Retroactivos

## ¿Qué es la hoja "Ajustes Historico"?

La hoja `Ajustes Historico` (en `HUB_CIERRES_ID`) es la fuente de verdad histórica de tropas congeladas por cierre. Se pobla automáticamente cada vez que se congela el cierre de un comercial (`POST /api/snapshots/freeze`).

### Estructura de columnas

| Col | Nombre              | Descripción                                                                 |
|-----|---------------------|-----------------------------------------------------------------------------|
| A   | `AñoMes_Cierre`     | Mes en que se congeló (ej. `202605` = Mayo 2026)                            |
| B   | `AñoMes_Tropa`      | Mes real de la operación (puede ser M, M-1, M-2, M-3)                      |
| C   | `ID_Tropa`          | ID del lote/tropa en Metabase                                               |
| D   | `Resultado`         | Resultado de la **punta** del comercial (ya con 2/3 ó 1/3 aplicado si corresponde) |
| E   | `Resultado_Ajustado`| Ganancia personal = Col D × Escala%. NO es una segunda aplicación del 2/3  |
| F   | `AC_Vendedor`       | Nombre del asociado en rol vendedor                                         |
| G   | `AC_Comprador`      | Nombre del asociado en rol comprador                                        |
| H   | `AC_de_tropa`       | Asociado congelado (dueño del registro)                                     |
| I   | `Escala %`          | Escala aplicada al cierre (ej. `21.81`)                                     |
| J   | `Excluida`          | `TRUE` si la tropa fue excluida manualmente                                 |

### Relación entre Col D y Col E

**Importante**: Col D ya contiene el resultado **después** del reparto venta/compra:

- Si el comercial es solo **vendedor**: `Col D = Resultado_Topeado × 2/3`
- Si el comercial es solo **comprador**: `Col D = Resultado_Topeado × 1/3`
- Si está en **ambas puntas**: `Col D = Resultado_Topeado × 2/3 + Resultado_Topeado × 1/3 = 100%`

Y `Col E = Col D × Escala%` siempre. **No se aplica 2/3 dos veces**.

### ¿Cuándo se escribe?

Al congelar un cierre (`/api/snapshots/freeze`), el sistema guarda para el agente congelado:
- Todas las tropas del **mes actual** (M)
- Todas las tropas de los **3 meses anteriores** (M-1, M-2, M-3)

Solo se usan 3 meses (M-1, M-2, M-3) para los ajustes retroactivos, no 4.
Por ejemplo: al hacer el cierre de Junio, los meses considerados son Mayo, Abril y Marzo.

---

## Qué columna de la Bajada se usa como Resultado_Topeado

La hoja Bajada tiene varias columnas de resultado. El código en `bajada.js` lee:

```
idx 28 = "Resultado_Topeado"
```

Que en la estructura real de la hoja corresponde a `resultado_total_proyectado` (columna AC en 0-base). Este campo es igual a `resultado_economico + resultado_financiero_proyectado`.

**Ejemplo lote 107575 (Alan García, Marzo 2026):**

| Col Bajada | Nombre                         | Valor           |
|------------|-------------------------------|-----------------|
| K (idx 10) | `resultado_economico`          | $6.640.251,25   |
| L (idx 11) | `resultado_financiero_proy.`   | -$739.970,52    |
| M (idx 12) | `resultado_total_proyectado`   | $5.900.280,73   |
| AC (idx 28)| `Resultado_Topeado` (leído)    | $5.900.280,73   |

Luego, como Alan es solo vendedor:
```
Col D = $5.900.280,73 × 2/3 = $3.933.520
Col E = $3.933.520 × 20,64% = $811.763
```

El valor de col K ($6.640.251) **no es el Resultado_Topeado**. Es el resultado económico bruto sin el componente financiero proyectado.

---

## Fuente de datos al congelar: Bajada vs Q95

### Comportamiento antes del fix (solo referencia histórica)
Cuando se congelaba con `source=bajada`, la parte que escribía en Ajustes Historico **siempre** leía del snapshot Q95, independientemente de la fuente seleccionada.

### Comportamiento actual (post-fix)
Al congelar con `source=bajada` o `source=bajada2`, el sistema:

1. Para cada mes (M, M-1, M-2, M-3):
   - Llama a `loadAgentDataFromBajada(y, m, agentName, bajadaSheetName)`
   - Si falla o no hay datos de bajada para ese mes → fallback al snapshot Q95
2. Los valores guardados en Ajustes Historico reflejan los datos de la Bajada

Esto garantiza coherencia entre lo que se pagó (usando Bajada) y lo que queda registrado para el próximo ajuste retroactivo.

### Resumen por tabla de destino

| Tabla de destino        | Con source=bajada                  | Con source=metabase  |
|-------------------------|-------------------------------------|----------------------|
| `Ajustes Historico`     | Valores de la hoja Bajada (con fallback Q95) | Snapshot Q95 |
| `Historico_Cierres`     | `loadAgentDataFromBajada()` directo | Snapshot Q95         |
| `Historico_Tropas`      | `loadAgentDataFromBajada()` directo | Snapshot Q95         |

---

## Lógica de Ajustes Retroactivos

### Concepto

Cuando una operación se liquida, el resultado puede ajustarse después (pesaje final de frigorífico, precio definitivo, corrección de rendimiento, etc.). El ajuste retroactivo cuantifica exactamente cuánto cambió la ganancia de un comercial en esas tropas pasadas.

**No se modifica el recibo original pagado**. El delta se suma/resta al cierre del mes siguiente.

### Fórmula por lote

```
delta = ganancia_dinámica - ganancia_estática

donde:
  ganancia_estática  = col E de Ajustes Historico (valor congelado al momento del cierre)
  ganancia_dinámica  = resultado_Q95_actual × (escala_col_I / 100)
```

Si `escala_col_I` es 0 en la hoja (puede ocurrir en registros legados), el sistema deriva la escala efectiva como:
```
effective_escala = col_E / col_D   (si col_D != 0)
```

### Regla del mínimo garantizado

Si el comercial cobra el mínimo garantizado en el mes de aplicación del ajuste, los ajustes **negativos** no lo afectan. La red de seguridad asume el impacto.

---

## Endpoint: `GET /api/ajustes-historico`

### Query params

| Param   | Descripción                                    | Ejemplo          |
|---------|------------------------------------------------|------------------|
| `year`  | Año del cierre **a calcular** (próximo cierre) | `2026`           |
| `month` | Mes del cierre **a calcular**                  | `6` (Junio)      |

### Selector de mes en la UI

El selector del módulo muestra el **mes del próximo cierre**. Cuando el usuario elige "Junio":
- El sistema busca en Ajustes Historico los registros con `AñoMes_Cierre = 202605` (Mayo)
- Los 3 meses válidos de tropas son: `202605`, `202604`, `202603` (Mayo, Abril, Marzo)
- **No** incluye Febrero

### Lógica interna

1. Calcula `AñoMes_Cierre` = mes anterior al selector (Junio → `202605`)
2. Calcula 3 meses válidos = M-1, M-2, M-3 del selector (Junio → `202605`, `202604`, `202603`)
3. Lee `Ajustes Historico` filtrando por `AñoMes_Cierre` y `AñoMes_Tropa ∈ válidos`
4. Busca cada `ID_Tropa` en Q95 fresca de Metabase
5. Calcula delta por lote y agrupa por comercial
6. Devuelve ordenado por `|delta|` descendente

### Respuesta

```json
{
  "dynamicAvailable": true,
  "data": [
    {
      "comercial": "Valentín Torriglia",
      "totalEstatico": 5234000,
      "totalDinamico": 5680000,
      "totalDelta": 446000,
      "absDelta": 446000,
      "tropas": [
        {
          "id_lote": "107475",
          "anioMesTropa": "202605",
          "resultado_estatico": 272848,
          "ganancia_estatica": 39415,
          "resultado_dinamico": 285000,
          "ganancia_dinamica": 41200,
          "delta": 1785,
          "ac_vendedor": "Valentín Torriglia",
          "ac_comprador": "...",
          "excluida": false
        }
      ]
    }
  ]
}
```

---

## Pantalla "Ajustes Retro" (frontend — `AjustesHistorico.tsx`)

### Flujo de uso

1. Usuario entra a la tab **"Ajustes Retro"**
2. Selecciona el mes del **próximo cierre** (ej. Junio 2026)
3. El sistema muestra la comparativa basada en el cierre congelado de **Mayo 2026** (tropas de Mayo, Abril y Marzo)
4. Lista de comerciales ordenada por `|delta|` descendente, coloreada:
   - 🟢 Verde: delta positivo (comercial ganó más de lo pagado)
   - 🔴 Rojo: delta negativo (comercial ganó menos de lo pagado)
   - ⚪ Gris: sin cambio significativo
5. Clic en un comercial → tabla expandible con todas las tropas comparadas lote a lote

### Ordenamiento de tropas en la tabla

Las tropas se muestran agrupadas por mes, en orden:
1. Mes M-1 (ej. Mayo) — primero
2. Mes M-2 (ej. Abril)
3. Mes M-3 (ej. Marzo) — último

Dentro de cada mes, ordenadas por ajuste (delta) descendente.

### Columnas de la tabla de detalle

| Columna            | Parte         | Fuente                             |
|--------------------|---------------|------------------------------------|
| ID Lote            | —             | Ajustes Historico col C            |
| Mes                | —             | Ajustes Historico col B            |
| **ANTES**          | —             | Valores congelados al cierre       |
| Res. Empresa       | ANTES         | Ajustes Historico col D            |
| VAR Venta/Compra   | ANTES         | Derivado de col F/G + col D        |
| Total              | ANTES         | Col D                              |
| Res. Ajustado      | ANTES         | Col E (= col D × escala)           |
| **AHORA**          | —             | Valores dinámicos Q95              |
| Res. Empresa       | AHORA         | Q95 resultado actual               |
| VAR Venta/Compra   | AHORA         | Q95 resultado × escala             |
| Total              | AHORA         | Q95 resultado                      |
| Res. Ajustado      | AHORA         | Q95 × escala                       |
| **Ajuste**         | —             | Col E_ahora − Col E_antes          |

---

## Notas importantes

- Los lotes que no aparecen en Q95 reciben `resultado_dinamico = resultado_estatico` (delta = 0). En la práctica esto no debería ocurrir ya que Q95 contiene el historial completo.
- Solo se consideran **3 meses** (no 4). Ejemplo: el cierre de Junio considera Mayo, Abril, Marzo. Febrero queda excluido.
- Las tropas marcadas como `Excluida = TRUE` se muestran pero con estilo atenuado.
- La columna `dynamicAvailable: false` solo aparece si el fetch a Metabase falla completamente.
- La comparación de nombres usa `.normalize('NFC')` para evitar problemas de encoding Unicode entre los datos de Sheets y Metabase.

---

## Relación con la hoja Bajada — columnas clave

El endpoint debug `/api/bajada/debug-lote/:id` expone todos los índices de columna:

| Idx | Nombre en Bajada                   | Notas                                              |
|-----|------------------------------------|----------------------------------------------------|
| 0   | `id_lote`                          | PK                                                 |
| 4   | `cantidad`                         | Cabezas                                            |
| 10  | `resultado_economico`              | Resultado bruto (sin componente financiero)        |
| 11  | `resultado_financiero_proyectado`  | Ajuste financiero                                  |
| 12  | `resultado_total_proyectado`       | Económico + financiero proy. (coincide con idx 28) |
| 15  | `resultado_financiero`             | Financiero real acumulado                          |
| 16  | `resultado_final`                  | Total con financiero real                          |
| 21  | `Tipo`                             | Faena / Invernada / etc.                           |
| 24  | `AC_Vend`                          | Asociado Comercial vendedor                        |
| 25  | `AC_Comp`                          | Asociado Comercial comprador                       |
| 28  | `Resultado_Topeado`                | **El que usa el código** = idx 12 en valor         |
| 33  | `Fecha` / `AñoMes`                 | Para filtrar por período                           |
