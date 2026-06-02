# Propuesta Ejecutiva — Métricas de Red Regional

---

## 1. Introducción y Contexto

**deCampoacampo** (dCaC) opera una red de **Asociados Comerciales (ACs)** que intermedian operaciones ganaderas a lo largo del territorio argentino. Estas operaciones abarcan la compra-venta de ganado en pie en tres categorías principales de hacienda: **Invernada**, **Cría** y **Faena**.

La **Red Regional** es el conjunto de Asociados Comerciales agrupados por zona geográfica, coordinados por figuras de *Regional* y *City Manager*. Su función principal es vincular oferta y demanda de ganado, canalizando volúmenes de cabezas operados mensualmente a través de diversos canales comerciales.

### 1.1 Problemática actual

La plataforma registra cada operación desde dos perspectivas: la del **vendedor** y la del **comprador**. Cuando un lote de ganado es transaccionado, aparece simultáneamente como venta para una parte y como compra para la otra. Sin un mecanismo de deduplicación, los reportes de volumen sufren de **doble conteo**.

> **Regla de oro:** Toda consolidación de métricas de la Red Regional debe **deduplicar operaciones por `id_lote`**. Un lote que aparece en la pata de venta y en la pata de compra se cuenta una sola vez como volumen operado. La distinción entre venta y compra se mantiene exclusivamente para el análisis de cruces de canales.

### 1.2 Objetivo del proyecto

Construir un módulo de **Métricas de Red Regional** dentro del sistema deCampoacampo que permita a la Dirección Comercial y a la Gerencia de Operaciones:

- Visualizar el desempeño mensual y anual de la red por canal comercial.
- Comparar evolución interanual (YoY) con granularidad por categoría de hacienda.
- Identificar patrones de cruce entre canales de venta y compra.
- Detectar tendencias y alertas tempranas de caída de volumen.

---

## 2. Reglas de Clasificación de Canales

El motor de clasificación asigna a cada operación un **canal de venta** (`canal_venta`) y un **canal de compra** (`canal_compra`) en función del rol de los Asociados Comerciales involucrados. Las reglas se evalúan en orden de prioridad descendente.

### 2.1 Tabla de clasificación

| Canal | Regla de Asignación | Prioridad |
|---|---|---|
| **REGIONAL** | La operación tiene un **REG**: un Asociado Comercial cuyo tipo en el roster es `'Regional'` o `'City Manager'`. | 1 (máxima) |
| **DIRECTO** | No tiene REP ni REG asignado. O bien, el REP pertenece a la oficina de **Río 4to (R4)** o **Entre Ríos (ER)** y no hay REG asociado. | 2 |
| **REPRESENTANTE (REPRE)** | Tiene un REP activo, no tiene REG, y el REP **no** pertenece a R4 ni a ER. | 3 |
| **COMISIONISTA** | La operación se clasificaría como Representante según las reglas anteriores, pero el campo `canal` en la base de datos indica explícitamente `'Comisionista'`. | 4 |

### 2.2 Notas aclaratorias

- **REG** = Asociado Comercial con tipo *Regional* o *City Manager* en la tabla `roster_acs`.
- **REP** = Asociado Comercial con tipo *Representante* en la tabla `roster_acs`.
- Las oficinas **R4** (Río Cuarto) y **ER** (Entre Ríos) tienen tratamiento especial porque operan bajo un modelo directo de la empresa, sin intermediación regional.
- La clasificación como **Comisionista** es un *override*: prevalece sobre la clasificación algorítmica cuando el dato de origen ya lo marca explícitamente.

### 2.3 Pseudocódigo de clasificación

```text
function classifyChannel(operación, roster):
    ac = roster.find(operación.ac_id)

    if ac.tipo in ['Regional', 'City Manager']:
        return 'REGIONAL'

    if operación.rep is NULL:
        return 'DIRECTO'

    if operación.rep.oficina in ['R4', 'ER'] and operación.reg is NULL:
        return 'DIRECTO'

    if operación.canal_db == 'Comisionista':
        return 'COMISIONISTA'

    return 'REPRESENTANTE'
```

---

## 3. Estructura del Dashboard

El módulo de Métricas de Red Regional se presenta como un **modal de pantalla completa** accesible desde el menú principal de reportes. Su layout se organiza en tres paneles verticales.

### 3.1 Panel Superior — Resumen Anual

| Componente | Descripción |
|---|---|
| **KPIs principales** | Tarjetas con valores acumulados del año: cabezas totales, cantidad de tropas, costo total e ingreso total de la red. |
| **Listado de cierres** | Grilla interactiva que muestra los cierres mensuales procesados, con indicadores de estado (cerrado, pendiente, en revisión). Al hacer clic en un mes se actualiza todo el dashboard. |
| **Selector de período** | Dropdown que permite comparar contra cualquier período anterior disponible en la base de datos. |

### 3.2 Panel Medio — Comparativa YoY

Este panel presenta **barras horizontales** agrupadas por canal (Regional, Directo, Representante, Comisionista). Cada barra muestra dos segmentos superpuestos:

