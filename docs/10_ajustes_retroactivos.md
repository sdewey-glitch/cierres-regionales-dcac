## Motor de Ajustes Retroactivos (Estático vs. Dinámico)

En el negocio ganadero, es altamente frecuente que las operaciones sufran modificaciones después de haber cerrado el mes (ej. ajustes de pesaje en frigorífico, cambios en el importe final, anulaciones o tropas que entran con demora). Para que estas variaciones no se pierdan financieramente, el sistema cuenta con un motor de reliquidación auditado desde la hoja **"Ajustes"** del Google Sheets maestro.

### La Lógica: Estático vs. Dinámico

El proceso de ajuste no altera los recibos ya pagados, sino que liquida las diferencias en el mes en curso. El motor analiza una ventana temporal móvil de los **últimos 3 meses** y realiza una comparación matemática:

1. **Componente Personal Real Estático:** Es el valor "congelado" de la liquidación original. Representa exactamente lo que el sistema calculó y lo que se le pagó al comercial en ese momento del pasado.
2. **Componente Personal Dinámico:** Es el recálculo simulado de esos mismos meses anteriores, pero **a valores de hoy**. Es decir, cómo hubiese sido esa liquidación si la tropa modificada hubiese tenido la información correcta desde el día uno.

### Suma y Resta al P&L Variable

El motor resta el valor *Estático* del valor *Dinámico* para obtener el "Delta" (la diferencia de dinero).
- Si el ajuste generó más ganancia (ej. subió el peso), el Delta es **positivo** y se le **Suma** como premio retroactivo al sueldo variable del mes actual.
- Si el ajuste arrojó menos ganancia (ej. un rechazo), el Delta es **negativo** y se le **Resta** del sueldo variable actual.

### Blindaje del Mínimo Garantizado (Regla de Exclusión)

Existe una regla financiera vital para proteger el salario base del agente:
> **Si el comercial se encuentra cobrando su Mínimo Garantizado en el mes actual, los ajustes retroactivos negativos NO afectan sus resultados.**

La red de seguridad asume el impacto. Si el comercial no logró superar la "Regla de Oro" con su producción actual y la empresa le está inyectando capital para cubrir el piso, no se le pueden deducir penalidades de tropas pasadas sobre ese Mínimo. El ajuste retroactivo solo impacta directamente cuando el agente se encuentra en zona de cobro 100% variable (habiendo superado su mínimo).
