import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Search, ChevronDown, RefreshCw, AlertTriangle, Users, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ComparatorProps {
  API_URL: string;
  activeData: unknown;
  activeMonth: string;
  activeYear: string;
  selectedAgent: string;
}

interface AgentValues {
  tropas: number;
  cabezas: number;
  escala: number;
  resultado: number;
  componenteP: number;
  sueldo: number;
  cierreReal: number;
  minimo: number;
}

interface AgentDiff {
  tropas: number;
  cabezas: number;
  escala: number;
  resultado: number;
  componenteP: number;
}

interface AgentComparison {
  nombre: string;
  v3: AgentValues | null;
  v4: AgentValues | null;
  diff: AgentDiff | null;
  status: 'ok' | 'minor' | 'major';
}

interface ValidationSummary {
  total: number;
  ok: number;
  minor: number;
  major: number;
  matchRate: number;
}

interface ValidationResponse {
  year: number;
  month: number;
  summary: ValidationSummary;
  agents: AgentComparison[];
}

type StatusFilter = 'all' | 'ok' | 'minor' | 'major';

// ── Formatters ───────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const fmtInt = (v: number) => v.toLocaleString('es-AR');
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok:    { label: 'OK',    emoji: '🟢', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  minor: { label: 'Menor', emoji: '🟡', bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  major: { label: 'Mayor', emoji: '🔴', bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
} as const;

function diffColor(diff: number, threshold: number = 1000): string {
  const abs = Math.abs(diff);
  if (abs < threshold * 0.1) return 'text-emerald-400';
  if (abs < threshold) return 'text-amber-400';
  return 'text-red-400';
}

function diffColorPct(diff: number): string {
  const abs = Math.abs(diff);
  if (abs < 0.005) return 'text-emerald-400';
  if (abs < 0.02) return 'text-amber-400';
  return 'text-red-400';
}

// ── Skeleton Components ──────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
          <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
          <div className="h-8 w-24 bg-white/[0.08] rounded" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white/[0.02] rounded-xl h-14 animate-pulse flex items-center px-6 gap-6">
          <div className="h-4 w-36 bg-white/[0.06] rounded" />
          <div className="h-4 w-16 bg-white/[0.04] rounded" />
          <div className="h-4 w-16 bg-white/[0.04] rounded" />
          <div className="h-4 w-16 bg-white/[0.04] rounded" />
          <div className="h-4 w-20 bg-white/[0.04] rounded" />
          <div className="h-4 w-20 bg-white/[0.04] rounded" />
          <div className="h-4 w-14 bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Cell subcomponent: stacked V3 / V4 with diff ─────────────────────────────

function ComparisonCell({
  v3,
  v4,
  diff,
  format,
  diffThreshold = 1000,
}: {
  v3: number | null;
  v4: number | null;
  diff: number | null;
  format: (v: number) => string;
  diffThreshold?: number;
}) {
  if (v3 === null && v4 === null) {
    return <span className="text-white/20 text-xs">—</span>;
  }

  return (
    <div className="flex flex-col items-end leading-tight gap-0.5">
      <span className="text-[11px] text-white/40 font-medium tabular-nums">
        {v3 !== null ? format(v3) : 'Sin datos V3'}
      </span>
      <span className="text-[13px] text-white/90 font-semibold tabular-nums">
        {v4 !== null ? format(v4) : 'Sin datos V4'}
      </span>
      {diff !== null && (
        <span className={`text-[10px] font-bold tabular-nums ${diffThreshold === -1 ? diffColorPct(diff) : diffColor(diff, diffThreshold)}`}>
          {diff > 0 ? '+' : ''}{format(diff)}
        </span>
      )}
    </div>
  );
}

// ── Expanded Detail Row ──────────────────────────────────────────────────────

function ExpandedDetail({ agent }: { agent: AgentComparison }) {
  const details: { label: string; v3: number | null; v4: number | null; format: (v: number) => string }[] = [
    { label: 'Sueldo', v3: agent.v3?.sueldo ?? null, v4: agent.v4?.sueldo ?? null, format: fmtCurrency.format.bind(fmtCurrency) },
    { label: 'Cierre Real', v3: agent.v3?.cierreReal ?? null, v4: agent.v4?.cierreReal ?? null, format: fmtCurrency.format.bind(fmtCurrency) },
    { label: 'Mínimo', v3: agent.v3?.minimo ?? null, v4: agent.v4?.minimo ?? null, format: fmtCurrency.format.bind(fmtCurrency) },
  ];

  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      <td colSpan={7} className="px-0 py-0">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-white/[0.02] border-t border-white/[0.04] px-8 py-5"
        >
          <div className="grid grid-cols-3 gap-6 max-w-2xl">
            {details.map((d) => {
              const diff = d.v3 !== null && d.v4 !== null ? d.v4 - d.v3 : null;
              return (
                <div key={d.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-2">
                    {d.label}
                  </span>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/30 font-medium">V3</span>
                      <span className="text-sm text-white/50 font-medium tabular-nums">
                        {d.v3 !== null ? d.format(d.v3) : 'Sin datos'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/30 font-medium">V4</span>
                      <span className="text-sm text-white/90 font-semibold tabular-nums">
                        {d.v4 !== null ? d.format(d.v4) : 'Sin datos'}
                      </span>
                    </div>
                    {diff !== null && (
                      <div className="flex justify-between items-center pt-1 border-t border-white/[0.06] mt-1">
                        <span className="text-[10px] text-white/30 font-medium">Δ</span>
                        <span className={`text-xs font-bold tabular-nums ${diffColor(diff, 50000)}`}>
                          {diff > 0 ? '+' : ''}{d.format(diff)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </td>
    </motion.tr>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Comparator({ API_URL, activeMonth, activeYear }: ComparatorProps) {
  const [data, setData] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/validate?year=${activeYear}&month=${activeMonth}`);
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const json: ValidationResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, activeMonth, activeYear]);

  // ── Filtered data ────────────────────────────────────────────────────────

  const filteredAgents = useMemo(() => {
    if (!data) return [];
    return data.agents.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchTerm && !a.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [data, statusFilter, searchTerm]);

  // ── Months ───────────────────────────────────────────────────────────────

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // ── Match rate color ─────────────────────────────────────────────────────

  const matchRateColor = (rate: number): string => {
    if (rate > 90) return 'text-emerald-400';
    if (rate > 70) return 'text-amber-400';
    return 'text-red-400';
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[95%] mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
          <ShieldCheck size={28} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Validador V3 vs V4</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Cruce automático de bases originales vs motor · {MONTHS[Number(activeMonth) - 1]} {activeYear}
          </p>
        </div>
      </div>

      {/* Dark container */}
      <div className="bg-gray-950 rounded-3xl border border-white/[0.06] overflow-hidden shadow-2xl">

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
        <div className="p-6 pb-0">
          {loading ? (
            <KpiSkeleton />
          ) : error ? null : data ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {/* Total */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total Agentes</span>
                </div>
                <span className="text-3xl font-black text-white tabular-nums">{data.summary.total}</span>
              </div>

              {/* Match Rate */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Match Rate</span>
                </div>
                <span className={`text-3xl font-black tabular-nums ${matchRateColor(data.summary.matchRate)}`}>
                  {data.summary.matchRate.toFixed(1)}%
                </span>
              </div>

              {/* OK / Minor */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">OK / Menor</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-emerald-400 tabular-nums">{data.summary.ok}</span>
                  <span className="text-white/20 text-lg font-light">/</span>
                  <span className="text-3xl font-black text-amber-400 tabular-nums">{data.summary.minor}</span>
                </div>
              </div>

              {/* Major */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={14} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Diferencias Mayores</span>
                </div>
                <span className="text-3xl font-black text-red-400 tabular-nums">{data.summary.major}</span>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* ── Error State ──────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="p-4 bg-red-500/10 rounded-2xl mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Error al cargar validación</h3>
            <p className="text-sm text-white/40 mb-6 text-center max-w-md">{error}</p>
            <button
              onClick={fetchValidation}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors border border-white/[0.08]"
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}

        {/* ── Filter Bar ───────────────────────────────────────────────────── */}
        {!loading && !error && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="px-6 pt-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {([
                { key: 'all' as StatusFilter, label: 'Todos', count: data.summary.total },
                { key: 'ok' as StatusFilter, label: 'OK', count: data.summary.ok },
                { key: 'minor' as StatusFilter, label: 'Menor', count: data.summary.minor },
                { key: 'major' as StatusFilter, label: 'Mayor', count: data.summary.major },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === f.key
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 tabular-nums ${statusFilter === f.key ? 'text-white/60' : 'text-white/20'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                placeholder="Buscar agente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 rounded-xl pl-9 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
              />
            </div>
          </motion.div>
        )}

        {/* ── Loading Table ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="px-6 py-6">
            <TableSkeleton />
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!loading && !error && data && filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="p-4 bg-white/[0.04] rounded-2xl mb-4">
              <AlertCircle size={32} className="text-white/20" />
            </div>
            <h3 className="text-lg font-bold text-white/60 mb-1">Sin resultados</h3>
            <p className="text-sm text-white/30 text-center max-w-md">
              {searchTerm
                ? `No se encontraron agentes para "${searchTerm}"`
                : 'No hay agentes con el filtro seleccionado'}
            </p>
          </div>
        )}

        {/* ── Comparison Table ─────────────────────────────────────────────── */}
        {!loading && !error && data && filteredAgents.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="px-6 pb-6"
          >
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] text-[10px] uppercase tracking-wider font-bold text-white/25">
                    <th className="py-3.5 px-5 font-bold">Asociado Comercial</th>
                    <th className="py-3.5 px-4 font-bold text-right">Tropas V3/V4</th>
                    <th className="py-3.5 px-4 font-bold text-right">Cabezas V3/V4</th>
                    <th className="py-3.5 px-4 font-bold text-right">Escala V3/V4</th>
                    <th className="py-3.5 px-4 font-bold text-right">Resultado V3/V4</th>
                    <th className="py-3.5 px-4 font-bold text-right">Comp.P V3/V4</th>
                    <th className="py-3.5 px-4 font-bold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredAgents.map((agent, idx) => {
                      const isExpanded = expandedRow === agent.nombre;
                      const sc = STATUS_CONFIG[agent.status];

                      return (
                        <motion.tbody
                          key={agent.nombre}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, delay: idx * 0.02 }}
                        >
                          <tr
                            onClick={() => setExpandedRow(isExpanded ? null : agent.nombre)}
                            className={`border-t border-white/[0.04] cursor-pointer transition-colors ${
                              isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            {/* Nombre */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown size={14} className="text-white/20" />
                                </motion.div>
                                <span className="text-sm font-semibold text-white/90 truncate max-w-[200px]">
                                  {agent.nombre}
                                </span>
                              </div>
                            </td>

                            {/* Tropas */}
                            <td className="py-3.5 px-4 text-right">
                              <ComparisonCell
                                v3={agent.v3?.tropas ?? null}
                                v4={agent.v4?.tropas ?? null}
                                diff={agent.diff?.tropas ?? null}
                                format={fmtInt}
                                diffThreshold={5}
                              />
                            </td>

                            {/* Cabezas */}
                            <td className="py-3.5 px-4 text-right">
                              <ComparisonCell
                                v3={agent.v3?.cabezas ?? null}
                                v4={agent.v4?.cabezas ?? null}
                                diff={agent.diff?.cabezas ?? null}
                                format={fmtInt}
                                diffThreshold={50}
                              />
                            </td>

                            {/* Escala */}
                            <td className="py-3.5 px-4 text-right">
                              <ComparisonCell
                                v3={agent.v3?.escala ?? null}
                                v4={agent.v4?.escala ?? null}
                                diff={agent.diff?.escala ?? null}
                                format={fmtPct}
                                diffThreshold={-1}
                              />
                            </td>

                            {/* Resultado */}
                            <td className="py-3.5 px-4 text-right">
                              <ComparisonCell
                                v3={agent.v3?.resultado ?? null}
                                v4={agent.v4?.resultado ?? null}
                                diff={agent.diff?.resultado ?? null}
                                format={(v) => fmtCurrency.format(v)}
                                diffThreshold={100000}
                              />
                            </td>

                            {/* Componente P */}
                            <td className="py-3.5 px-4 text-right">
                              <ComparisonCell
                                v3={agent.v3?.componenteP ?? null}
                                v4={agent.v4?.componenteP ?? null}
                                diff={agent.diff?.componenteP ?? null}
                                format={(v) => fmtCurrency.format(v)}
                                diffThreshold={50000}
                              />
                            </td>

                            {/* Estado */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text} ${sc.border} border`}>
                                {sc.emoji} {sc.label}
                              </span>
                            </td>
                          </tr>

                          {/* Expanded Detail */}
                          <AnimatePresence>
                            {isExpanded && <ExpandedDetail agent={agent} />}
                          </AnimatePresence>
                        </motion.tbody>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div className="mt-4 text-xs text-white/20 font-medium text-right px-2">
              Mostrando {filteredAgents.length} de {data.summary.total} agentes
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
