# Arquitectura y Flujo de Datos - Cierres Regionales

Este documento traza el camino de los datos desde que un lote entra a la balanza hasta que se genera el recibo del asociado comercial.

## 1. El Origen: ClickHouse a través de Metabase (Q95)

Toda la base de la verdad nace del sistema operativo primario (Balanza, remates, liquidaciones). Esos datos viajan al Data Warehouse (ClickHouse) y son expuestos para el motor a través de una API de Metabase (Consulta #95).
*   **Punto de extracción:** `src/api/metabase.ts`
*   El motor "fetchea" esta tabla que incluye fecha de operación, cabezas, importes, rendimientos, y la asignación comercial (quién vendió, quién compró, y la oficina).
*   **Gatekeeping:** El script `analyze_spreadsheet.js` sirve para diagnosticar los estados válidos y validar si las métricas de Metabase cruzaron bien la aduana antes de ser procesadas por el motor.

## 2. Los Configs y Matrices Dinámicas (Google Sheets)

La empresa maneja ciertas políticas que varían mes a mes (ej. inflación). En vez de hardcodearlas, el motor las va a buscar al Google Sheet maestro "PLANILLA CONTROL DE MKT Y COMISIONES_2026":
*   **Punto de extracción:** `src/api/sheets.ts`
*   **BDROSTER:** Dicta qué comerciales están activos, en qué categoría están (Top AC, General, etc.) y a qué Oficina pertenecen. (Script: `src/core/normalization.ts`).
*   **ESCALAS RAC AC:** Matriz mensual donde la empresa define el valor de los Mínimos Variables por categoría para combatir la inflación. (Script: `src/core/calculator.ts`).
*   **Gastos & Inputs Manuales:** Deducciones, km recorridos, amortizaciones, o retenciones ad-hoc que el equipo administrativo carga manualmente en las pestañas `BDGASTOS` o `BDINPUTSMANUALES`.

## 3. El Cerebro Matemático (`engine.ts`)

Con los datos operativos (Q95) y los configs corporativos (Sheets) cargados, el `engine.ts` inicializa el **Cierre Dinámico**.

1.  **Iteración de Lotes (Topes y Doble Punta):** Por cada tropa en Q95, el motor analiza el tipo de hacienda (Faena/Invernada) y aplica un techo/piso al rendimiento. Luego parte la rentabilidad generada (2/3 para el lado vendedor, 1/3 para el lado comprador) y se lo inyecta a los comerciales correspondientes guardando un rastro súper detallado (`OperacionDetalle`).
2.  **Mapeo de Bolsas:**
    *   Suma los resultados de todos los agentes que pertenecen a una misma oficina y crea el "Agent Pool".
    *   Aísla las ventas institucionales directas (pseudo-agentes como "Oficina Rio 4to") y crea el "Pseudo-Agent Pool".
3.  **Cálculo Curvo (Escalas Logarítmicas):** Por cada bolsa (Personal, Regional, Oficina), se aplica una fórmula matemática curva escalonada que deduce la comisión porcentual exacta.
4.  **Armado del Sueldo Bruto:** Cruza la suma de componentes con los Mínimos del Sheet.

## 4. El Motor Retroactivo y la Capa de Snapshots (`snapshot.ts`)

Una vez que un mes finaliza, el motor "congela" todo el análisis (los cálculos de todas las tropas de ese mes) en un archivo local: `snapshots/cierre_YYYY_MM.json`.

Cuando se ejecuta el mes actual (ej. Marzo), el motor manda una directiva al `engine.ts`: **"Recalculame Diciembre, Enero y Febrero con los datos de HOY"**.
El engine trae Q95, recalcula y los compara contra los montos históricos pagados (`BDHISTORICO`).
*   La diferencia es el ajuste matemático perfecto (`diferenciaGenerada`).
*   *Bonus Track Técnico:* Como los Snapshots JSON guardan el ADN de cada lote de los meses pasados, la empresa puede auditar en milisegundos qué tropa fue la que generó la alteración del salario retroactivo leyendo esos JSON.

## 5. Salida de Datos (El Frontend y BD_SUELDOS)

El producto final sale por `src/core/writer.ts` en forma de array estructurado (`CommercialResult[]`).
Estos datos son inyectados en la nueva tabla `BD_SUELDOS` (o enviados vía API a la nueva base de datos del Dashboard).
Gracias a que el motor resolvió absolutamente toda la matemática en el Backend, el Frontend de Metabase o de la web (React) solo tiene que renderizar las tablas sin preocuparse por una sola línea lógica de cálculos de escalas o topes.
