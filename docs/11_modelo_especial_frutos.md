## Modelo Especial: KAM (Key Account Manager)

Este capítulo documenta las reglas comerciales y la estructura de comisiones aplicable al modelo especial de **Lucila Frutos** (KAM / Grandes Cuentas). Debido a la naturaleza corporativa de su gestión y el relacionamiento con la industria, el motor de cierres procesa su liquidación con un esquema diferencial al de los asociados regionales.

### 1. Estructura Fija y Mínimo Garantizado

El modelo establece una estructura salarial base con una cláusula de protección (subsidio) durante el período de adaptación:

- **Sueldo Básico:** $ 1.750.000
- **Garantía Mensual (Tope):** $ 2.500.000
- **Regla de Subsidio Transitorio:** El sistema inyecta automáticamente hasta **$ 750.000 brutos** adicionales siempre y cuando el resultado mensual total (Básico + Variables) no supere la línea de los $ 2.500.000. Esta regla aplica estrictamente durante los primeros 6 meses de gestión.
- **Cobertura Operativa:** El monto total mensual incluye OSDE, Material de Trabajo y Variables Logísticas.

### 2. Estructura Variable (Comisiones)

El sistema de comisiones variables (La "Tajada") se compone de **tres componentes específicos**. 
Para todos los casos, el porcentaje a liquidar se calcula estrictamente sobre el campo **`resultado_fina_topeado`** de la operación.

#### Componente 1: Grandes Cuentas (GC)
Aplica a los negocios de volumen cerrados directamente con grandes corporaciones y frigoríficos del padrón pre-aprobado.
- **Venta:** 4% del `resultado_fina_topeado`
- **Compra:** 2% del `resultado_fina_topeado`

#### Componente 2: Mermas
Aplica a las operaciones derivadas de recupero o mermas operativas de plantas específicas.
- **Venta para Faena:** 20% del `resultado_fina_topeado`
- **Venta para Invernada:** 15% del `resultado_fina_topeado`

#### Componente 3: Activación CIs (Compradores Inactivos)
Aplica a los negocios generados por la reactivación de sociedades y plantas sin actividad reciente en la red.
- **Compra:** 10% del `resultado_fina_topeado`

---

### 3. Reglas de Negocio y Trazabilidad (Crítico)

Para que el motor de cierres liquide correctamente las comisiones y evite solapamientos o pagos duplicados, se aplican dos reglas excluyentes:

#### A. Vigencia Temporal de 6 Meses (Overriding)
La base de datos mantiene un listado vivo donde se carga la Razón Social, CUIT y **Fecha de Asignación** para los componentes de Mermas y Activación CI. 
- **La Regla:** A partir de la fecha de asignación en esa lista, KAM **comisiona durante los 6 meses posteriores**. 
- Durante esta ventana de tiempo, el motor le asigna la comisión por Merma o Activación **sin importar qué asociado comercial figure cargado en la operación**. El padrón corporativo tiene prioridad ("overrides" a la región).

#### B. Prevención de Doble Pago (Anti-Double-Dipping)
Existe un escenario donde KAM puede figurar legalmente cargada como "Asociada Comercial" directo en el legajo de la operación.
- **La Regla:** Si ella figura nominalmente en el legajo como Asociada Comercial, **el motor NO contabiliza esa tropa bajo el componente de Grandes Cuentas**. 
- De esta manera se neutraliza el riesgo de que el sistema le pague el componente regional normal y, en paralelo, se le sume un 4% adicional por considerarlo "Gran Cuenta", evitando que se abone doble comisión por el mismo negocio.
