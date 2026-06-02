const fs = require('fs');
const content = `## Índice

- [1. Resumen Ejecutivo](#1-resumen-ejecutivo)
  - [Indicador clave: Bonificación Oculta General](#indicador-clave-bonificacion-oculta-general)
- [2. Estructura y Red Comercial](#2-estructura-y-red-comercial)
  - [Alcance Geográfico y Oficinas](#alcance-geografico-y-oficinas)
  - [Perfil de la Fuerza de Ventas](#perfil-de-la-fuerza-de-ventas)
- [3. Modelos Contractuales (Quién es Quién)](#3-modelos-contractuales-quien-es-quien)
  - [Modelo Completo (Estándar Regional)](#modelo-completo-estandar-regional)
  - [Modelo Híbrido (City Manager)](#modelo-hibrido-city-manager)
  - [Modelo Variable (Representantes / Sin Mínimo)](#modelo-variable-representantes-sin-minimo)
  - [Modelo Operario de Carga (Personal Logístico)](#modelo-operario-de-carga-personal-logistico)
  - [Modelo Corporate (Excepciones Directivas)](#modelo-corporate-excepciones-directivas)
  - [Matriz Resumen de Beneficios](#matriz-resumen-de-beneficios)
- [4. Mecánica de Liquidación (Cómo se Calcula)](#4-mecanica-de-liquidacion-como-se-calcula)
  - [El Funnel de Cálculo](#el-funnel-de-calculo)
  - [Las Tres Bolsas de Comisiones](#las-tres-bolsas-de-comisiones)
  - [La Regla de Oro: Mínimos Garantizados](#la-regla-de-oro-minimos-garantizados)
  - [Tablas de Escalas y Curvas](#tablas-de-escalas-y-curvas)
- [5. Política de Gastos y Deducciones](#5-politica-de-gastos-y-deducciones)
  - [Gastos Operativos (Tarjeta Mendel y Reintegros)](#gastos-operativos-tarjeta-mendel-y-reintegros)
  - [Amortizaciones y Movilidad (Vehículos)](#amortizaciones-y-movilidad-vehiculos)
- [6. Casos Prácticos de Liquidación](#6-casos-practicos-de-liquidacion)
- [7. Herramientas Digitales](#7-herramientas-digitales)
- [8. Glosario](#8-glosario)

<div style="page-break-after: always;"></div>

## 1. Resumen Ejecutivo

deCampoacampo opera una red comercial distribuida por toda Argentina que gestiona un volumen promedio de **35.000 a 40.000 cabezas de ganado** mensuales, integrando operaciones de Invernada y Faena. 

El sistema de liquidación de comisiones regionales calcula mensualmente la remuneración variable de cada integrante mediante un motor automatizado, asegurando transparencia, escalabilidad y alineación de incentivos entre la empresa y su fuerza de ventas.

### Indicador clave: Bonificación Oculta General

El parámetro financiero rector de la política comercial es la Bonificación Oculta, que mide el costo comercial estructural sobre el volumen de negocio generado.

> **Fórmula:** Bonificación Oculta = (Sueldos + Gastos Personales + Gastos Oficinas) / (Importe Vendedor + Bonificaciones)

**Objetivo Directivo: Mantener el ratio en ≈ 0,5% del volumen operado.**

---

## 2. Estructura y Red Comercial

Antes de comprender cómo se liquida, es fundamental entender la geografía y conformación de la fuerza de ventas. El equipo está compuesto por aproximadamente **30 Asociados Comerciales y Operativos** con cobertura nacional.

### Alcance Geográfico y Oficinas

La red cubre negocios a lo largo de **9 provincias argentinas**, concentrando el volumen principal en la región pampeana. Para capilarizar el esfuerzo, la empresa divide su estructura en **6 Oficinas Regionales / Unidades de Negocio**:
1. Río Cuarto (Córdoba)
2. Bavio (Buenos Aires)
3. Entre Ríos
4. Independencia (Unidad flotante/Mixta)
5. Buenos Aires Central
6. Ayacucho (Buenos Aires)

### Perfil de la Fuerza de Ventas

Los ~30 integrantes no operan bajo las mismas condiciones. Para optimizar el riesgo laboral y comercial de la empresa, la fuerza de trabajo se clasifica en distintos perfiles:
- **Agentes Integrales:** Comerciales full-time con sede en una Oficina Regional.
- **KAM (Corporate):** Ejecutivos B2B dedicados a frigoríficos o grandes cuentas.
- **Representantes:** Agentes libres con cartera propia.
- **Logística de Campo:** Operarios encargados de pesaje, revisión y carga.

---

## 3. Modelos Contractuales (Quién es Quién)

Esta sección define las reglas contractuales macro. El salario mensual de un agente dependerá de a cuál de estos cinco modelos esté adscrito según su acuerdo de Recursos Humanos.

### Modelo Completo (Estándar Regional)
Diseñado para comerciales consolidados con dedicación exclusiva bajo una Oficina Regional.
- **Mínimo Garantizado:** Tienen salarios piso asegurados altos (Categoría 1 o 3).
- **Acceso a Comisiones:** Acceden al **100%** de su comisión personal, participan en el reparto de la **Bolsa Regional** y cobran dividendos institucionales de su **Oficina**.

### Modelo Híbrido (City Manager)
Para comerciales de alto nivel o gerentes zonales en transición.
- **Mínimo Garantizado:** Poseen un mínimo intermedio negociado (Categorías 4 o 5).
- **Acceso a Comisiones:** Cobran su comisión personal, pero **NO** participan de las bolsas Regionales ni de Oficina.

### Modelo Variable (Representantes / Sin Mínimo)
Representantes externos sin exclusividad de marca que operan con cartera propia.
- **Mínimo Garantizado:** **$0 (Sin mínimo).** La empresa no asume riesgo.
- **Acceso a Comisiones:** Cobran exclusivamente la comisión personal de lo que generan. Al no pertenecer a una estructura física integral, **NO** participan de las bolsas Regionales ni de Oficina.

### Modelo Operario de Carga (Personal Logístico)
Técnicos de campo (pesadores, revisadores) que no originan negocios pero ejecutan la logística.
- **Mínimo Garantizado:** Salarios asegurados (Categorías 7 a 10).
- **Acceso a Comisiones:** Poseen una comisión personal fija del 10% sobre el negocio, pero **NO** participan de incentivos Regionales ni de Oficina.

### Modelo Corporate (Excepciones Directivas)
Perfiles KAM (Key Account Managers) con grandes cuentas institucionales.
- **Mínimo Garantizado:** Muy alto (Categoría 2, equivalente a Top AC).
- **Acceso a Comisiones:** Poseen reglas customizadas inyectadas por Dirección. Por defecto, **NO** participan de bolsas Regionales ni de Oficina, ya que operan cuentas nacionales no territoriales.

### Matriz Resumen de Beneficios

| Modelo Contractual | Comisión Personal | Acceso Regional | Acceso Oficina | Mínimo Garantizado |
|:---:|:---:|:---:|:---:|:---:|
| **Completo** | Escala AC (15-30%) | **Sí** | **Sí** | Categorías 1 y 3 |
| **Híbrido** | Escala AC (15-30%) | No | No | Categorías 4 y 5 |
| **Variable** | Escala AC (15-30%) | No | No | Sin Mínimo ($0) |
| **Operario Carga** | Fija (10%) | No | No | Categorías 7 a 10 |
| **Corporate** | Customizada | Excepción | Excepción | Categoría 2 |

---

## 4. Mecánica de Liquidación (Cómo se Calcula)

### El Funnel de Cálculo

Para entender cómo el negocio genera la comisión, el motor sigue este proceso:
1. **P&L de la Tropa:** Se calcula la rentabilidad bruta de la operación. Se aplican topes para proteger los márgenes de la empresa.
2. **2/3 y 1/3:** El P&L ajustado se divide asignando 2/3 a la punta vendedora y 1/3 a la punta compradora.
3. **Escala del Agente:** Sobre esa asignación, se extrae el porcentaje correspondiente al agente según las siguientes "bolsas".

### Las Tres Bolsas de Comisiones

1. **Componente Personal:** Remuneración directa por operaciones cerradas personalmente. Usa una escala logarítmica que premia volumen.
2. **Componente Regional:** Remuneración por territorialidad. Se forma con un porcentaje de todo el volumen de la provincia. Cada agente toma una "Tajada" equivalente a la cantidad de clientes (CUITs) distintos que haya operado.
3. **Componente Oficina:** Dividendo originado por operaciones institucionales "directas" que suceden en la zona geográfica de la oficina. Se reparte en partes iguales entre los miembros del modelo "Completo" de esa sucursal.

### La Regla de Oro: Mínimos Garantizados

La empresa asegura un piso salarial (Mínimo Garantizado). Sin embargo, existe una condición excluyente para proteger la productividad:

Para que un comercial con Modelo Completo pueda cobrar los premios adicionales (Componente Regional y Oficina), **su Componente Personal debe ser capaz de superar, por sí sola, su Mínimo Garantizado.**

- **Si SUPERA el mínimo:** Cobra Mínimo + Variable Personal + Regional + Oficina.
- **Si NO SUPERA el mínimo:** La empresa paga la diferencia para llegar al mínimo, pero como castigo, el comercial **PIERDE** sus comisiones Regionales y de Oficina ese mes.

### Tablas de Escalas y Curvas

**1. Curva Logarítmica AC (Componente Personal):** Retención descendente para fomentar alto volumen.
* 1 a 200 cab: **30,0%**
* 201 a 500 cab: **26,3%**
* 501 a 1.000 cab: **21,8%**
* Más de 4.000 cab: **14,6%** (Tope Mínimo)

**2. Curva Provincial (Bolsa Regional):**
* 1 a 1.000 cab: **10,0%**
* Más de 10.000 cab: **5,0%**

---

## 5. Política de Gastos y Deducciones

El Sueldo Bruto de comisiones se ajusta luego según las políticas de gastos, amortizaciones y reintegros para llegar al "Monto Neto a Facturar".

### Gastos Operativos (Tarjeta Mendel y Reintegros)

- **Tarjeta Mendel:** La empresa adelanta el saldo. Estos consumos NO se descuentan de la liquidación final, sino que se rinden paralelamente.
- **Reintegros de Bolsillo:** Pagos aprobados realizados con dinero personal se abonan del 1 al 10 del mes siguiente.
- **Regla Excluyente:** **Sin foto del comprobante en el sistema, no hay reintegro ni aprobación del gasto.**

### Amortizaciones y Movilidad (Vehículos)

1. **Vehículos Corporativos (Flota dCaC):** El comercial NO cobra por kilómetro recorrido ni sufre descuentos por amortización. Todos los gastos (patente, seguro) corren por cuenta de la empresa.
2. **Vehículos Propios:** El comercial asume el desgaste. La empresa le abona un plus económico (Reintegro de Movilidad) por cada kilómetro recorrido. La tarifa varía según el tipo de vehículo (Auto Estándar, SUV, Camioneta Pickup).

---

## 6. Casos Prácticos de Liquidación

A continuación, tres ejemplos anónimos de cómo impactan las reglas en el mundo real.

**Ejemplo 1: Un Top AC de Alto Volumen (Modelo Completo)**
* **Datos:** Generó mucha ganancia personal ($19M) y superó ampliamente su mínimo ($3.9M).
* **Impacto:** Cobra su Mínimo + Variable Personal ($15.6M) + Componente Regional ($5.9M) + Componente Oficina ($1.2M). **Sueldo Bruto: $26.6M**. Sus gastos de KMS y Mendel se liquidan por separado.

**Ejemplo 2: Un General de Bajo Rendimiento (Modelo Completo)**
* **Datos:** Mes malo, su comisión personal arrojó $600.000. Su Mínimo Garantizado es de $1.9M.
* **Impacto:** **No superó la Regla de Oro**. La empresa cubre el hueco hasta $1.9M. Al no superar el piso, **pierde el derecho** a cobrar la bolsa Regional y la de Oficina. **Sueldo Bruto: $1.9M (Fijo).**

**Ejemplo 3: Un Representante Libre (Modelo Variable)**
* **Datos:** Cerró operaciones que generaron $4.1M de comisión personal. Su Mínimo Garantizado es $0.
* **Impacto:** Al ser variable, cobra exactamente lo que produjo ($4.1M). No participa de bolsas Regionales ni de Oficina por no tener el Modelo Completo. **Sueldo Bruto: $4.1M.**

---

## 7. Herramientas Digitales

Para dar seguimiento a estas políticas y visualizar las liquidaciones en vivo, deCampoacampo utiliza un portal digital exclusivo.

> [!TIP]
> **Acceso a la Web App y Simulador de Cierres**  
> En el entorno de desarrollo local (tu computadora), la app está corriendo en **[http://localhost:5174/](http://localhost:5174/)**  

El portal cuenta con:
- **Dashboard de Cierres:** Recibo interactivo con desglose lote por lote.
- **Simulador Operativo:** Herramienta para RRHH que permite pre-visualizar cómo cerrará el mes en curso antes de realizar los pagos.

---

## 8. Glosario

| Término | Definición |
|---------|-----------|
| **Tropa** | Lote de animales operado. Unidad mínima de operación. |
| **Cabezas** | Cantidad de animales en una tropa. |
| **Resultado** | Ganancia bruta de la operación antes de comisiones. |
| **Doble Punta** | Operación donde un mismo comercial es Vendedor y Comprador. |
| **Bolsa Regional** | Pool de dinero compartido por toda la Oficina. |
| **Tajada** | Proporción de la Bolsa Regional ganada según CUITs operados. |
| **Pseudo-agente** | Entidad virtual (Oficina) que acumula ventas directas institucionales. |
| **Mendel** | Plataforma y tarjeta corporativa para gastos de campo. |

---
*Documento generado por el Sistema de Cierres Regionales — deCampoacampo © 2026*
`;

const dest = require('path').join(__dirname, '..', '..', 'brain', '57477c14-f997-40d0-a1db-8688bc845850', 'manual_ejecutivo.md');
fs.writeFileSync(dest, content);
console.log('Manual updated!');