- **Año actual** (color primario): volumen de cabezas operadas en el período seleccionado.
- **Año anterior** (color atenuado): volumen del mismo período del año previo.

Al costado de cada barra se muestra un **badge de crecimiento** con el porcentaje de variación YoY, coloreado en verde (positivo), rojo (negativo) o gris (sin variación significativa).

### 3.3 Panel Medio — Doble Click: Diagrama de Red y Cruces

Al hacer doble clic en cualquier canal del panel YoY, se expande una vista detallada que contiene:

#### 3.3.1 Diagrama de Red Neuronal

Un grafo dirigido que visualiza el flujo de cabezas entre canales:

- **Nodos de Venta** (columna izquierda): representan los canales desde donde se origina la operación de venta.
- **Nodos de Compra** (columna derecha): representan los canales que reciben la compra.
- **Arcos**: líneas de conexión cuyo grosor es proporcional al volumen de cabezas transferido.

#### 3.3.2 Grilla de Tarjetas de Cruce

Una matriz de tarjetas que muestra cada combinación posible de `canal_venta → canal_compra`:

| | Compra: REGIONAL | Compra: DIRECTO | Compra: REPRE | Compra: COMISIONISTA |
|---|---|---|---|---|
| **Venta: REGIONAL** | Cab / % | Cab / % | Cab / % | Cab / % |
| **Venta: DIRECTO** | Cab / % | Cab / % | Cab / % | Cab / % |
| **Venta: REPRE** | Cab / % | Cab / % | Cab / % | Cab / % |
| **Venta: COMISIONISTA** | Cab / % | Cab / % | Cab / % | Cab / % |

La grilla incluye un **selector de categoría** que permite filtrar por: *Invernada*, *Cría*, *Faena* o *Consolidado* (suma de las tres).

### 3.4 Panel Inferior — Tendencia de 4 Meses

Un gráfico de **barras apiladas** que muestra la distribución por canal durante los últimos cuatro meses cerrados, superpuesto con una **línea de tendencia** que une los totales mensuales.

Debajo de cada barra se indica la **variación porcentual secuencial** respecto al mes anterior, permitiendo identificar rápidamente aceleraciones o desaceleraciones en el volumen operado.

---

## 4. Motor de Datos y Procesamiento

### 4.1 Origen de datos

Los datos provienen de la **query Q95** ejecutada en **ClickHouse** a través de **Metabase**. Esta query extrae el universo completo de operaciones ganaderas con los siguientes campos relevantes:

| Campo | Descripción |
|---|---|
| `id_lote` | Identificador único del lote de ganado |
| `fecha_cierre` | Fecha del cierre mensual |
| `tipo_operacion` | `'VENTA'` o `'COMPRA'` |
| `ac_id` | ID del Asociado Comercial involucrado |
| `cantidad_cabezas` | Número de cabezas en la operación |
| `importe` | Monto monetario de la operación |
| `categoria_hacienda` | `'Invernada'`, `'Cría'` o `'Faena'` |
| `canal` | Canal informado en la base de datos de origen |

### 4.2 Pipeline de procesamiento

El endpoint `/api/metricas-red` ejecuta el siguiente pipeline:

