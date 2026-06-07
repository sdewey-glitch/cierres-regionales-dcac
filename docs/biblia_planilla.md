# Biblia del Motor de Cierres Regionales (V2.0)

Este documento es la única fuente de verdad sobre cómo funciona la matemática y la lógica de negocio dentro del motor automatizado de Cierres Comerciales (`engine.ts`).

## 1. Topes Dinámicos de Rendimiento

El motor **no utiliza el rendimiento duro de la base operativa** para el pago de comisiones si este supera o cae por debajo de ciertos márgenes. Siempre se calcula el `resultado_final_ajustado` antes de pagar:

*   **Faena:** El rendimiento tiene un **Piso de -2%** y un **Tope del 6%**.
*   **Invernada / Directos:** El rendimiento tiene un **Piso de -4.5%** y un **Tope del 8%**.

*Fórmula matemática:* Si el rendimiento real está fuera de los límites, el `resultado_final` de la tropa se recalcula proporcionalmente: 
`Resultado Ajustado = Resultado Original * (Rendimiento Tope / Rendimiento Real)`.

## 2. Doble Punta (Venta vs. Compra)

Toda la plata generada por un lote se distribuye 100% de manera fija, sin importar quién operó:
*   **Representante Vendedor:** Siempre cobra el **2/3** del resultado final ajustado de ese lote.
*   **Representante Comprador:** Siempre cobra el **1/3** del resultado final ajustado de ese lote.
*   Si el representante vendedor y comprador son la misma persona, se le suma 1 tropa al conteo general (no se duplican tropas) y cobra el 100% de la ganancia (2/3 + 1/3).

## 3. Curvas de Escala Logarítmica (Escalonadas)

El motor **no** lee una tabla `.json` estática de escalas. Aplica una fórmula matemática perfecta (la misma que Excel) pero evaluando en "escalones" (redondeando hacia abajo a múltiplos de 250 cabezas).

La fórmula maestra que usa el código es:
`Escala % = Min% + (Max% - Min%) * (1 - (LOG10(CabezasEscalonadas) - LOG10(100)) / (LOG10(MaxCabezas) - LOG10(100)))`

Los parámetros son:
1.  **escalaAC (Asociado Comercial):** Max 30%, Min 15%, Tope 4,000 cabezas.
2.  **escalaPersonal (Para gente de Oficina):** Max 22%, Min 14%, Tope 6,000 cabezas.
3.  **escalaProvincial (Para la Bolsa Regional):** Max 10%, Min 5%, Tope 15,000 cabezas.
4.  **escalaOficina (Para la Bolsa Oficina):** Max 20%, Min 5%, Tope 2,000 cabezas.

## 4. Arquitectura de Bolsas (Regional y Oficina)

El motor divide las ganancias "extra" en dos componentes muy específicos:

### Componente Regional (Bolsa de los Comerciales)
*   **Bolsa:** Suma total de todos los resultados ajustados generados por los comerciales reales que comparten la misma Oficina.
*   **Escala Regional:** A las cabezas totales de esta bolsa se le aplica la `escalaProvincial` (10%/5%).
*   **Tajada:** ¿Cuánto le toca a cada uno? Depende de qué tanto laburó. El cálculo es `Sociedades Únicas que operó el Comercial / Sociedades Únicas que operaron TODOS los comerciales de esa Oficina`.
*   *Componente R = Bolsa * Escala * Tajada*

### Componente Oficina (Bolsa Institucional)
*   Las "Oficinas" operan en la base de datos como si fueran un usuario. Existen tropas directas que caen bajo el usuario "Oficina Rio 4to", por ejemplo.
*   **Bolsa:** Resultados generados por ese pseudo-usuario (operaciones directas).
*   **Escala Oficina:** A esas cabezas se le aplica la `escalaOficina` (20%/5%).
*   **Distribución:** Ese dinero se reparte en **partes iguales** entre todos los miembros de esa Oficina (`% OP` = `1 / Cantidad de Miembros`).
*   *Componente O = Bolsa Institucional * Escala * % OP*

## 5. El Sueldo Bruto y los Mínimos Variables

*   **Total Variable** = Componente Personal + Componente Regional + Componente Oficina.
*   Los mínimos no están duros en el código. El motor cruza la "Categoría" del comercial en el `BDROSTER` (Ej: Top AC, General, etc.) con los mínimos vigentes cargados en la solapa `ESCALAS RAC AC` del Google Sheet.
*   *Sueldo Bruto = Max(Total Variable, Mínimo de Planilla)* (Salvo que tengan modalidad "Sin mínimo").

**⚠️ EXCEPCIÓN — Operario de Carga** (`tipo = "Operario de carga"` + `modalidad = "Fijo"`):
*   Su mínimo es un **salario base siempre garantizado**, no un piso competitivo.
*   El 10% de comisión personal se **SUMA** encima del base — no compite con él.
*   *Sueldo Bruto = Mínimo Base + ComponenteP* (siempre, independientemente de si ComponenteP supera o no el mínimo).
*   **Ejemplo (Alejo Broggi, Mayo 2026):** Base Cat10 $1.456.000 + Variable 10% $1.215.724 = **$2.671.724**.


## 6. Motor de Retroactivos (Ajustes y Snapshots)

Para que la matemática no sufra fugas y sea auditable, el motor guarda una "foto" (Snapshot JSON) en la carpeta `snapshots` del servidor cada vez que se cierra un mes con el detalle lote por lote.

Cuando cerramos un mes (M), el motor recalcula los últimos 3 meses (M-1, M-2, M-3) usando la data fresca operativa.
*   Si el recálculo arroja que el "Sueldo Bruto" debería haber sido mayor (porque entró un lote que antes no estaba cerrado o porque un pesaje cambió y subió el rinde), el motor encuentra un delta positivo contra la base de pagados y lo liquida como ajuste a favor en el mes actual.
*   Si hubo rechazos o anulaciones de lotes viejos, genera un delta negativo.
*   Al tener los Snapshots JSON mes a mes, el sistema permite cruzar el JSON viejo vs el JSON nuevo en el front-end y reportarle al comercial **exactamente** qué tropa varió y por cuánta plata.
