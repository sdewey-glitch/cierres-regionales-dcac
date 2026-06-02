export const diagramaCierres = `
graph LR

ROSTER[(Roster)] --> RESOLVE["Resolver AC"]
Q95[(Q95 Metabase)] --> RESOLVE

RESOLVE --> TOPE{"Topes x UN"}
TOPE -- "FAE 6% a -2%" --> RES_TOP(("Res. Topeado"))
TOPE -- "INV 8% a -4.5%" --> RES_TOP

RES_TOP --> SPLIT{"66% Venta | 33% Compra"}
SPLIT --> RES_AC(("Resultado Cierre"))

subgraph P["Componente Personal"]
    BOLSA_P["%Bolsa Personal - Simple o Completa"] --> CP(("Comp. P"))
end

subgraph R["Componente Regional"]
    TAJ["%Tajada Soc"] --> CR(("Comp. R"))
    BOL["%Bolsa Provincial"] --> CR
end

subgraph O["Componente Oficina"]
    PCT_O["%O"] --> CO(("Comp. O"))
    ESC_O["%Escala Oficina"] --> CO
end

KPIS["Tropas | Cabezas | Resultado Cierre"]

RES_AC --> KPIS
Q95 -.-> KPIS

KPIS --> BOLSA_P
KPIS --> TAJ
KPIS --> BOL
KPIS --> PCT_O
KPIS --> ESC_O

subgraph RULE["Regla del Minimo"]
    MIN(("Minimo x Cat.")) --> VS{"P vs Minimo"}
    VS -- "Supera" --> VAR["Var = P - Min"]
    VS -- "No supera" --> COBRO_MIN["Cobra Minimo"]
    COBRO_MIN -.-> MOD{"Modelo?"}
    MOD -. "Completo" .-> PIERDE["Cobra Min y pierde Comp R y Comp O"]
    MOD -. "Simple" .-> SOLO["Solo cobra Min"]
end

CP --> VS

VAR --> BRUTO["Sueldo Bruto"]
COBRO_MIN --> BRUTO
CR --> BRUTO
CO --> BRUTO

subgraph GAST["Gastos y Reintegros"]
    AUTO{"Auto DCAC?"} -- "Si DCAC" --> AMORT["Amort DCAC"]
    AUTO -- "No, auto propio" --> KMS["$/KM Movilidad"]
    KMS --> NETO["Reintegro - Mendel"]
    MENDEL["Gastos Mendel"] --> NETO
end

GASTOS[(Gastos)] --> AUTO

BRUTO --> CIERRE["Cierre Real"]
NETO --> CIERRE

subgraph AJUSTES["Ajustes Retroactivos"]
    BD_PREV[(BDSUELDO anterior)] --> DIFF{"Diff Dinamico vs Congelado"}
    DIFF --> RETRO["Ajuste Retro mes sig."]
end

RETRO --> CIERRE

CIERRE --> SHEETS[(Sheets)] --> FREEZE{"Congelar"}
FREEZE --> BD_NEW[(BDSUELDO REAL - Nueva Base)]
FREEZE --> BD_LEGACY[(BDSUELDO - Base anterior)]

style Q95 fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a
style ROSTER fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a
style GASTOS fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a
style RESOLVE fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a
style TOPE fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style RES_TOP fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#b45309
style SPLIT fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style RES_AC fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#b45309
style KPIS fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a
style CP fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3
style CR fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3
style CO fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3
style BOLSA_P fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style TAJ fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style BOL fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style PCT_O fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style ESC_O fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style MIN fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#b45309
style VS fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style VAR fill:#dcfce3,stroke:#22c55e,stroke-width:2px,color:#14532d
style COBRO_MIN fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b
style MOD fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style PIERDE fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b
style SOLO fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#b45309
style BRUTO fill:#dcfce3,stroke:#22c55e,stroke-width:3px,color:#14532d
style AUTO fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style KMS fill:#dbeafe,stroke:#3b82f6,stroke-width:1px,color:#1e3a8a
style AMORT fill:#dbeafe,stroke:#3b82f6,stroke-width:1px,color:#1e3a8a
style MENDEL fill:#dbeafe,stroke:#3b82f6,stroke-width:1px,color:#1e3a8a
style NETO fill:#dcfce3,stroke:#22c55e,stroke-width:2px,color:#14532d
style CIERRE fill:#dcfce3,stroke:#22c55e,stroke-width:3px,color:#14532d
style SHEETS fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a
style FREEZE fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9d174d
style BD_NEW fill:#dcfce3,stroke:#22c55e,stroke-width:3px,color:#14532d
style BD_LEGACY fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#0f172a
style BD_PREV fill:#e2e8f0,stroke:#64748b,stroke-width:1px,color:#0f172a
style DIFF fill:#fce7f3,stroke:#ec4899,stroke-width:1px,color:#9d174d
style RETRO fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#b45309
`;
