# Modalidades y Categorías de Mínimos (Guía HR & Operaciones)

Este documento detalla cómo se configuran las Categorías en la base de datos de comerciales (`BDROSTER`) y cómo impactan en los Mínimos Variables que el sistema lee de la solapa `ESCALAS RAC AC`.

## El Sistema de Mínimos Garantizados
El motor cruza la **Categoría (1 al 10)** asignada a cada comercial en el Roster con la fila correspondiente al mes actual en la planilla `ESCALAS RAC AC`. El comercial siempre cobrará el monto mayor entre su Producción Variable y su Mínimo de Categoría.

### Esquemas Estándar
Son las columnas fijas de la planilla que representan los escalafones tradicionales de la empresa:
*   **Categoría 1 (Top AC):** Agentes de élite con el mínimo garantizado más alto de la escala corporativa.
*   **Categoría 2 (Corp):** Agentes corporativos o perfiles institucionales.
*   **Categoría 3 (General):** Modalidad de entrada para la mayoría de los agentes en campo. Tienen un mínimo estándar de protección.

### Esquemas Híbridos y Excepciones
Existen esquemas intermedios, como la modalidad **"Completo Hibrido"** (usado históricamente por algunos comerciales como Sebastián Saparrat).
*   **Regla Matemática:** Cobran la componente personal normalmente, pero su Componente Regional se liquida al **50%** de lo que les correspondería por su tajada, y tienen **0%** de participación en la Bolsa de la Oficina (Directas).
*   *Nota:* Para activarlo, la columna Modalidad en el Roster debe decir la palabra "Hibrido".
*   **Categoría 4 (Acuerdo):** Se utiliza para comerciales que negociaron un mínimo específico distinto al estándar. El nombre del comercial suele estar documentado en la cabecera de la columna (Fila 1 o 2).
*   **Categoría 5 (Híbrido):** Se utiliza para modelos mixtos o agentes en transición. Al igual que el acuerdo, suele corresponder a casos puntuales documentados en la cabecera.

### Esquemas "A Riesgo" (Cero Mínimo)
*   **Categoría 6 (Sin Mínimo):** El comercial cobra exclusivamente lo que produce. La columna en la planilla arroja $0 de mínimo. Si tiene un mes sin ventas, no cobra red de seguridad. Ideal para comisionistas externos o part-time.

### Esquemas Operativos (Operarios de Carga)
Los operarios tienen escalas de mínimos distintas que se actualizan mensualmente, y su componente personal (ganancia directa) suele estar fijada en un porcentaje menor (ej. 10%) en lugar de seguir la curva logarítmica plena. 
*   **Categoría 7 (Operario Carga 1):** Nivel inicial.
*   **Categoría 8 (Operario Carga 2):** Nivel intermedio.
*   **Categoría 9 (Operario Carga 3):** Nivel avanzado.
*   **Categoría 10 (Operario Carga 4):** Nivel superior.

> **⚠️ Regla crítica (diferencia con ACs):** Para los Operarios de Carga, el mínimo garantizado **NO funciona como piso** (como sí ocurre con los ACs regulares). En cambio, funciona como un **salario base fijo siempre pagado**, al que se le **suma** el 10% del resultado variable. Es decir: `Total = Mínimo Fijo + Variable (10%)`. Ambos conceptos siempre coexisten y se acumulan.

---
*Nota Operativa:* Cuando se contrata a un nuevo comercial bajo un "Acuerdo Especial", se debe cargar su monto fijo mensual en la columna de "Acuerdo" o "Híbrido" de la solapa `ESCALAS RAC AC`, y asignarle la Categoría 4 o 5 en el Roster. El sistema automáticamente le leerá ese mínimo todos los meses sin necesidad de modificar el código.
