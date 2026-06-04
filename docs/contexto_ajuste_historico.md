# Contexto: Lógica de Ajustes Histórico

## Problema que resuelve

El Q95 (base de datos de operaciones de Metabase) es **dinámico**: el resultado financiero de una tropa puede cambiar mes a mes por variaciones en la tasa financiera, pagos tardíos, u otros factores.

El motor de ajustes retroactivos necesita saber cuánto **cambió** el resultado de una tropa entre el cierre anterior y el cierre actual. Esa diferencia es el **ajuste retroactivo** que se suma o resta al sueldo del comercial.

---

## Solución: Hoja `Ajustes Historico`

La hoja funciona como un **registro fotográfico del Q95** con una ventana deslizante de 4 meses.

### Regla de escritura

En cada cierre del mes M:
1. Se toma la foto **HOY** del Q95 para las tropas de M, M-1, M-2 y M-3
2. Todas las filas nuevas se etiquetan con `AñoMes_Cierre = M`
3. Se aplica la **ventana deslizante** para limpiar filas viejas (ver abajo)

### Regla fundamental de retención (ventana deslizante)

> **Una fila se mantiene en la hoja mientras su `AñoMes_Tropa` esté dentro de la ventana de 4 meses del cierre actual.**
> Cuando un mes queda fuera de la ventana, todas las filas con ese `AñoMes_Tropa` desaparecen de la hoja — independientemente del `AñoMes_Cierre` en el que estaban.

---

## Estructura de columnas

| Columna | Descripción |
|---|---|
| `AñoMes_Cierre` | El mes en que se corrió el cierre (cuándo se sacó la foto) |
| `AñoMes_Tropa` | El mes original de la operación |
| `ID_Tropa` | El `id_lote` de la operación en el Q95 |
| `Resultado` | `resultado_final` del Q95 en el momento del cierre |
| `Resultado_Ajustado` | Ganancia personal de la operación = `ganancia_personal_venta + ganancia_personal_compra` del snapshot |
| `AC_Vendedor` | `repre_vendedor` del Q95 |
| `AC_Comprador` | `repre_comprador` del Q95 |

**Nota:** `Resultado_Ajustado` no viene del Q95 raw (no existe ahí). Se calcula cruzando con los snapshots locales `src/core/snapshots/cierre_YYYY_MM.json`.

---

## Ejemplo completo: evolución mes a mes

### Cierre de Mayo → `AñoMes_Cierre = 202605`
Ventana: Feb, Mar, Abr, May → 4000 filas nuevas

| AñoMes_Cierre | AñoMes_Tropa | ID_Tropa | Resultado_Ajustado |
|---|---|---|---|
| 202605 | 202602 | 4201 | 8.500 |
| 202605 | 202603 | 4890 | 11.200 |
| 202605 | 202604 | 5123 | 14.300 |
| 202605 | 202605 | 6001 | 16.800 |

**Total en la hoja: ~4000 filas** (primer cierre, no hay historia anterior)

---

### Cierre de Junio → `AñoMes_Cierre = 202606`
Ventana: Mar, Abr, May, Jun → 4000 filas nuevas

**Se aplica la ventana deslizante:**
- Feb (202602) queda **fuera** de la ventana → se borra de donde estaba (cierre 202605)
- Mar, Abr, May siguen **dentro** → las filas del cierre 202605 con esos meses se conservan

| AñoMes_Cierre | AñoMes_Tropa | ID_Tropa | Resultado_Ajustado | Nota |
|---|---|---|---|---|
| ~~202605~~ | ~~202602~~ | ~~4201~~ | ~~8.500~~ | ❌ BORRADA (Feb fuera de ventana) |
| 202605 | 202603 | 4890 | 11.200 | ✅ conservada |
| 202605 | 202604 | 5123 | 14.300 | ✅ conservada |
| 202605 | 202605 | 6001 | 16.800 | ✅ conservada |
| 202606 | 202603 | 4890 | 11.800 | ✅ nueva |
| 202606 | 202604 | 5123 | 15.100 | ✅ nueva |
| 202606 | 202605 | 6001 | 16.500 | ✅ nueva |
| 202606 | 202606 | 7001 | 16.200 | ✅ nueva |

**Total en la hoja: ~7000 filas** (3000 de Mayo + 4000 de Junio)

**Ajuste de Junio:** para cada ID_Tropa en los 3 meses solapados (Mar, Abr, May):
- ID 4890: 11.800 - 11.200 = **+600**
- ID 5123: 15.100 - 14.300 = **+800**
- ID 6001: 16.500 - 16.800 = **-300**

---

### Cierre de Julio → `AñoMes_Cierre = 202607`
Ventana: Abr, May, Jun, Jul → 4000 filas nuevas

**Se aplica la ventana deslizante:**
- Mar (202603) queda **fuera** → se borra de 202605 y de 202606
- Abr, May, Jun siguen **dentro** → se conservan

