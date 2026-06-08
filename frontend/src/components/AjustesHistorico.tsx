import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { MONTHS } from '../constants';

interface TropaRetro {
  id_lote: string;
  anioMesTropa: string;
  resultado_estatico: number;           // col D: punta result congelada → Res. Ajustado ANTES
  ganancia_estatica: number;            // col E: col D × escala → VAR ANTES
  resultado_dinamico_asignable: number; // punta result dinámica (Q95) → Res. Ajustado AHORA
  ganancia_dinamica: number;            // punta dinámica × escala → VAR AHORA
  delta: number;
  ac_vendedor: string;
  ac_comprador: string;
  excluida: boolean;
}

interface ComercialRetro {
  comercial: string;
  totalEstatico: number;
  totalDinamico: number;
  totalDelta: number;
  absDelta: number;
  dynamicAvailable: boolean;
  tropas: TropaRetro[];
}

interface Props {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
}

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtDelta = (n: number) => {
  const abs = fmt.format(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs.replace(/^-/, '')}`;
  return abs;
};

const monthLabel = (anioMes: string) => {
  const y = anioMes.substring(0, 4);
  const m = parseInt(anioMes.substring(4, 6), 10);
  return `${MONTHS[m - 1]} ${y}`;
};

const sourceCierre = (year: string, month: string): string => {
  let y = parseInt(year, 10);
  let m = parseInt(month, 10) - 1;
  if (m <= 0) { m = 12; y -= 1; }
  return `${y}${String(m).padStart(2, '0')}`;
};

export default function AjustesHistorico({ API_URL, activeYear, activeMonth }: Props) {
  const defaultNextMonth = () => {
    let y = parseInt(activeYear, 10);
    let m = parseInt(activeMonth, 10) + 1;
    if (m > 12) { m = 1; y += 1; }
    return { year: String(y), month: String(m) };
  };

  const [selYear, setSelYear] = useState(defaultNextMonth().year);
  const [selMonth, setSelMonth] = useState(defaultNextMonth().month);
  const [data, setData] = useState<ComercialRetro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedComercial, setExpandedComercial] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const cierreLabel = useMemo(() => {
    const sc = sourceCierre(selYear, selMonth);
    return monthLabel(sc);
  }, [selYear, selMonth]);

  const fetch3Months = useMemo(() => {
    const y = parseInt(selYear, 10);
    const m = parseInt(selMonth, 10);
    return [0, 1, 2].map(i => {
      let mm = m - 1 - i;
      let yy = y;
      while (mm <= 0) { mm += 12; yy -= 1; }
      return `${yy}${String(mm).padStart(2, '0')}`;
    });
  }, [selYear, selMonth]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/ajustes-historico?year=${selYear}&month=${selMonth}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Error del servidor');
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      const dynAvail = json.dynamicAvailable !== false;
      setData(list.map((d: any) => ({ ...d, dynamicAvailable: dynAvail })));
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selYear, selMonth]);

  const filtered = useMemo(() =>
    data.filter(d => d.comercial.toLowerCase().includes(filterText.toLowerCase())),
    [data, filterText]
  );

  const totalDelta = useMemo(() => filtered.reduce((s, d) => s + d.totalDelta, 0), [filtered]);

  const DeltaBadge = ({ delta, big = false }: { delta: number; big?: boolean }) => {
    const size = big ? 'text-base font-black' : 'text-xs font-bold';
    if (delta > 500) return (
      <span className={`${size} text-emerald-600 flex items-center gap-1`}>
        <TrendingUp size={big ? 16 : 12} />{fmtDelta(delta)}
      </span>
    );
    if (delta < -500) return (
      <span className={`${size} text-red-500 flex items-center gap-1`}>
        <TrendingDown size={big ? 16 : 12} />{fmtDelta(delta)}
      </span>
    );
    return (
      <span className={`${size} text-slate-400 flex items-center gap-1`}>
        <Minus size={big ? 16 : 12} />{fmtDelta(delta)}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Ajustes Retroactivos</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativa estático vs. dinámico · Fuente: cierre congelado de{' '}
              <span className="font-bold text-slate-700">{cierreLabel}</span>
            </p>
            {fetch3Months.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Meses comparados: {fetch3Months.map(monthLabel).join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
              <span className="text-[10px] font-bold text-slate-500 pl-2">Cierre para</span>
              <select
                value={selMonth}
                onChange={e => setSelMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selYear}
                onChange={e => setSelYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer shadow-sm"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Actualizar
            </button>
          </div>
        </div>

        {!loading && data.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comerciales</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{data.length}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Con Ajuste</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{data.filter(d => Math.abs(d.totalDelta) > 500).length}</p>
            </div>
            <div className={`rounded-xl p-3 border ${totalDelta > 0 ? 'bg-emerald-50 border-emerald-100' : totalDelta < 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delta Total</p>
              <DeltaBadge delta={totalDelta} big />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-16 border border-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
          <p className="text-slate-400 font-medium text-sm">
            No hay datos de ajustes para el cierre de {MONTHS[parseInt(selMonth) - 1]} {selYear}.
          </p>
          <p className="text-slate-300 text-xs mt-1">
            El cierre de {cierreLabel} aún no fue congelado, o no tiene tropas registradas.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Filtrar por comercial..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 w-64"
            />
            <span className="text-xs text-slate-400">{filtered.length} comerciales</span>
          </div>

          <AnimatePresence>
            {filtered.map((comercial, idx) => {
              const isExpanded = expandedComercial === comercial.comercial;
              const isPositive = comercial.totalDelta > 500;
              const isNegative = comercial.totalDelta < -500;

              return (
                <motion.div
                  key={comercial.comercial}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                    isPositive ? 'border-emerald-200' : isNegative ? 'border-red-200' : 'border-slate-200/60'
                  }`}
                >
                  {/* Fila principal */}
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedComercial(isExpanded ? null : comercial.comercial)}
                  >
                    <div className={`w-1 h-10 rounded-full shrink-0 ${isPositive ? 'bg-emerald-400' : isNegative ? 'bg-red-400' : 'bg-slate-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{comercial.comercial}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {comercial.tropas.length} lote{comercial.tropas.length !== 1 ? 's' : ''} ·{' '}
                        {[...new Set(comercial.tropas.map(t => t.anioMesTropa))].sort().reverse().map(monthLabel).join(', ')}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">VAR Antes</p>
                        <p className="text-sm font-bold text-slate-600">{fmt.format(comercial.totalEstatico)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase">VAR Ahora</p>
                        <p className="text-sm font-bold text-blue-700">
                          {comercial.dynamicAvailable ? fmt.format(comercial.totalDinamico) : <span className="text-slate-300">—</span>}
                        </p>
                      </div>
                      <div className="min-w-[110px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Ajuste</p>
                        <DeltaBadge delta={comercial.totalDelta} />
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-300">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Detalle expandible */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                {/* Fila de grupos */}
                                <tr className="bg-slate-900 text-white">
                                  <th rowSpan={2} className="text-left px-3 py-2 font-bold align-bottom border-r border-slate-700 rounded-tl-xl whitespace-nowrap">ID Lote</th>
                                  <th rowSpan={2} className="text-left px-3 py-2 font-bold align-bottom border-r border-slate-700 whitespace-nowrap">Mes</th>
                                  <th colSpan={3} className="text-center px-3 py-1.5 font-bold text-[9px] uppercase tracking-widest text-slate-300 border-b border-slate-700 border-r border-slate-700">
                                    ← ANTES (Congelado)
                                  </th>
                                  <th colSpan={3} className="text-center px-3 py-1.5 font-bold text-[9px] uppercase tracking-widest text-blue-300 border-b border-slate-700 border-r border-slate-700">
                                    AHORA (Dinámico) →
                                  </th>
                                  <th rowSpan={2} className="text-right px-3 py-2 font-bold align-bottom rounded-tr-xl whitespace-nowrap">Δ Ajuste</th>
                                </tr>
                                <tr className="bg-slate-800 text-[10px] text-white">
                                  <th className="text-right px-3 py-1.5 font-bold text-slate-300 whitespace-nowrap">Res. Ajustado</th>
                                  <th className="text-right px-3 py-1.5 font-bold text-slate-300 whitespace-nowrap">VAR (V)</th>
                                  <th className="text-right px-3 py-1.5 font-bold text-slate-300 border-r border-slate-700 whitespace-nowrap">VAR (C)</th>
                                  <th className="text-right px-3 py-1.5 font-bold text-blue-200 whitespace-nowrap">Res. Ajustado</th>
                                  <th className="text-right px-3 py-1.5 font-bold text-blue-200 whitespace-nowrap">VAR (V)</th>
                                  <th className="text-right px-3 py-1.5 font-bold text-blue-200 border-r border-slate-700 whitespace-nowrap">VAR (C)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const sorted = [...comercial.tropas].sort((a, b) => {
                                    // 1° mes desc (May > Abr > Mar)
                                    if (b.anioMesTropa !== a.anioMesTropa) {
                                      return b.anioMesTropa.localeCompare(a.anioMesTropa);
                                    }
                                    // 2° |delta| desc dentro del mes
                                    return Math.abs(b.delta) - Math.abs(a.delta);
                                  });

                                  return sorted.map((tropa, ti) => {
                                    const rowDelta = tropa.delta;
                                    const nombre = comercial.comercial.toLowerCase();
                                    const isV = (tropa.ac_vendedor || '').toLowerCase() === nombre;
                                    const isC = (tropa.ac_comprador || '').toLowerCase() === nombre;

                                    // VAR antes
                                    const varVAntes = isV ? tropa.ganancia_estatica : 0;
                                    const varCAntes = (isC && !isV) ? tropa.ganancia_estatica : 0;
                                    // Si es ambos: poner todo en V (no podemos separar sin datos originales)
                                    const showVAntes = isV;
                                    const showCAntes = isC && !isV;

                                    // VAR ahora
                                    const varVAhora = isV ? tropa.ganancia_dinamica : 0;
                                    const varCAhora = (isC && !isV) ? tropa.ganancia_dinamica : 0;

                                    // Separador de mes
                                    const prev = ti > 0 ? sorted[ti - 1] : null;
                                    const showSep = prev && prev.anioMesTropa !== tropa.anioMesTropa;

                                    return (
                                      <React.Fragment key={`${tropa.id_lote}-${ti}`}>
                                        {showSep && (
                                          <tr>
                                            <td colSpan={9} className="px-3 py-1 bg-slate-100 border-y border-slate-200">
                                              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                                {monthLabel(tropa.anioMesTropa)}
                                              </span>
                                            </td>
                                          </tr>
                                        )}
                                        <tr className={`border-b border-slate-100 last:border-0 ${tropa.excluida ? 'opacity-40 bg-slate-50' : 'hover:bg-blue-50/20'}`}>
                                          <td className="px-3 py-2 font-mono font-bold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                                            {tropa.id_lote}
                                            {tropa.excluida && <span className="ml-1 text-[9px] bg-slate-200 text-slate-500 px-1 rounded">EXCL</span>}
                                          </td>
                                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-r border-slate-100">
                                            {monthLabel(tropa.anioMesTropa)}
                                          </td>
                                          {/* ANTES */}
                                          <td className="px-3 py-2 text-right text-slate-600 font-medium whitespace-nowrap">
                                            {fmt.format(tropa.resultado_estatico)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-slate-800 whitespace-nowrap">
                                            {showVAntes ? fmt.format(tropa.ganancia_estatica) : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                                            {showCAntes ? fmt.format(tropa.ganancia_estatica) : <span className="text-slate-300">—</span>}
                                          </td>
                                          {/* AHORA */}
                                          <td className="px-3 py-2 text-right text-blue-700 font-medium whitespace-nowrap">
                                            {comercial.dynamicAvailable ? fmt.format(tropa.resultado_dinamico_asignable) : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-blue-800 whitespace-nowrap">
                                            {comercial.dynamicAvailable
                                              ? (isV ? fmt.format(tropa.ganancia_dinamica) : <span className="text-slate-300">—</span>)
                                              : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-blue-800 border-r border-slate-100 whitespace-nowrap">
                                            {comercial.dynamicAvailable
                                              ? ((isC && !isV) ? fmt.format(tropa.ganancia_dinamica) : <span className="text-slate-300">—</span>)
                                              : <span className="text-slate-300">—</span>}
                                          </td>
                                          {/* DELTA */}
                                          <td className="px-3 py-2 text-right whitespace-nowrap">
                                            {comercial.dynamicAvailable ? (
                                              <span className={`font-black ${rowDelta > 500 ? 'text-emerald-600' : rowDelta < -500 ? 'text-red-500' : 'text-slate-400'}`}>
                                                {fmtDelta(rowDelta)}
                                              </span>
                                            ) : <span className="text-slate-300">—</span>}
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    );
                                  });
                                })()}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-900 text-white font-bold text-xs">
                                  <td colSpan={2} className="px-3 py-2.5 rounded-bl-xl border-r border-slate-700">TOTAL</td>
                                  <td className="px-3 py-2.5 text-right">{fmt.format(comercial.tropas.reduce((s, t) => s + t.resultado_estatico, 0))}</td>
                                  <td className="px-3 py-2.5 text-right">{fmt.format(comercial.totalEstatico)}</td>
                                  <td className="px-3 py-2.5 text-right border-r border-slate-700 text-slate-400">—</td>
                                  <td className="px-3 py-2.5 text-right text-blue-200">
                                    {comercial.dynamicAvailable ? fmt.format(comercial.tropas.reduce((s, t) => s + t.resultado_dinamico_asignable, 0)) : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-blue-200">
                                    {comercial.dynamicAvailable ? fmt.format(comercial.totalDinamico) : '—'}
                                  </td>
                                  <td className="px-3 py-2.5 text-right border-r border-slate-700 text-slate-400">—</td>
                                  <td className={`px-3 py-2.5 text-right font-black rounded-br-xl ${
                                    comercial.totalDelta > 500 ? 'text-emerald-400'
                                    : comercial.totalDelta < -500 ? 'text-red-400'
                                    : 'text-slate-400'
                                  }`}>
                                    {comercial.dynamicAvailable ? fmtDelta(comercial.totalDelta) : '—'}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {comercial.tropas.some(t => t.excluida) && (
                            <p className="text-[10px] text-slate-400 mt-2 italic">
                              * Lotes EXCL fueron excluidos manualmente del cierre.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
