import numpy as np
import matplotlib.pyplot as plt

def get_pct(x, min_scale, max_scale, max_cabezas):
    log100 = np.log10(100)
    logMax = np.log10(maxCabezas)
    logCabezas = np.maximum(np.log10(np.maximum(x, 1)), log100)
    
    pct = min_scale + (max_scale - min_scale) * (1 - (logCabezas - log100) / (logMax - log100))
    pct = np.clip(pct, min_scale, max_scale)
    return pct

x = np.arange(100, 4100, 100)
pct_completa = get_pct(x, 15, 30, 4000)

fig, ax1 = plt.subplots(figsize=(10, 6))

color = '#1a365d'
ax1.set_xlabel('Volumen de Cabezas Operadas')
ax1.set_ylabel('Porcentaje de Retención (%)', color=color)
ax1.plot(x, pct_completa, color=color, linewidth=3, label='% Retención (Izquierda)')
ax1.tick_params(axis='y', labelcolor=color)
ax1.set_ylim(10, 35)
ax1.grid(True, linestyle='--', alpha=0.7)

ax2 = ax1.twinx()
color = '#2b6cb0'
ax2.set_ylabel('Comisión Nominal Relativa (Cabezas * %)', color=color)
masa_nominal = x * (pct_completa / 100.0)
ax2.plot(x, masa_nominal, color=color, linewidth=3, linestyle='dashed', label='Ganancia Nominal (Derecha)')
ax2.tick_params(axis='y', labelcolor=color)

fig.tight_layout()
plt.title("Comportamiento de la Curva Logarítmica (Escala Completa)", fontsize=14, pad=20)
fig.legend(loc="upper right", bbox_to_anchor=(0.85, 0.85))

plt.savefig('docs/curva_logaritmica.png', dpi=300)