| AñoMes_Cierre | AñoMes_Tropa | Filas que quedan |
|---|---|---|
| 202605 | 202603 | ❌ BORRADA |
| 202605 | 202604 | ✅ Abr (dentro) |
| 202605 | 202605 | ✅ May (dentro) |
| 202606 | 202603 | ❌ BORRADA |
| 202606 | 202604 | ✅ Abr (dentro) |
| 202606 | 202605 | ✅ May (dentro) |
| 202606 | 202606 | ✅ Jun (dentro) |
| 202607 | 202604 | ✅ nueva Abr |
| 202607 | 202605 | ✅ nueva May |
| 202607 | 202606 | ✅ nueva Jun |
| 202607 | 202607 | ✅ nueva Jul |

**Total en la hoja: ~10.000 filas** (2+2+3+4 × ~1000 = 2000+2000+3000+4000 — menos en la práctica por tropas distintas)

---

### Cierre de Agosto → `AñoMes_Cierre = 202608`
Ventana: May, Jun, Jul, Ago → 4000 filas nuevas

**Se aplica la ventana deslizante:**
- Abr (202604) queda **fuera** → se borra de 202605, 202606 y 202607
- El cierre 202604 (si existiera) desaparecería **entero** porque solo tenía tropas de Abr
- El cierre 202605 queda **solo con May** (las de Abr se borran)

| AñoMes_Cierre | AñoMes_Tropa | Filas que quedan |
|---|---|---|
| 202605 | 202604 | ❌ BORRADA — Abr fuera de ventana |
| 202605 | 202605 | ✅ May (dentro) |
| 202606 | 202604 | ❌ BORRADA |
| 202606 | 202605 | ✅ May (dentro) |
| 202606 | 202606 | ✅ Jun (dentro) |
| 202607 | 202604 | ❌ BORRADA |
| 202607 | 202605 | ✅ May (dentro) |
| 202607 | 202606 | ✅ Jun (dentro) |
| 202607 | 202607 | ✅ Jul (dentro) |
| 202608 | 202605..08 | ✅ 4000 nuevas |

**Total en la hoja: ~10.000 filas** — la hoja se autoregula y nunca crece más allá de este tope.

---

## Patrón estacionario (estado permanente)

Una vez que el sistema lleva 4+ meses corriendo, la hoja siempre tiene exactamente esta estructura:

| Cierre | Tropas guardadas | Filas |
|---|---|---|
| M (actual) | M, M-1, M-2, M-3 | ~4000 |
| M-1 | M-1, M-2, M-3 | ~3000 |
| M-2 | M-2, M-3 | ~2000 |
| M-3 | M-3 | ~1000 |
| M-4 y anteriores | — (borrados) | 0 |
| **Total** | | **~10.000** |

---

## Cálculo del ajuste retroactivo

El ajuste es **siempre el cierre anterior vs el cierre actual** para los meses solapados:

```
Ajuste_ID = Resultado_Ajustado(AñoMes_Cierre=M, ID) - Resultado_Ajustado(AñoMes_Cierre=M-1, ID)
```

- **~3000 tropas** tienen comparación (los 3 meses que se repiten entre cierres consecutivos)
- **~1000 tropas** (el mes más nuevo) no tienen comparación todavía → se compararán el próximo cierre
- Si el ajuste es positivo → el comercial cobró de menos → se suma al sueldo actual
- Si el ajuste es negativo → el comercial cobró de más → se resta (salvo si está en mínimo)

---

## Lógica de código (server.ts)

Al ejecutar `/api/generate` para el cierre del mes M:

```
1. Calcular ventana = {M, M-1, M-2, M-3} como strings YYYYMM
2. Leer snapshots de M, M-1, M-2, M-3 → mapa id_lote → gananciaPersonal
3. Filtrar Q95: solo CONCRETADAS con fecha_operacion dentro de la ventana
4. Construir 4000 filas nuevas con AñoMes_Cierre = M
5. Leer la hoja Ajustes Historico existente
6. Filtrar filas existentes:
   - Descartar las de AñoMes_Cierre = M (se reemplazan con las nuevas)
   - Descartar las donde AñoMes_Tropa NO está en la ventana (expiradas)
   - Conservar el resto
7. Escribir: headers + filas conservadas + filas nuevas
8. Log: "X nuevas + Y conservadas (Z expiradas) → total N filas"
```

---

## Bootstrap inicial (ejecutado en Junio 2026)

Se corrió **una sola vez** para poblar la primera foto del sistema:

```
POST http://localhost:4001/api/bootstrap-historico?mes=202605
```

Resultado: **3.138 filas** con `AñoMes_Cierre = 202605` cubriendo Feb, Mar, Abr, May 2026.

A partir del cierre de Junio (202606), el sistema se autogestiona aplicando la ventana deslizante.

---

## Estado actual (Junio 2026)

- ✅ Bootstrap corrido: 3.138 filas con `AñoMes_Cierre = 202605`
- ✅ Ventana deslizante implementada en `server.ts`
- ✅ Cálculo de ajuste retroactivo actual sigue funcionando igual (por comercial, agregado)
- ⏳ **Próximo cierre (Junio/Julio 2026):** primer uso real de la ventana deslizante → ~7000 filas
- ⏳ **A partir del cierre de Julio:** primera comparación tropa por tropa disponible (202605 vs 202606)
