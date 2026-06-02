import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, TrendingUp, Scale, Beef, Car, ShieldCheck, Wallet, Receipt,
  ArrowLeft, Search, ChevronDown, ChevronUp, ChevronsUpDown, ArrowRight, Loader2,
  Package, AlertCircle, X, Activity, Plus, Edit, Trash2
} from 'lucide-react';

/* ─────────────────── Types ─────────────────── */

interface LoteChange {
  idLote: number;
  tipo: 'nuevo' | 'caido' | 'modificado';
  cabezasAntes: number;
  cabezasDespues: number;
  resultadoAntes: number;
  resultadoDespues: number;
  sociedadVendedora: string;
  sociedadCompradora: string;
}

interface RetroactiveAdjustment {
  año: number;
  mes: number;
  comercial: string;
  mesAjustado: number;
  añoAjustado: number;
  escalaCongelada: number;
  resultadoCongelado: number;
  resultadoDinamico: number;
  deltaResultado: number;
  ajusteComponenteP: number;
  detalleLotes: LoteChange[];
}

interface VariablesHubProps {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
  data: any[];
  onRefresh?: () => void;
}

type CardKey =
  | 'componenteP'
  | 'ajustes'
  | 'escalas'
  | 'tropas'
  | 'gastos'
  | 'minimos'
  | 'sueldoBruto'
  | 'cierreReal'
  | 'tajada'
  | 'oficina'
  | 'costoRed'
  | 'rendimiento'
  | 'sociedades';

/* ─────────────────── Constants ─────────────────── */

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SHORT_MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const pct = (v: number) => (v * 100).toFixed(1) + '%';

/* ─────────────────── Card definitions ─────────────────── */

interface CardDef {
  key: CardKey;
  label: string;
  icon: React.ElementType;
  color: string;      // bg for icon circle
  iconColor: string;  // icon text color
}

