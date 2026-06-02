## Histórico y Padrón de Mínimos Garantizados

Para mantener un registro auditable de la evolución salarial frente a la inflación y los ajustes corporativos, el motor de cierres se alimenta de una base de datos histórica.

### La Hoja "ESCALAS RAC AC"

Todos los salarios piso (Mínimos Garantizados) están centralizados en la pestaña **ESCALAS RAC AC** del Google Sheets maestro. 

El sistema utiliza un formato de llave temporal estricto: **`AÑOMES`** (por ejemplo, `202401` para Enero 2024). 
Gracias a esta nomenclatura, el motor puede saber exactamente cuánto era el mínimo vigente para cada "Categoría" en el mes exacto en el que ocurrió una operación, permitiendo recalcular retroactivos de forma perfecta sin que un aumento salarial actual distorsione una liquidación pasada.

### Evolución por Rango (Categorías)

La empresa agrupa a su fuerza comercial en distintas categorías, lo que simplifica la actualización masiva de mínimos. A continuación se presenta una extracción en vivo de la base de datos mostrando la evolución de los últimos 6 meses (valores históricos por categoría operativa):

| Período | TOP AC | CORP | GENERAL | ACUERDO | HIBRIDO | SIN MINIMO | Op. Facundo A. | Op. Facundo R. | Op. Augusto R. | Op. Alejo B. |
|---|---|---|---|---|---|---|---|---|---|---|
| **202511** | $3.533.183 | $3.543.750 | $1.766.592 | $2.160.000 | $1.442.715 | - | - | - | - | - |
| **202512** | $3.533.183 | $3.543.750 | $1.766.592 | $2.160.000 | $1.442.715 | - | $1.404.000 | $1.200.000 | - | - |
| **202601** | $3.851.170 | $3.862.688 | $1.925.585 | $2.160.000 | $1.572.559 | - | $1.530.360 | $1.300.000 | $1.450.000 | $1.300.000 |
| **202602** | $3.851.170 | $3.862.688 | $1.925.585 | $2.160.000 | $1.572.559 | - | $1.530.360 | $1.300.000 | $1.450.000 | $1.300.000 |
| **202603** | $3.851.170 | $3.862.688 | $1.925.585 | $2.160.000 | $1.572.559 | - | $1.530.360 | $1.300.000 | $1.450.000 | $1.300.000 |
| **202604** | $3.851.170 | $3.862.688 | $1.925.585 | $2.160.000 | $1.572.559 | - | $1.530.360 | $1.300.000 | $1.450.000 | $1.300.000 |


Al centralizar el historial en este registro, Recursos Humanos tiene un panel de control instantáneo para auditar cuándo y por qué monto se actualizaron las escalas de la red comercial.


### Padrón Oficial de Categorías (HR)

El siguiente padrón (extraído en vivo del `Roster` central) detalla la asignación de cada agente comercial a su escala correspondiente de piso salarial. Es utilizado por Recursos Humanos para auditar y asegurar que las reglas de Mínimo Garantizado se apliquen correctamente a cada perfil.

| Nivel Contractual | Categoría | Agentes Asignados |
|:---|:---:|:---|
| **TOP AC** | Cat. 1 | Alan Garcia, David Menghi, Manuel Pons, Santiago Julian, Sebastian Saparrat, Valentin Torriglia |
| **Corporate (KAM)** | Cat. 2 | Lucila Frutos |
| **General** | Cat. 3 | Alexis Deambrocio, Emiliano Sanchez, Facundo Sansot, Hugo Ganis, Joaquin Verdechia, Jose Olmedo, Juan José Loza, Lucia Sposito, Marcelo Rapp, Santiago Bunge, Sebastian Poullion |
| **Acuerdo** | Cat. 4 | Agustin Mascotena, Pablo Cieri, Sebastian Rivarola |
| **Híbrido** | Cat. 5 | Marcelo Barboza |
| **Sin Mínimo** | Cat. 6 | Agustin Acuna, Ignacio Diehl, Nicolas Echezarreta |
| **Op. Carga 1** | Cat. 7 | Facundo Alonso |
| **Op. Carga 3** | Cat. 9 | Augusto Reynot |
| **Op. Carga 4** | Cat. 10 | Alejo Broggi |

