import React, { useState } from 'react';
import { ArrowLeft, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export default function Ajustes({ data, onBack, activeYear, activeMonth }: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});

  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmtPct = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 2 });
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Filter agents that have retroactives
  const agentsWithRetro = data.filter((d: any) => d.retroactivosDetalle && d.retroactivosDetalle.length > 0);
  
  // Apply search filter
  const filteredAgents = agentsWithRetro.filter((d: any) => 
    d.asociadoComercial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (agent: string) => {
    setExpandedAgents(prev => ({ ...prev, [agent]: !prev[agent] }));
  };

  return (
    <div className="max-w-[98%] 2xl:max-w-[1800px] mx-auto pb-24 mt-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Detalle de Ajustes Retroactivos</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Revisión de lotes caídos, nuevos o modificados de meses anteriores.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
            <Calendar size={14} className="text-slate-500" />
            <span className="text-sm font-bold text-slate-700">{MONTHS[parseInt(activeMonth)-1]} {activeYear}</span>
          </div>
          <span className="text-sm font-medium text-slate-500">
            {agentsWithRetro.length} comerciales con ajustes
          </span>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar comercial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-300">
            No se encontraron ajustes retroactivos para mostrar.
          </div>
        ) : (
          filteredAgents.map((agent: any, idx: number) => {
            const isExpanded = expandedAgents[agent.asociadoComercial];
            const retroactivos = agent.retroactivosDetalle || [];
            const totalAjuste = retroactivos.reduce((s: number, r: any) => s + r.ajusteComponenteP, 0);

            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden transition-all duration-200">
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(agent.asociadoComercial)}
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{agent.asociadoComercial}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{retroactivos.length} meses con diferencias detectadas</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-lg border font-bold text-sm ${totalAjuste < 0 ? 'bg-red-50 text-red-600 border-red-100' : totalAjuste > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      Total: {totalAjuste > 0 ? '+' : ''}{fmt.format(totalAjuste)}
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                    
                    {/* Resumen por periodo */}
                    <div className="mb-8">
                      <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase mb-3">Resumen por Período</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-200">
                              <th className="pb-2 pr-4 text-[10px] font-black text-slate-500 uppercase">Período</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Escala Congelada</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Resultado Congelado</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Resultado Dinámico</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Delta Resultado</th>
                              <th className="pb-2 pl-4 text-[10px] font-black text-slate-500 uppercase text-right">Ajuste</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retroactivos.map((r: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50">
                                <td className="py-2.5 pr-4 text-xs font-bold text-slate-700">{MONTHS[r.mesAjustado-1]} {r.añoAjustado}</td>
                                <td className="py-2.5 px-4 text-xs font-medium text-slate-500 text-right">{fmtPct.format(r.escalaCongelada)}</td>
                                <td className="py-2.5 px-4 text-xs font-medium text-slate-500 text-right">{fmt.format(r.resultadoCongelado)}</td>
                                <td className="py-2.5 px-4 text-xs font-medium text-slate-500 text-right">{fmt.format(r.resultadoDinamico)}</td>
                                <td className={`py-2.5 px-4 text-xs font-bold text-right \${r.deltaResultado < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {r.deltaResultado > 0 ? '+' : ''}{fmt.format(r.deltaResultado)}
                                </td>
                                <td className={`py-2.5 pl-4 text-xs font-black text-right \${r.ajusteComponenteP < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {r.ajusteComponenteP > 0 ? '+' : ''}{fmt.format(r.ajusteComponenteP)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Lotes modificados */}
                    <div>
                      <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase mb-3">Detalle de Lotes</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-200">
                              <th className="pb-2 pr-4 text-[10px] font-black text-slate-500 uppercase">ID Lote</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase">Mes</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase">Estado</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Cabezas</th>
                              <th className="pb-2 px-4 text-[10px] font-black text-slate-500 uppercase text-right">Resultado</th>
                              <th className="pb-2 pl-4 text-[10px] font-black text-slate-500 uppercase">Sociedades</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retroactivos.flatMap((r: any) => 
                              (r.detalleLotes || []).map((l: any, i: number) => {
                                const badgeColor = l.tipo === 'nuevo' ? 'bg-emerald-100 text-emerald-800' : (l.tipo === 'caido' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800');
                                const cabStr = l.tipo === 'nuevo' ? `0 → \${l.cabezasDespues}` : (l.tipo === 'caido' ? `\${l.cabezasAntes} → 0` : `\${l.cabezasAntes} → \${l.cabezasDespues}`);
                                const resStr = l.tipo === 'nuevo' ? `$0 → \${fmt.format(l.resultadoDespues)}` : (l.tipo === 'caido' ? `\${fmt.format(l.resultadoAntes)} → $0` : `\${fmt.format(l.resultadoAntes)} → \${fmt.format(l.resultadoDespues)}`);
                                const deltaRes = l.resultadoDespues - l.resultadoAntes;

                                return (
                                  <tr key={`\${r.mesAjustado}-\${l.idLote}-\${i}`} className="border-b border-slate-100 hover:bg-slate-100/50">
                                    <td className="py-2.5 pr-4 text-xs font-bold text-slate-700">{l.idLote}</td>
                                    <td className="py-2.5 px-4 text-xs font-medium text-slate-500">{MONTHS[r.mesAjustado-1]}</td>
                                    <td className="py-2.5 px-4">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase \${badgeColor}`}>{l.tipo}</span>
                                    </td>
                                    <td className="py-2.5 px-4 text-xs font-medium text-slate-500 text-right font-mono">{cabStr}</td>
                                    <td className="py-2.5 px-4 text-xs font-medium text-slate-600 text-right">
                                      <div className="font-mono">{resStr}</div>
                                      {deltaRes !== 0 && (
                                        <div className={`text-[10px] font-bold mt-0.5 \${deltaRes > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                          {deltaRes > 0 ? '+' : ''}{fmt.format(deltaRes)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 pl-4 text-xs font-medium text-slate-500">
                                      <div className="truncate w-32" title={l.sociedadVendedora}>{l.sociedadVendedora}</div>
                                      <div className="truncate w-32" title={l.sociedadCompradora}>{l.sociedadCompradora}</div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