const CARD_DEFS: CardDef[] = [
  { key: 'componenteP', label: 'Componente Personal', icon: Users, color: 'bg-blue-50', iconColor: 'text-accent' },
  { key: 'tajada', label: 'Componente Regional', icon: Package, color: 'bg-teal-50', iconColor: 'text-teal-600' },
  { key: 'oficina', label: 'Componente Oficina', icon: ArrowRight, color: 'bg-sky-50', iconColor: 'text-sky-600' },
  { key: 'ajustes', label: 'Ajustes Retroactivos', icon: TrendingUp, color: 'bg-amber-50', iconColor: 'text-amber-600' },
  { key: 'escalas', label: 'Escalas', icon: Scale, color: 'bg-emerald-50', iconColor: 'text-success' },
  { key: 'minimos', label: 'Mínimos Garantizados', icon: ShieldCheck, color: 'bg-rose-50', iconColor: 'text-danger' },
  { key: 'tropas', label: 'Tropas / Cabezas', icon: Beef, color: 'bg-orange-50', iconColor: 'text-orange-600' },
  { key: 'rendimiento', label: 'Rendimiento Medio', icon: Activity, color: 'bg-lime-50', iconColor: 'text-lime-600' },
  { key: 'sociedades', label: 'Tajada por Sociedades', icon: Users, color: 'bg-fuchsia-50', iconColor: 'text-fuchsia-600' },
  { key: 'gastos', label: 'Gastos Movilidad', icon: Car, color: 'bg-purple-50', iconColor: 'text-purple-600' },
  { key: 'sueldoBruto', label: 'Sueldo Total Bruto', icon: Wallet, color: 'bg-cyan-50', iconColor: 'text-cyan-600' },
  { key: 'cierreReal', label: 'Cierre Real (Neto)', icon: Receipt, color: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { key: 'costoRed', label: 'Costo Red Regional', icon: TrendingUp, color: 'bg-red-50', iconColor: 'text-red-600' },
];

/* ─────────────────── Helpers ─────────────────── */

const sum = (arr: any[], k: string) => arr.reduce((a, b) => a + (Number(b[k]) || 0), 0);
const avg = (arr: any[], k: string) => arr.length ? sum(arr, k) / arr.length : 0;
const minOf = (arr: any[], k: string) => arr.length ? Math.min(...arr.map(a => Number(a[k]) || 0)) : 0;
const maxOf = (arr: any[], k: string) => arr.length ? Math.max(...arr.map(a => Number(a[k]) || 0)) : 0;

/* ─────────────────── Sort helpers ─────────────────── */

type SortDirection = 'asc' | 'desc';
interface SortConfig { key: string; direction: SortDirection }

const SortIcon: React.FC<{ columnKey: string; sort: SortConfig | null }> = ({ columnKey, sort }) => {
  if (sort?.key === columnKey) {
    return sort.direction === 'asc'
      ? <ChevronUp size={10} className="text-blue-500 inline-block ml-1" />
      : <ChevronDown size={10} className="text-blue-500 inline-block ml-1" />;
  }
  return <ChevronsUpDown size={10} className="text-slate-300 inline-block ml-1" />;
};

const toggleSort = (key: string, current: SortConfig | null): SortConfig => {
  if (current?.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
};

const sortableThClass = 'cursor-pointer hover:text-slate-600 hover:bg-slate-100/60 transition-colors select-none';

/* ─────────────────── Skeleton ─────────────────── */

const SkeletonCard: React.FC = () => (
  <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 animate-pulse flex flex-col justify-between">
    <div className="flex justify-between items-start mb-3">
      <div className="w-10 h-10 bg-gray-100 rounded-xl" />
    </div>
    <div className="flex-grow mb-4 flex flex-col justify-center">
      <div className="h-5 w-24 bg-gray-200 rounded mb-1.5" />
      <div className="h-6 w-28 bg-gray-200 rounded mb-1" />
      <div className="h-3.5 w-32 bg-gray-100 rounded" />
    </div>
    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center">
      <div className="h-3 w-14 bg-gray-100 rounded" />
      <div className="w-3.5 h-3.5 bg-gray-100 rounded animate-pulse" />
    </div>
  </div>
);

/* ─────────────────── Tipo Badge ─────────────────── */

const TipoBadge: React.FC<{ tipo: LoteChange['tipo'] }> = ({ tipo }) => {
  const cfg = {
    nuevo: { emoji: '🟢', label: 'Nuevo', cls: 'bg-green-50 text-green-700' },
    caido: { emoji: '🔴', label: 'Caído', cls: 'bg-red-50 text-red-700' },
    modificado: { emoji: '🟡', label: 'Modificado', cls: 'bg-yellow-50 text-yellow-700' },
  }[tipo];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.cls}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
};

/* ─────────────────── Main Component ─────────────────── */

const VariablesHub: React.FC<VariablesHubProps> = ({ API_URL, activeYear, activeMonth, data, onRefresh }) => {
  const [retroactivos, setRetroactivos] = useState<RetroactiveAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  /* ─── Fetch retroactivos ─── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/retroactivos?year=${activeYear}&month=${activeMonth}`);
        if (!res.ok) throw new Error('fetch failed');
        const json: RetroactiveAdjustment[] = await res.json();
        if (!cancelled) setRetroactivos(json);
      } catch {
        if (!cancelled) setRetroactivos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [API_URL, activeYear, activeMonth]);

  /* ─── Derived stats ─── */
  const stats = useMemo(() => {
    if (!data.length) return null;
    const totalComponenteP = sum(data, 'componenteP');
    const totalAjustes = sum(data, 'ajustes');
    const avgEscala = avg(data, 'escalaGen');
    const minEscala = minOf(data, 'escalaGen');
    const maxEscala = maxOf(data, 'escalaGen');
    const totalTropas = sum(data, 'tropasGeneral');
    const totalCabezas = sum(data, 'cabezasGeneral');
    const totalGastos = sum(data, 'gastosMovilidad');
    const totalKms = sum(data, 'kms');
    const atMinimo = data.filter(d => d.cierreReal === d.minimo || d.cierreReal <= d.minimo).length;
    const totalMinCost = sum(data.filter(d => d.cierreReal <= d.minimo), 'minimo');
    const totalBruto = sum(data, 'sueldoBruto');
    const totalCierre = sum(data, 'cierreReal');
    const totalComponenteR = sum(data, 'componenteR');
    const totalComponenteO = sum(data, 'componenteO');
    const totalAmortizacion = sum(data, 'amortizacioneDcac');
    const totalReintegros = sum(data, 'reintegroMovilidad');
    const totalMendel = sum(data, 'gastosMkt');
    const costoRed = totalBruto + totalAmortizacion + totalReintegros + totalMendel;
    const avgRendimiento = avg(data, 'rendimientoGen');
    const totalSocOperadas = sum(data, 'socOpGen');

    return {
      totalComponenteP, totalAjustes,
      avgEscala, minEscala, maxEscala,
      totalTropas, totalCabezas,
      totalGastos, totalKms,
      atMinimo, totalMinCost,
      totalBruto, totalCierre,
      totalComponenteR, totalComponenteO,
      costoRed, avgRendimiento, totalSocOperadas,
    };
  }, [data]);

  /* ─── Retroactivo aggregations ─── */
  const retroStats = useMemo(() => {
    const byMonth: Record<number, number> = {};
    const byType: Record<string, number> = { nuevo: 0, caido: 0, modificado: 0 };
    const totalAjuste = retroactivos.reduce((a, r) => a + r.ajusteComponenteP, 0);
    const adjustmentCount = retroactivos.length;

    retroactivos.forEach(r => {
      byMonth[r.mesAjustado] = (byMonth[r.mesAjustado] || 0) + 1;
      r.detalleLotes.forEach(l => {
        byType[l.tipo] = (byType[l.tipo] || 0) + 1;
      });
    });

    // Group by agent
    const byAgent: Record<string, { total: number; items: RetroactiveAdjustment[]; lotesCount: number }> = {};
    retroactivos.forEach(r => {
      if (!byAgent[r.comercial]) byAgent[r.comercial] = { total: 0, items: [], lotesCount: 0 };
      byAgent[r.comercial].total += r.ajusteComponenteP;
      byAgent[r.comercial].items.push(r);
      byAgent[r.comercial].lotesCount += r.detalleLotes.length;
    });

    return { totalAjuste, adjustmentCount, byMonth, byType, byAgent };
  }, [retroactivos]);

  /* ─── Card main values ─── */
  const cardValues = useMemo(() => {
    if (!stats) return {} as Record<CardKey, { main: string; sub: string }>;
    return {
      componenteP: {
        main: fmt.format(stats.totalComponenteP),
        sub: `${data.length} agentes · Prom: ${fmt.format(stats.totalComponenteP / (data.length || 1))}`,
      },
      ajustes: {
        main: fmt.format(stats.totalAjustes),
        sub: `${retroStats.adjustmentCount} ajustes retroactivos`,
      },
      escalas: {
        main: pct(stats.avgEscala),
        sub: `Min ${pct(stats.minEscala)} · Max ${pct(stats.maxEscala)}`,
      },
      tropas: {
        main: stats.totalTropas.toLocaleString('es-AR'),
        sub: `${stats.totalCabezas.toLocaleString('es-AR')} cabezas`,
      },
      gastos: {
        main: fmt.format(stats.totalGastos),
        sub: `${stats.totalKms.toLocaleString('es-AR')} kms`,
      },
      minimos: {
        main: `${stats.atMinimo} agentes`,
        sub: `Costo total: ${fmt.format(stats.totalMinCost)}`,
      },
      sueldoBruto: {
        main: fmt.format(stats.totalBruto),
        sub: `${data.length} comerciales`,
      },
      cierreReal: {
        main: fmt.format(stats.totalCierre),
        sub: `Δ Sueldo: ${fmt.format(stats.totalCierre - stats.totalBruto)}`,
      },
      tajada: {
        main: fmt.format(stats.totalComponenteR),
        sub: `Componente Regional`,
      },
      oficina: {
        main: fmt.format(stats.totalComponenteO),
        sub: `Componente Oficina`,
      },
      costoRed: {
        main: fmt.format(stats.costoRed),
        sub: `Sueldos + Reintegros + Mendel + DCAC`,
      },
      rendimiento: {
        main: pct(stats.avgRendimiento / 100),
        sub: `Rendimiento Ponderado Medio`,
      },
      sociedades: {
        main: stats.totalSocOperadas.toLocaleString('es-AR'),
        sub: `Sociedades Únicas Operadas`,
      },
    } as Record<CardKey, { main: string; sub: string }>;
  }, [stats, data, retroStats]);

  const handleCardClick = (key: CardKey) => {
    setActiveCard(prev => (prev === key ? null : key));
    setSelectedAgent(null);
    setSearchTerm('');
  };

  /* ─── Filtered data for tables ─── */
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(d => (d.asociadoComercial || '').toLowerCase().includes(q));
  }, [data, searchTerm]);

  /* ─────────────────── RENDER ─────────────────── */

  return (
    <div className="max-w-7xl mx-auto px-4 pb-24 pt-4 space-y-6">

      {/* ══════ CARDS GRID ══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !stats
          ? Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : CARD_DEFS.map((cd, i) => {
              const val = cardValues[cd.key];
              const isActive = activeCard === cd.key;
              const Icon = cd.icon;
              const hasAjustesBadge = cd.key === 'ajustes' && retroStats.adjustmentCount > 0;

              return (
                <React.Fragment key={cd.key}>
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
                    onClick={() => handleCardClick(cd.key)}
                    className={`relative text-left bg-surface rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 ease-out cursor-pointer border select-none
                      ${isActive
                        ? 'shadow-[0_16px_36px_rgba(0,0,0,0.06)] border-[#2997ff]/40 ring-4 ring-[#2997ff]/10 bg-slate-50/30'
                        : 'shadow-[0_4px_20px_rgba(0,0,0,0.015)] border-slate-200/40 hover:shadow-[0_16px_36px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-slate-300'
                      }`}
                  >
                    {/* badge */}
                    {hasAjustesBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-danger text-white text-[11px] font-bold rounded-full shadow-md z-10"
                      >
                        {retroStats.adjustmentCount}
                      </motion.span>
                    )}

                    <div className="flex justify-between items-start mb-3 w-full">
                      <div className={`p-2.5 rounded-xl ${cd.color} flex items-center justify-center shrink-0`}>
                        <Icon size={20} className={cd.iconColor} />
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 mb-1 truncate w-full">
                      {cd.label}
                    </h3>

                    <div className="flex-grow mb-4 flex flex-col justify-center w-full">
                      <div className="text-xl font-extrabold text-primary truncate">
                        {val?.main ?? '—'}
                      </div>
                      <div className="text-[11px] text-secondary mt-0.5 truncate">
                        {val?.sub ?? ''}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[11px] font-semibold text-accent w-full">
                      <span>{isActive ? 'Cerrar detalle' : 'Ver detalle'}</span>
                      {isActive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                  </motion.button>
                  
                  {isActive && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-surface rounded-2xl border border-slate-200/60 overflow-hidden my-3 shadow-lg">
                      {cd.key === 'ajustes' ? (
                        <AjustesDetail
                          API_URL={API_URL}
                          activeYear={activeYear}
                          activeMonth={activeMonth}
                          onRefresh={onRefresh}
                          agentsList={Array.from(new Set(data.map(d => d.asociadoComercial))).sort()}
                          retroactivos={retroactivos}
                          retroStats={retroStats}
                          loading={loading}
                          selectedAgent={selectedAgent}
                          setSelectedAgent={setSelectedAgent}
                          searchTerm={searchTerm}
                          setSearchTerm={setSearchTerm}
                        />
                      ) : (
                        <GenericDetail
                          cardKey={cd.key}
                          data={filteredData}
                          allData={data}
                          searchTerm={searchTerm}
                          setSearchTerm={setSearchTerm}
                        />
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })
        }
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   AJUSTES RETROACTIVOS DETAIL
   ═══════════════════════════════════════════════════════════ */

interface AjustesDetailProps {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
  onRefresh?: () => void;
  agentsList: string[];
  retroactivos: RetroactiveAdjustment[];
  retroStats: {
    totalAjuste: number;
    adjustmentCount: number;
    byMonth: Record<number, number>;
    byType: Record<string, number>;
    byAgent: Record<string, { total: number; items: RetroactiveAdjustment[]; lotesCount: number }>;
  };
  loading: boolean;
  selectedAgent: string | null;
  setSelectedAgent: (a: string | null) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

const AjustesDetail: React.FC<AjustesDetailProps> = ({
  API_URL,
  activeYear,
  activeMonth,
  onRefresh,
  agentsList,
  retroactivos,
  retroStats,
  loading,
  selectedAgent,
  setSelectedAgent,
  searchTerm,
  setSearchTerm,
}) => {
  const [activeTab, setActiveTab] = useState<'retroactivos' | 'manuales'>('retroactivos');
  const [manuales, setManuales] = useState<any[]>([]);
  const [loadingManuales, setLoadingManuales] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<{
    id?: number;
    año: number;
    mes: number;
    comercial: string;
    motivo: string;
    monto: number;
  }>({
    año: Number(activeYear),
    mes: Number(activeMonth),
    comercial: '',
    motivo: '',
    monto: 0
  });
  const [savingManual, setSavingManual] = useState(false);
  const [searchTermManual, setSearchTermManual] = useState('');
  const [filterPeriodOnly, setFilterPeriodOnly] = useState(true);

  const fetchManuales = async () => {
    setLoadingManuales(true);
    try {
      const res = await fetch(`${API_URL}/ajustes-manuales`);
      if (!res.ok) throw new Error('Error al cargar ajustes manuales');
      const data = await res.json();
      setManuales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingManuales(false);
    }
  };

  useEffect(() => {
    fetchManuales();
  }, [API_URL]);

  const openAddForm = () => {
    setFormState({
      año: Number(activeYear),
      mes: Number(activeMonth),
      comercial: agentsList[0] || '',
      motivo: '',
      monto: 0
    });
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setFormState({
      id: item.id,
      año: item.año,
      mes: item.mes,
      comercial: item.comercial,
      motivo: item.motivo,
      monto: item.monto
    });
    setShowForm(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.año || !formState.mes || !formState.comercial || isNaN(Number(formState.monto))) {
      alert("Por favor complete todos los campos requeridos.");
      return;
    }
    setSavingManual(true);
    try {
      const isEdit = formState.id !== undefined;
      const url = isEdit 
        ? `${API_URL}/ajustes-manuales/${formState.id}`
        : `${API_URL}/ajustes-manuales`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          año: Number(formState.año),
          mes: Number(formState.mes),
          comercial: formState.comercial,
          motivo: formState.motivo,
          monto: Number(formState.monto)
        })
      });
      
      if (!res.ok) {
        throw new Error('Error al guardar el ajuste');
      }
      
      // Recalcular el agente modificado en el backend para que se actualice el sueldo snapshot
      await fetch(`${API_URL}/generate/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(formState.año),
          month: Number(formState.mes),
          agentName: formState.comercial
        })
      });
      
      await fetchManuales();
      if (onRefresh) onRefresh();
      setShowForm(false);
      setFormState({ año: Number(activeYear), mes: Number(activeMonth), comercial: '', motivo: '', monto: 0 });
    } catch (err: any) {
      alert(err.message || 'Error guardando el ajuste');
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteManual = async (item: any) => {
    if (!confirm(`¿Está seguro que desea eliminar el ajuste de ${item.comercial} por ${fmt.format(item.monto)}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/ajustes-manuales/${item.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar');
      
      // Recalcular el agente modificado en el backend para que se actualice el sueldo snapshot
      await fetch(`${API_URL}/generate/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: Number(item.año),
          month: Number(item.mes),
          agentName: item.comercial
        })
      });
      
      await fetchManuales();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error eliminando el ajuste');
    }
  };

  const filteredManuales = useMemo(() => {
    return manuales.filter(item => {
      const matchesSearch = !searchTermManual || 
        item.comercial.toLowerCase().includes(searchTermManual.toLowerCase()) || 
        item.motivo.toLowerCase().includes(searchTermManual.toLowerCase());
        
      const matchesPeriod = !filterPeriodOnly || 
        (item.año === Number(activeYear) && item.mes === Number(activeMonth));
        
      return matchesSearch && matchesPeriod;
    });
  }, [manuales, searchTermManual, filterPeriodOnly, activeYear, activeMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-secondary">
        <Loader2 size={20} className="animate-spin" />
        Cargando ajustes retroactivos…
      </div>
    );
  }

  /* ── A) Summary Bar ── */
  const SummaryBar = () => {
    const isPositive = retroStats.totalAjuste >= 0;
    return (
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-6">
          {/* Total */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary uppercase">Total Ajuste</span>
            <span className={`text-lg font-extrabold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {fmt.format(retroStats.totalAjuste)}
            </span>
          </div>

          {/* by month */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-secondary uppercase">Por Mes:</span>
            {Object.entries(retroStats.byMonth)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([m, c]) => (
                <span key={m} className="px-2 py-0.5 bg-gray-50 rounded-full text-xs font-semibold text-primary">
                  {SHORT_MONTHS[Number(m) - 1]}: {c}
                </span>
              ))}
          </div>

          {/* by type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-secondary uppercase">Tipo:</span>
            <span className="px-2 py-0.5 bg-green-50 rounded-full text-xs font-semibold text-green-700">
              Nuevos: {retroStats.byType.nuevo || 0}
            </span>
            <span className="px-2 py-0.5 bg-red-50 rounded-full text-xs font-semibold text-red-700">
              Caídos: {retroStats.byType.caido || 0}
            </span>
            <span className="px-2 py-0.5 bg-yellow-50 rounded-full text-xs font-semibold text-yellow-700">
              Modificados: {retroStats.byType.modificado || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /* ── Selected Agent Detail ── */
  if (selectedAgent) {
    const agentData = retroStats.byAgent[selectedAgent];
    if (!agentData) return null;

    // Get unique months from agent items
    const agentMonths = agentData.items
      .map(i => ({ mes: i.mesAjustado, año: i.añoAjustado }))
      .filter((v, i, a) => a.findIndex(x => x.mes === v.mes && x.año === v.año) === i)
      .sort((a, b) => a.año - b.año || a.mes - b.mes);

    // All lotes for agent
    const allLotesRaw = agentData.items.flatMap(r =>
      r.detalleLotes.map(l => ({ ...l, mesAjustado: r.mesAjustado, añoAjustado: r.añoAjustado }))
    ).sort((a, b) => a.mesAjustado - b.mesAjustado || (['nuevo', 'caido', 'modificado'].indexOf(a.tipo) - ['nuevo', 'caido', 'modificado'].indexOf(b.tipo)));

    // Sort state for lotes table
    const [lotesSort, setLotesSort] = useState<SortConfig | null>(null);

    const allLotes = [...allLotesRaw].sort((a, b) => {
      if (!lotesSort) return 0;
      const dir = lotesSort.direction === 'asc' ? 1 : -1;
      switch (lotesSort.key) {
        case 'mes': return dir * (a.mesAjustado - b.mesAjustado);
        case 'idLote': return dir * (a.idLote - b.idLote);
        case 'tipo': return dir * a.tipo.localeCompare(b.tipo);
        case 'cabezas': return dir * (a.cabezasDespues - b.cabezasDespues);
        case 'resultado': return dir * (a.resultadoDespues - b.resultadoDespues);
        case 'vendedora': return dir * a.sociedadVendedora.localeCompare(b.sociedadVendedora);
        case 'compradora': return dir * a.sociedadCompradora.localeCompare(b.sociedadCompradora);
        default: return 0;
      }
    });

    return (
      <div>
        <SummaryBar />

        {/* Back + title */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-4">
          <button
            onClick={() => setSelectedAgent(null)}
            className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-blue-700 transition-colors"
          >
            <ArrowLeft size={16} /> Volver a tabla
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h3 className="text-sm font-bold text-primary">{selectedAgent}</h3>
          <span className={`text-sm font-extrabold ${agentData.total >= 0 ? 'text-success' : 'text-danger'}`}>
            {fmt.format(agentData.total)}
          </span>
        </div>

        {/* D) Month Cards */}
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {agentMonths.map((am, idx) => {
              const item = agentData.items.find(i => i.mesAjustado === am.mes && i.añoAjustado === am.año);
              if (!item) return null;
              const delta = item.deltaResultado;
              const ajuste = item.ajusteComponenteP;

              return (
                <motion.div
                  key={`${am.año}-${am.mes}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="text-sm font-bold text-primary mb-3">
                    {MONTHS[am.mes - 1]} {am.año}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Escala Congelada</span>
                      <span className="font-bold text-primary">{pct(item.escalaCongelada)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Resultado</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-secondary">{fmt.format(item.resultadoCongelado)}</span>
                        <ArrowRight size={12} className={delta >= 0 ? 'text-success' : 'text-danger'} />
                        <span className="font-mono font-bold text-primary">{fmt.format(item.resultadoDinamico)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Δ Resultado</span>
                      <span className={`font-bold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
                        {fmt.format(delta)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between">
                      <span className="font-semibold text-secondary">Ajuste (Escala × Δ)</span>
                      <span className={`font-extrabold ${ajuste >= 0 ? 'text-success' : 'text-danger'}`}>
                        {fmt.format(ajuste)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* E) Lotes Detail Table */}
          {allLotes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
                <Package size={14} /> Detalle de Lotes ({allLotes.length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-secondary font-semibold">
                    <tr>
                      <th className={`py-2.5 px-4 text-left ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('mes', lotesSort))}>Mes<SortIcon columnKey="mes" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-left ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('idLote', lotesSort))}>ID Lote<SortIcon columnKey="idLote" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-left ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('tipo', lotesSort))}>Tipo<SortIcon columnKey="tipo" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-right ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('cabezas', lotesSort))}>Cabezas<SortIcon columnKey="cabezas" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-right ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('resultado', lotesSort))}>Resultado<SortIcon columnKey="resultado" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-left ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('vendedora', lotesSort))}>Vendedora<SortIcon columnKey="vendedora" sort={lotesSort} /></th>
                      <th className={`py-2.5 px-4 text-left ${sortableThClass}`} onClick={() => setLotesSort(toggleSort('compradora', lotesSort))}>Compradora<SortIcon columnKey="compradora" sort={lotesSort} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allLotes.map((l, idx) => (
                      <motion.tr
                        key={`${l.mesAjustado}-${l.idLote}-${idx}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="py-2 px-4 font-medium text-primary">
                          {SHORT_MONTHS[l.mesAjustado - 1]} {l.añoAjustado}
                        </td>
                        <td className="py-2 px-4 font-mono text-secondary">#{l.idLote}</td>
                        <td className="py-2 px-4"><TipoBadge tipo={l.tipo} /></td>
                        <td className="py-2 px-4 text-right font-mono">
                          <span className="text-secondary">{l.cabezasAntes}</span>
                          <span className="text-secondary mx-1">→</span>
                          <span className="font-bold text-primary">{l.cabezasDespues}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono">
                          <span className="text-secondary">{fmt.format(l.resultadoAntes)}</span>
                          <span className="text-secondary mx-1">→</span>
                          <span className={`font-bold ${l.resultadoDespues >= l.resultadoAntes ? 'text-success' : 'text-danger'}`}>
                            {fmt.format(l.resultadoDespues)}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-secondary truncate max-w-[140px]">{l.sociedadVendedora}</td>
                        <td className="py-2 px-4 text-secondary truncate max-w-[140px]">{l.sociedadCompradora}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Tab: Manuales ── */
  if (activeTab === 'manuales') {
    return (
      <div>
        <SummaryBar />

        {/* Tab switcher */}
        <div className="px-5 pt-5 pb-2 border-b border-gray-100 flex items-center justify-between">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start inline-flex">
            <button
              onClick={() => setActiveTab('retroactivos')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                false 
                  ? 'bg-white shadow text-slate-800' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Retroactivos (Metabase)
            </button>
            <button
              onClick={() => {
                setActiveTab('manuales');
                fetchManuales();
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                true 
                  ? 'bg-white shadow text-slate-800' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Manuales (Extras)
            </button>
          </div>
          
          <button
            onClick={openAddForm}
            className="px-3.5 py-1.5 bg-[#2997ff] text-white hover:bg-blue-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus size={14} /> Nuevo Ajuste
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Buscar por agente o concepto..."
                value={searchTermManual}
                onChange={e => setSearchTermManual(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              {searchTermManual && (
                <button
                  onClick={() => setSearchTermManual('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filterPeriodOnly"
              checked={filterPeriodOnly}
              onChange={e => setFilterPeriodOnly(e.target.checked)}
              className="rounded text-[#2997ff] focus:ring-[#2997ff]"
            />
            <label htmlFor="filterPeriodOnly" className="text-xs font-medium text-slate-600 select-none">
              Filtrar solo {MONTHS[Number(activeMonth) - 1]} {activeYear}
            </label>
          </div>
        </div>

        {/* Content list */}
        {loadingManuales ? (
          <div className="flex items-center justify-center py-20 gap-3 text-secondary">
            <Loader2 size={20} className="animate-spin" />
            Cargando ajustes manuales...
          </div>
        ) : filteredManuales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-secondary">
            <AlertCircle size={32} className="text-gray-300" />
            <span className="font-medium">No se encontraron ajustes manuales</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-secondary text-xs font-semibold uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-5">Período</th>
                  <th className="py-3 px-5">Asociado Comercial</th>
                  <th className="py-3 px-5">Concepto / Motivo</th>
                  <th className="py-3 px-5 text-right">Monto</th>
                  <th className="py-3 px-5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredManuales.map((item, idx) => {
                  const isPositive = item.monto >= 0;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.015 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-2.5 px-5 font-medium text-slate-600">
                        {MONTHS[item.mes - 1]} {item.año}
                      </td>
                      <td className="py-2.5 px-5 font-semibold text-slate-800">{item.comercial}</td>
                      <td className="py-2.5 px-5 text-slate-600">{item.motivo}</td>
                      <td className={`py-2.5 px-5 text-right font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {isPositive ? '+' : ''}{fmt.format(item.monto)}
                      </td>
                      <td className="py-2.5 px-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditForm(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                            title="Editar ajuste"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteManual(item)}
                            className="p-1.5 text-danger/75 hover:text-danger hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar ajuste"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 relative">
              <button
                onClick={() => setShowForm(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-base font-bold text-slate-800 mb-4">
                {formState.id !== undefined ? '✏️ Editar Ajuste Manual' : '➕ Nuevo Ajuste Manual'}
              </h3>
              
              <form onSubmit={handleSaveManual} className="space-y-4 text-sm text-slate-700">
                {/* Año & Mes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Año</label>
                    <select
                      value={formState.año}
                      onChange={e => setFormState(prev => ({ ...prev, año: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      {Array.from({ length: 5 }).map((_, i) => {
                        const y = 2024 + i;
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mes</label>
                    <select
                      value={formState.mes}
                      onChange={e => setFormState(prev => ({ ...prev, mes: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Asociado Comercial */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asociado Comercial</label>
                  <select
                    value={formState.comercial}
                    onChange={e => setFormState(prev => ({ ...prev, comercial: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="" disabled>Seleccione un agente...</option>
                    {agentsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Concepto / Motivo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Concepto / Motivo</label>
                  <input
                    type="text"
                    required
                    value={formState.motivo}
                    onChange={e => setFormState(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ej. Novedad de cierre, Premio, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                
                {/* Monto */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Monto ($)</label>
                  <input
                    type="number"
                    required
                    value={formState.monto || ''}
                    onChange={e => setFormState(prev => ({ ...prev, monto: Number(e.target.value) }))}
                    placeholder="Ingrese el monto (ej. 150000 o -50000)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Use números negativos para realizar descuentos.</p>
                </div>
                
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="px-4 py-2 bg-[#2997ff] text-white hover:bg-blue-600 disabled:bg-blue-300 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {savingManual && <Loader2 size={14} className="animate-spin" />}
                    {formState.id !== undefined ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── No agent selected: show agent table ── */
  const [agentSort, setAgentSort] = useState<SortConfig | null>(null);

  const agentsFiltered = Object.entries(retroStats.byAgent)
    .map(([name, v]) => ({ name, ...v }))
    .filter(a => !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Build per-agent monthly columns: find all unique months
  const allMonths = Array.from(
    new Set(retroactivos.map(r => r.mesAjustado))
  ).sort((a, b) => a - b);

  const agents = useMemo(() => {
    const base = [...agentsFiltered];
    if (!agentSort) return base.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    return base.sort((a, b) => {
      const dir = agentSort.direction === 'asc' ? 1 : -1;
      if (agentSort.key === 'name') return dir * a.name.localeCompare(b.name);
      if (agentSort.key === 'total') return dir * (a.total - b.total);
      if (agentSort.key === 'lotes') return dir * (a.lotesCount - b.lotesCount);
      // Monthly column keys like 'month_1', 'month_2', etc.
      if (agentSort.key.startsWith('month_')) {
        const m = Number(agentSort.key.replace('month_', ''));
        const getMonthVal = (agent: typeof a) => {
          const item = agent.items.find(i => i.mesAjustado === m);
          return item ? item.ajusteComponenteP : 0;
        };
        return dir * (getMonthVal(a) - getMonthVal(b));
      }
      return 0;
    });
  }, [agentsFiltered, agentSort, allMonths]);

  return (
    <div>
      <SummaryBar />

      {/* Tab switcher */}
      <div className="px-5 pt-5 pb-2 border-b border-gray-100 flex items-center justify-between">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start inline-flex">
          <button
            onClick={() => setActiveTab('retroactivos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              true 
                ? 'bg-white shadow text-slate-800' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Retroactivos (Metabase)
          </button>
          <button
            onClick={() => {
              setActiveTab('manuales');
              fetchManuales();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              false 
                ? 'bg-white shadow text-slate-800' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manuales (Extras)
          </button>
        </div>
      </div>

      {/* B) Agent filter */}
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Buscar agente…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-xs text-secondary font-medium">{agents.length} agentes</span>
      </div>

      {/* C) Agent Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-secondary text-xs font-semibold uppercase tracking-wide">
            <tr>
              <th className={`py-3 px-5 text-left ${sortableThClass}`} onClick={() => setAgentSort(toggleSort('name', agentSort))}>Comercial<SortIcon columnKey="name" sort={agentSort} /></th>
              <th className={`py-3 px-5 text-right ${sortableThClass}`} onClick={() => setAgentSort(toggleSort('total', agentSort))}>Ajuste Total<SortIcon columnKey="total" sort={agentSort} /></th>
              {allMonths.map(m => (
                <th key={m} className={`py-3 px-5 text-right ${sortableThClass}`} onClick={() => setAgentSort(toggleSort(`month_${m}`, agentSort))}>{SHORT_MONTHS[m - 1]}<SortIcon columnKey={`month_${m}`} sort={agentSort} /></th>
              ))}
              <th className={`py-3 px-5 text-right ${sortableThClass}`} onClick={() => setAgentSort(toggleSort('lotes', agentSort))}>Lotes<SortIcon columnKey="lotes" sort={agentSort} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={3 + allMonths.length} className="py-12 text-center text-secondary text-sm">
                  Sin resultados
                </td>
              </tr>
            ) : (
              agents.map((agent, idx) => {
                const isPos = agent.total >= 0;
                return (
                  <motion.tr
                    key={agent.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => setSelectedAgent(agent.name)}
                    className={`cursor-pointer transition-colors ${
                      isPos ? 'hover:bg-green-50/40' : 'hover:bg-red-50/40'
                    }`}
                  >
                    <td className="py-3 px-5 font-semibold text-primary">{agent.name}</td>
                    <td className={`py-3 px-5 text-right font-extrabold ${isPos ? 'text-success' : 'text-danger'}`}>
                      {fmt.format(agent.total)}
                    </td>
                    {allMonths.map(m => {
                      const monthItem = agent.items.find(i => i.mesAjustado === m);
                      const val = monthItem ? monthItem.ajusteComponenteP : 0;
                      return (
                        <td key={m} className={`py-3 px-5 text-right font-mono text-xs ${val > 0 ? 'text-success' : val < 0 ? 'text-danger' : 'text-secondary'}`}>
                          {val !== 0 ? fmt.format(val) : '—'}
                        </td>
                      );
                    })}
                    <td className="py-3 px-5 text-right">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-100 rounded-full text-xs font-bold text-secondary">
                        {agent.lotesCount}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   GENERIC DETAIL (for non-ajustes cards)
   ═══════════════════════════════════════════════════════════ */

interface GenericDetailProps {
  cardKey: CardKey;
  data: any[];
  allData: any[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
}

const GenericDetail: React.FC<GenericDetailProps> = ({ cardKey, data, allData, searchTerm, setSearchTerm }) => {
  /* Sort state for generic detail table */
  const [genericSort, setGenericSort] = useState<SortConfig | null>(null);
  const [sociedadesModal, setSociedadesModal] = useState<any | null>(null);

  /* Column configs per card */
  type Col = { label: string; key?: string; sortKey?: string; render?: (row: any, idx: number) => React.ReactNode; align?: 'right' | 'center' };

  const configs: Record<Exclude<CardKey, 'ajustes'>, { title: string; cols: Col[] }> = {
    componenteP: {
      title: 'Componente Personal por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Resultado', sortKey: 'resultado_final_ajustado', render: r => fmt.format(r.resultado_final_ajustado || 0), align: 'right' },
        { label: 'Escala', sortKey: 'escalaGen', render: r => pct(r.escalaGen || 0), align: 'right' },
        { label: 'Comp. P', sortKey: 'componenteP', render: r => fmt.format(r.componenteP || 0), align: 'right' },
        { label: 'Fijo', sortKey: 'fijo', render: r => fmt.format(r.fijo || 0), align: 'right' },
        { label: 'Variable', sortKey: 'variable_personal', render: r => fmt.format(r.variable_personal || 0), align: 'right' },
      ],
    },
    escalas: {
      title: 'Escalas por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Oficina', sortKey: 'oficina', render: r => r.oficina || '—' },
        { label: 'Cabezas', sortKey: 'cabezasGeneral', render: r => (r.cabezasGeneral || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Escala', sortKey: 'escalaGen', render: r => pct(r.escalaGen || 0), align: 'right' },
        {
          label: 'Ranking',
          render: (r, idx) => (
            <span className="inline-flex items-center justify-center w-6 h-6 bg-accent/10 text-accent text-xs font-bold rounded-full">
              {idx + 1}
            </span>
          ),
          align: 'center',
        },
      ],
    },
    tropas: {
      title: 'Tropas y Cabezas por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Tropas', sortKey: 'tropasGeneral', render: r => (r.tropasGeneral || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Cab. General', sortKey: 'cabezasGeneral', render: r => (r.cabezasGeneral || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Resultado', sortKey: 'resultado_final_ajustado', render: r => fmt.format(r.resultado_final_ajustado || 0), align: 'right' },
      ],
    },
    gastos: {
      title: 'Gastos de Movilidad por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'KMs', sortKey: 'kms', render: r => (r.kms || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Auto', sortKey: 'auto', render: r => r.auto || '—' },
        { label: '$/Km', sortKey: 'precioPorKm', render: r => fmt.format(r.precioPorKm || 0), align: 'right' },
        { label: 'Movilidad', sortKey: 'gastosMovilidad', render: r => fmt.format(r.gastosMovilidad || 0), align: 'right' },
        { label: 'Amort.', sortKey: 'amortizacioneDcac', render: r => fmt.format(r.amortizacioneDcac || 0), align: 'right' },
      ],
    },
    minimos: {
      title: 'Análisis de Mínimos por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Sueldo', sortKey: 'sueldoBruto', render: r => fmt.format(r.sueldoBruto || 0), align: 'right' },
        { label: 'Mínimo', sortKey: 'minimo', render: r => fmt.format(r.minimo || 0), align: 'right' },
        {
          label: 'Al Mínimo?',
          sortKey: '_atMinimo',
          render: r => {
            const atMin = (r.cierreReal || 0) <= (r.minimo || 0);
            return (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${atMin ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>
                {atMin ? 'Sí' : 'No'}
              </span>
            );
          },
          align: 'center',
        },
        {
          label: 'Diferencia',
          sortKey: '_diffMinimo',
          render: r => {
            const diff = (r.cierreReal || 0) - (r.minimo || 0);
            return (
              <span className={diff >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
                {fmt.format(diff)}
              </span>
            );
          },
          align: 'right',
        },
      ],
    },
    sueldoBruto: {
      title: 'Sueldo por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Comp. P', sortKey: 'componenteP', render: r => fmt.format(r.componenteP || 0), align: 'right' },
        { label: 'Ajustes', sortKey: 'ajustes', render: r => fmt.format(r.ajustes || 0), align: 'right' },
        { label: 'Sueldo', sortKey: 'sueldoBruto', render: r => fmt.format(r.sueldoBruto || 0), align: 'right' },
      ],
    },
    cierreReal: {
      title: 'Cierre Real por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Sueldo', sortKey: 'sueldoBruto', render: r => fmt.format(r.sueldoBruto || 0), align: 'right' },
        { label: 'Ajustes', sortKey: 'ajustes', render: r => fmt.format(r.ajustes || 0), align: 'right' },
        { label: 'Cierre', sortKey: 'cierreReal', render: r => fmt.format(r.cierreReal || 0), align: 'right' },
        {
          label: 'vs Mínimo',
          sortKey: '_diffCierre',
          render: r => {
            const diff = (r.cierreReal || 0) - (r.minimo || 0);
            return (
              <span className={diff >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>
                {fmt.format(diff)}
              </span>
            );
          },
          align: 'right',
        },
      ],
    },
    tajada: {
      title: 'Componente Regional por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Tropas Reg.', sortKey: 'tropasRegional', render: r => (r.tropasRegional || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Cabezas Reg.', sortKey: 'cabezasRegional', render: r => (r.cabezasRegional || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Resultado Reg.', sortKey: 'resultadoReg', render: r => fmt.format(r.resultadoReg || 0), align: 'right' },
        { label: 'Bolsa', sortKey: 'bolsaRegion', render: r => fmt.format(r.bolsaRegion || 0), align: 'right' },
        { label: 'Comp. R', sortKey: 'componenteR', render: r => fmt.format(r.componenteR || 0), align: 'right' },
      ],
    },
    oficina: {
      title: 'Componente Oficina por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Tropas Ofi.', sortKey: 'tropasOficina', render: r => (r.tropasOficina || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Cabezas Ofi.', sortKey: 'cabezasOfi', render: r => (r.cabezasOfi || 0).toLocaleString('es-AR'), align: 'right' },
        { label: 'Resultado Ofi.', sortKey: 'resultadoOfi', render: r => fmt.format(r.resultadoOfi || 0), align: 'right' },
        { label: 'Comp. O', sortKey: 'componenteO', render: r => fmt.format(r.componenteO || 0), align: 'right' },
      ],
    },
    costoRed: {
      title: 'Costo Red Regional por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Sueldo Bruto', sortKey: 'sueldoBruto', render: r => fmt.format(r.sueldoBruto || 0), align: 'right' },
        { label: 'Amort. DCAC', sortKey: 'amortizacioneDcac', render: r => fmt.format(r.amortizacioneDcac || 0), align: 'right' },
        { label: 'Reintegro Mov.', sortKey: 'reintegroMovilidad', render: r => fmt.format(r.reintegroMovilidad || 0), align: 'right' },
        { label: 'Gastos Mkt', sortKey: 'gastosMkt', render: r => fmt.format(r.gastosMkt || 0), align: 'right' },
        {
          label: 'Total',
          sortKey: '_costoTotal',
          render: r => fmt.format((r.sueldoBruto || 0) + (r.amortizacioneDcac || 0) + (r.reintegroMovilidad || 0) + (r.gastosMkt || 0)),
          align: 'right'
        },
      ],
    },
    rendimiento: {
      title: 'Rendimiento Medio por Agente',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Rendimiento', sortKey: 'rendimientoGen', render: r => pct((r.rendimientoGen || 0) / 100), align: 'right' },
        { label: 'CCC', sortKey: 'cccGen', render: r => pct((r.cccGen || 0) / 100), align: 'right' },
        { label: 'Soc. Op', sortKey: 'socOpGen', render: r => (r.socOpGen || 0).toLocaleString('es-AR'), align: 'right' },
      ],
    },
    sociedades: {
      title: 'Tajada Regional — Sociedades Operadas',
      cols: [
        { label: 'Comercial', sortKey: 'asociadoComercial', render: r => r.asociadoComercial },
        { label: 'Oficina', sortKey: 'oficina', render: r => r.oficina || '--' },
        { label: 'Provincia', sortKey: 'provincia', render: r => r.provincia || '--' },
        { 
          label: 'Soc. Agente', 
          sortKey: 'socOpGen', 
          render: r => (
            <button 
              onClick={() => setSociedadesModal(r)} 
              className="px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 rounded-lg font-bold transition-colors"
            >
              {(r.socOpGen || 0).toLocaleString('es-AR')}
            </button>
          ), 
          align: 'center' 
        },
        { label: 'Soc. Oficina', sortKey: 'socOpOficina', render: r => (r.socOpOficina || 0).toLocaleString('es-AR'), align: 'center' },
        { 
          label: '% Real', 
          sortKey: '_pctReal', 
          render: r => {
             const poolTot = r.socOpOficina || 1;
             const pctReal = (r.socOpGen || 0) / poolTot;
             return `${(pctReal * 100).toFixed(1)}%`;
          }, 
          align: 'right' 
        },
        { label: '% Tajada Asignada', sortKey: 'tajadaRegion', render: r => `${((r.tajadaRegion || 0) * 100).toFixed(1)}%`, align: 'right' },
        { label: '% Bolsa Reg.', sortKey: 'bolsaRegion', render: r => `${((r.bolsaRegion || 0) * 100).toFixed(1)}%`, align: 'right' },
      ],
    },
  };

  const config = configs[cardKey as Exclude<CardKey, 'ajustes'>];
  if (!config) return null;

  // Sort data: use user-chosen sort or default heuristic
  const sorted = useMemo(() => {
    const getSortValue = (row: any, key: string): any => {
      // Handle computed sort keys
      if (key === '_atMinimo') return (row.cierreReal || 0) <= (row.minimo || 0) ? 1 : 0;
      if (key === '_diffMinimo') return (row.cierreReal || 0) - (row.minimo || 0);
      if (key === '_diffCierre') return (row.cierreReal || 0) - (row.minimo || 0);
      return row[key];
    };

    if (genericSort) {
      return [...data].sort((a, b) => {
        const dir = genericSort.direction === 'asc' ? 1 : -1;
        const aVal = getSortValue(a, genericSort.key);
        const bVal = getSortValue(b, genericSort.key);
        if (typeof aVal === 'string' && typeof bVal === 'string') return dir * aVal.localeCompare(bVal);
        return dir * ((Number(aVal) || 0) - (Number(bVal) || 0));
      });
    }

    // Default sort heuristic
    return [...data].sort((a, b) => {
      if (cardKey === 'escalas') return (b.escalaGen || 0) - (a.escalaGen || 0);
      if (cardKey === 'componenteP') return (b.componenteP || 0) - (a.componenteP || 0);
      if (cardKey === 'tropas') return (b.cabezasGeneral || 0) - (a.cabezasGeneral || 0);
      if (cardKey === 'gastos') return (b.gastosMovilidad || 0) - (a.gastosMovilidad || 0);
      if (cardKey === 'minimos') return (a.cierreReal || 0) - (a.minimo || 0) - ((b.cierreReal || 0) - (b.minimo || 0));
      if (cardKey === 'sueldoBruto') return (b.sueldoBruto || 0) - (a.sueldoBruto || 0);
      if (cardKey === 'cierreReal') return (b.cierreReal || 0) - (a.cierreReal || 0);
      return 0;
    });
  }, [data, genericSort, cardKey]);

  return (
    <div>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-primary">{config.title}</h3>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Buscar comercial…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-secondary text-xs font-semibold uppercase tracking-wide">
            <tr>
              {config.cols.map((col, i) => (
                <th
                  key={i}
                  className={`py-3 px-5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortKey ? sortableThClass : ''}`}
                  onClick={col.sortKey ? () => setGenericSort(toggleSort(col.sortKey!, genericSort)) : undefined}
                >
                  {col.label}{col.sortKey && <SortIcon columnKey={col.sortKey} sort={genericSort} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={config.cols.length} className="py-12 text-center text-secondary">
                  Sin datos disponibles
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <motion.tr
                  key={row.asociadoComercial || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.015 }}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  {config.cols.map((col, ci) => (
                    <td
                      key={ci}
                      className={`py-2.5 px-5 ${ci === 0 ? 'font-semibold text-primary' : 'text-primary'} ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row, idx) : (row[col.key!] ?? '—')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-secondary">
        <span>{sorted.length} de {allData.length} agentes</span>
        <span className="font-medium">
          {cardKey === 'componenteP' && `Total: ${fmt.format(sum(allData, 'componenteP'))}`}
          {cardKey === 'sueldoBruto' && `Total: ${fmt.format(sum(allData, 'sueldoBruto'))}`}
          {cardKey === 'cierreReal' && `Total: ${fmt.format(sum(allData, 'cierreReal'))}`}
          {cardKey === 'gastos' && `Total: ${fmt.format(sum(allData, 'gastosMovilidad'))}`}
          {cardKey === 'tropas' && `Total Cabezas: ${sum(allData, 'cabezasGeneral').toLocaleString('es-AR')}`}
          {cardKey === 'escalas' && `Promedio: ${pct(avg(allData, 'escalaGen'))}`}
          {cardKey === 'minimos' && `${allData.filter(d => (d.cierreReal || 0) <= (d.minimo || 0)).length} al mínimo`}
        </span>
      </div>

      {sociedadesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSociedadesModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-fuchsia-600 rounded-t-2xl text-white">
              <h3 className="text-lg font-bold">🏢 Sociedades de {sociedadesModal.asociadoComercial}</h3>
              <button onClick={() => setSociedadesModal(null)} className="hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2 rounded-l-lg">Sociedad</th>
                    <th className="px-4 py-2 text-right">Cabezas</th>
                    <th className="px-4 py-2 text-right rounded-r-lg">Tropas</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const socs = new Map<string, { cabezas: number; tropas: number }>();
                    const lotesVistos = new Set<string>();
                    for (const op of (sociedadesModal.operacionesDetalle || [])) {
                      const idLote = op.id_lote;
                      
                      const sumar = (soc: string, cabezas: number) => {
                        if (!socs.has(soc)) socs.set(soc, { cabezas: 0, tropas: 0 });
                        const s = socs.get(soc)!;
                        s.cabezas += cabezas;
                        if (!lotesVistos.has(`${soc}-${idLote}`)) {
                          s.tropas += 1;
                          lotesVistos.add(`${soc}-${idLote}`);
                        }
                      };

                      if (op.comercial_venta === sociedadesModal.asociadoComercial && op.sociedad_vendedora) {
                        sumar(op.sociedad_vendedora, op.cantidad || 0);
                      }
                      if (op.comercial_compra === sociedadesModal.asociadoComercial && op.sociedad_compradora) {
                        sumar(op.sociedad_compradora, op.cantidad || 0);
                      }
                    }
                    const rows = Array.from(socs.entries())
                      .map(([nombre, stats]) => ({ nombre, ...stats }))
                      .sort((a, b) => b.cabezas - a.cabezas);
                    
                    return rows.map(r => (
                      <tr key={r.nombre} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-medium text-slate-800">{r.nombre}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{r.cabezas.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{r.tropas.toLocaleString('es-AR')}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariablesHub;