1. **Extracción**: Consulta Q95 filtrada por rango de fechas.
2. **Clasificación**: Para cada operación se ejecuta `classifyChannel()` que consulta el roster de ACs para asignar `canal_venta` y `canal_compra`.
3. **Deduplicación**: Se agrupa por `id_lote` y se toma un único registro por lote para el cómputo de volumen total. La información de venta y compra se preserva por separado.
4. **Agregación**: Se suman cabezas e importes por canal, categoría y período.
5. **Cálculo de ratios**: Se computan los KPIs derivados (CCC', bonificaciones, costo/ingreso).
6. **Matriz de cruces**: Se construye la tabla de cruces `canal_venta × canal_compra` con desglose por categoría de hacienda.

### 4.3 Función `classifyChannel`

```javascript
function classifyChannel(operacion, roster) {
    const ac = roster.find(r => r.ac_id === operacion.ac_id);
    if (!ac) return 'DIRECTO';

    if (['Regional', 'City Manager'].includes(ac.tipo)) {
        return 'REGIONAL';
    }

    const rep = roster.find(r => r.ac_id === operacion.rep_id);
    if (!rep) return 'DIRECTO';

    if (['R4', 'ER'].includes(rep.oficina) && !operacion.reg_id) {
        return 'DIRECTO';
    }

    if (operacion.canal_db === 'Comisionista') {
        return 'COMISIONISTA';
    }

    return 'REPRESENTANTE';
}
```

---

## 5. Diagrama de Flujo de Red (Neuronal)

El diagrama de flujo de red visualiza cómo se distribuyen las cabezas de ganado entre los canales de venta y compra. Su diseño sigue el patrón de un **grafo bipartito dirigido**.

### 5.1 Estructura del diagrama

```text
┌─────────────────┐                          ┌─────────────────┐
│                 │                          │                 │
│   REGIONAL      │─── 12.500 cab ─────────▶│   REGIONAL      │
│   (Venta)       │─── 3.200 cab ──────┐    │   (Compra)      │
│                 │                    │    │                 │
├─────────────────┤                    │    ├─────────────────┤
│                 │                    └───▶│                 │
│   DIRECTO       │─── 8.100 cab ─────────▶│   DIRECTO       │
│   (Venta)       │─── 1.800 cab ─────┐    │   (Compra)      │
│                 │                    │    │                 │
├─────────────────┤                    │    ├─────────────────┤
│                 │                    └───▶│                 │
│   REPRESENTANTE │─── 5.400 cab ─────────▶│   REPRESENTANTE │
│   (Venta)       │                         │   (Compra)      │
│                 │                         │                 │
├─────────────────┤                         ├─────────────────┤
│                 │                         │                 │
│   COMISIONISTA  │─── 2.100 cab ─────────▶│   COMISIONISTA  │
│   (Venta)       │                         │   (Compra)      │
│                 │                         │                 │
└─────────────────┘                         └─────────────────┘
```

### 5.2 Reglas de visualización

- El **grosor del arco** es proporcional al volumen de cabezas: a mayor cantidad, más gruesa la línea.
- Los **colores de los arcos** se asignan por categoría de hacienda cuando se aplica el filtro:
  - Invernada → azul (`#2b6cb0`)
  - Cría → verde (`#38a169`)
  - Faena → naranja (`#dd6b20`)
  - Consolidado → gris oscuro (`#4a5568`)
- Se muestran **tooltips** al hacer hover sobre los arcos con el detalle: cantidad de cabezas, porcentaje del total y categoría.
- El filtro de categoría actúa de forma inmediata, redibujando el diagrama al seleccionar una nueva opción.

---

## 6. KPIs y Ratios

El módulo de Métricas de Red Regional calcula y presenta los siguientes indicadores clave de desempeño.

### 6.1 Indicadores primarios

| KPI | Fórmula | Descripción |
|---|---|---|
| **Cabezas totales** | `SUM(cantidad_cabezas)` deduplicada por `id_lote` | Sumatoria total de cabezas operadas, contando cada lote una sola vez independientemente de que aparezca como venta y como compra. |
| **Tropas operadas** | `COUNT(DISTINCT id_tropa)` | Cantidad de tropas únicas movilizadas en el período. |
| **Importe bruto** | `SUM(importe)` | Volumen monetario total de las operaciones. |

### 6.2 Ratios analíticos

| Ratio | Fórmula | Interpretación |
|---|---|---|
| **CCC' (Compra/Venta)** | `cabezas_compra / cabezas_venta` por canal | Mide el balance entre compras y ventas en cada canal. Un CCC' > 1 indica que el canal es comprador neto; < 1 indica vendedor neto. |
| **Bonificaciones %** | `SUM(bonificaciones) / SUM(importe) × 100` | Porcentaje del importe total que se destina a bonificaciones comerciales. Valores superiores al 5% requieren revisión. |
| **Costo Red / Ingreso** | `costos_fijos_red / ingresos_totales × 100` | Eficiencia operativa de la red. Mide qué porcentaje de los ingresos se consume en costos fijos (sueldos, comisiones base, estructura). |
| **Crecimiento YoY %** | `(vol_actual - vol_anterior) / vol_anterior × 100` | Variación interanual del volumen de cabezas operadas, calculada por canal para identificar tendencias diferenciadas. |

### 6.3 Umbrales de alerta

| Indicador | Umbral Verde | Umbral Amarillo | Umbral Rojo |
|---|---|---|---|
| CCC' | 0.8 – 1.2 | 0.5 – 0.8 ó 1.2 – 1.5 | < 0.5 ó > 1.5 |
| Bonificaciones % | < 3% | 3% – 5% | > 5% |
| Costo Red / Ingreso | < 15% | 15% – 25% | > 25% |
| Crecimiento YoY | > 5% | -5% a 5% | < -5% |

---

## 7. Próximos Pasos

### 7.1 Corto plazo (Q3 2026)

- **Filtros por oficina y región geográfica**: Permitir segmentar las métricas por la oficina del AC y la región donde se realiza la operación, habilitando análisis localizados.
- **Exportación automatizada**: Generar reportes mensuales en PDF de forma programática al cierre de cada período, distribuyéndolos por email a los stakeholders definidos.

### 7.2 Mediano plazo (Q4 2026)

- **Alertas automáticas de caída de volumen**: Implementar un sistema de notificaciones que dispare alertas cuando el volumen operado de un canal caiga más de un 10% respecto al promedio móvil de los últimos 3 meses.
- **Drill-down por AC**: Desde la grilla de cruces, permitir expandir hasta el nivel de Asociado Comercial individual para identificar quién genera cada flujo.

### 7.3 Largo plazo (2027)

- **Modelo predictivo**: Entrenar un modelo de series temporales que proyecte el volumen esperado por canal para los próximos 3 meses, mostrando bandas de confianza en el dashboard.
- **Integración con P&L**: Cruzar las métricas de la Red Regional con el estado de resultados (P&L) para calcular la rentabilidad neta por canal.

---

*Documento preparado por el equipo de Desarrollo de Producto — deCampoacampo.*
*Clasificación: Confidencial — Uso Interno.*
