import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
}

interface Diferencia {
  id_lote: number;
  tipo: string;
  cantidad: number;
  fecha: string;
  acVendedor: string;
  acComprador: string;
  agente: string;
  resultado_bajada: number;
  resultado_snapshot: number;
  delta: number;
  delta_pct: string;
}

interface ComparacionResult {
  resumen: {
    totalEnBajada: number;
    totalEnSnapshot: number;
    conDiferencias: number;
    soloEnBajada: number;
    soloEnSnapshot: number;
  };
  diferencias: Diferencia[];
  soloEnBajada: any[];
  soloEnSnapshot: any[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function BajadaComparador({ API_URL, activeYear, activeMonth }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparacionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [soloConDiff, setSoloConDiff] = useState(true);
  const [showSoloEnBajada, setShowSoloEnBajada] = useState(false);

  const comparar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/bajada/comparar?year=${activeYear}&month=${activeMonth}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al comparar');
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const diffs = result?.diferencias.filter(d => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      String(d.id_lote).includes(q) ||
      d.acVendedor?.toLowerCase().includes(q) ||
      d.acComprador?.toLowerCase().includes(q) ||
      d.agente?.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <div className="max-w-7xl mx-auto py-6 px-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bajada vs Sistema</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Comparación tropa por tropa entre la hoja <strong>Bajada</strong> y el snapshot actual de Metabase
          </p>
        </div>
        <button
          onClick={comparar}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Comparando...' : `Comparar (${activeMonth}/${activeYear})`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3 text-red-700">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Resumen */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'En Bajada', value: result.resumen.totalEnBajada, color: 'blue' },
              { label: 'En Snapshot', value: result.resumen.totalEnSnapshot, color: 'slate' },
              { label: 'Con Diferencias', value: result.resumen.conDiferencias, color: result.resumen.conDiferencias > 0 ? 'amber' : 'green' },
              { label: 'Solo en Bajada', value: result.resumen.soloEnBajada, color: 'purple' },
              { label: 'Solo en Snapshot', value: result.resumen.soloEnSnapshot, color: 'rose' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-white rounded-xl border p-4 text-center shadow-sm border-${color}-100`}>
                <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Sin diferencias */}
          {result.resumen.conDiferencias === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center gap-4 mb-4">
              <CheckCircle2 size={32} className="text-emerald-500 shrink-0" />
              <div>
                <div className="font-bold text-emerald-800 text-lg">¡Todo coincide!</div>
                <div className="text-emerald-600 text-sm">No hay diferencias entre la bajada y el snapshot actual.</div>
              </div>
            </div>
          )}

          {/* Filtros */}
          {result.resumen.conDiferencias > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, agente, AC..."
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={soloConDiff} onChange={e => setSoloConDiff(e.target.checked)} className="rounded" />
                Solo con diferencias
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={showSoloEnBajada} onChange={e => setShowSoloEnBajada(e.target.checked)} className="rounded" />
                Ver tropas solo en Bajada
              </label>
            </div>
          )}

          {/* Tabla diferencias */}
          {diffs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <span className="font-semibold text-amber-800 text-sm">{diffs.length} tropas con diferencia de resultado</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">ID Lote</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Cab.</th>
                      <th className="px-4 py-3 text-left">AC Vendedor</th>
                      <th className="px-4 py-3 text-left">AC Comprador</th>
                      <th className="px-4 py-3 text-right">Resultado Bajada</th>
                      <th className="px-4 py-3 text-right">Resultado Sistema</th>
                      <th className="px-4 py-3 text-right">Diferencia</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diffs.map(d => (
                      <tr key={d.id_lote} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{d.id_lote}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.tipo === 'Faena' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>{d.tipo || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{d.cantidad}</td>
                        <td className="px-4 py-2.5 text-slate-700">{d.acVendedor || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-700">{d.acComprador || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{fmt(d.resultado_bajada)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">{fmt(d.resultado_snapshot)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${d.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className="inline-flex items-center gap-1">
                            {d.delta > 0 ? <TrendingUp size={12} /> : d.delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {fmt(d.delta)}
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right text-[11px] font-semibold ${d.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {d.delta_pct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Solo en bajada */}
          {showSoloEnBajada && result.soloEnBajada.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden mb-6">
              <div className="bg-purple-50 border-b border-purple-100 px-5 py-3">
                <span className="font-semibold text-purple-800 text-sm">{result.soloEnBajada.length} tropas en Bajada que no están en el snapshot</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">ID Lote</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">AC Vendedor</th>
                      <th className="px-4 py-3 text-left">AC Comprador</th>
                      <th className="px-4 py-3 text-right">Resultado Bajada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.soloEnBajada.map((d: any) => (
                      <tr key={d.id_lote} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono font-bold">{d.id_lote}</td>
                        <td className="px-4 py-2.5">{d.tipo}</td>
                        <td className="px-4 py-2.5">{d.acVendedor || '—'}</td>
                        <td className="px-4 py-2.5">{d.acComprador || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{fmt(d.resultadoTopeado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
            <div className="font-bold mb-2">ℹ️ ¿Qué hacer con las diferencias?</div>
            <ul className="space-y-1 list-disc list-inside text-blue-700">
              <li>Las diferencias significan que Metabase actualizó esas tropas <strong>después</strong> de que hiciste el cierre.</li>
              <li>Para congelar con los valores de la bajada vieja: usá el botón <strong>Sync Sheets</strong> en el cierre del agente afectado y luego editá el resultado en <strong>Historico_Tropas</strong>.</li>
              <li>Próximamente: botón para aplicar automáticamente los valores de la bajada al cierre congelado.</li>
            </ul>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-5xl mb-4">📊</div>
          <div className="text-slate-700 font-semibold text-lg mb-2">Compará la Bajada con el Sistema</div>
          <div className="text-slate-400 text-sm max-w-md mx-auto">
            Hacé click en "Comparar" para ver qué tropas tienen diferencias entre tu bajada de Metabase y los datos actuales del sistema.
          </div>
        </div>
      )}
    </div>
  );
}
