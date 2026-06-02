# Perfil Comercial y Configuración de Roster

Para que el motor de liquidaciones asigne correctamente las comisiones, cada persona debe estar dada de alta y configurada de forma precisa en la base de datos de comerciales (`BDROSTER`).

Cualquier alta nueva, baja, o cambio de esquema de un comercial, **debe editarse en esa planilla siguiendo estrictamente estos campos:**

## Campos Obligatorios del Comercial

*   **Asociado (Nombre Completo):** Debe coincidir exactamente con el nombre de la persona tal cual figura en los lotes de la base operativa (Metabase / Q95). Si hay una letra distinta, el motor no le asignará las ventas.
*   **Código:** ID interno o número de legajo del comercial.
*   **Provincia:** Región geográfica a la que pertenece. Esto define en qué **Bolsa Regional** entra a participar (Ej: *Cordoba*, *Buenos Aires*).
*   **Oficina:** El grupo físico o lógico al que pertenece (Ej: *Oficina Rio 4to*). Esto es **CRÍTICO** porque define:
    1. Quiénes son sus compañeros para competir por la *Tajada* de la Bolsa Regional.
    2. En cuántas partes se divide el pozo del Componente de Oficina (Ej. si son 6 miembros en la Oficina Río 4to, cobra el 16.67% de los directos de la oficina).
*   **Tipo:** 
    *   Si es un agente real, se usa `AC` o `Representante`.
    *   Si es una entidad institucional que solo agrupa ventas directas, debe contener la palabra `Oficina` (Ej. *Oficina AC*). Esto le dice al motor que NO le pague mínimos ni regionales, sino que guarde su plata para repartirla entre los humanos de su oficina.
*   **Modalidad:** Define si el agente opera bajo riesgo o con paracaídas.
    *   Ingresar `Sin minimo` anula el cobro de la red de contención.
    *   Ingresar `Operario de carga` le fija la comisión personal en 10%.
*   **Categoría (Numérica):** Del **1 al 10**. Este número vincula al agente con la solapa `ESCALAS RAC AC` para saber cuántos pesos le corresponden de Sueldo Bruto Mínimo Garantizado en el mes actual. *(1 = Top AC, 3 = General, 6 = Sin Mínimo).*

## Checklist ante cambios:
1.  **Nuevo Ingreso:** Asegurarse de asignarle una *Oficina* válida, sino no participará en el reparto de las ventas directas institucionales ni tendrá bolsa regional.
2.  **Cambio de Oficina / Traslado:** Simplemente modificar el campo *Oficina* y *Provincia*. El motor re-calculará todo automáticamente en el próximo cierre.
3.  **Bajas:** Eliminar o marcar inactivo en el Roster para que el motor deje de considerarlo (Nota: Si se le debe pagar un retroactivo de un mes pasado, debe mantenerse temporalmente hasta liquidar los arrastres M-1/M-2/M-3).
