import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Layers, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import MermaidChart from './MermaidChart';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface RedRegionalProps {
  data: { months: any[]; yearTotals: Record<string, any> };
  selectedMonth: any;
  onSelectMonth: (m: any) => void;
  onBack: () => void;
  activeYear: string;
  activeMonth: string;
}

const fmt = new Intl.NumberFormat('es-AR');
const fmtCur = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : fmt.format(v);

const CHANNELS = ['REGIONAL', 'REPRESENTANTE', 'COMISIONISTA', 'DIRECTO'] as const;
const CH_LABELS: Record<string, string> = { REGIONAL: 'Regional', REPRESENTANTE: 'Representante', COMISIONISTA: 'Comisionista', DIRECTO: 'Directo' };
const CH_COLORS: Record<string, string> = { REGIONAL: '#3b82f6', REPRESENTANTE: '#94a3b8', COMISIONISTA: '#475569', DIRECTO: '#1e3a8a' };
const CH_BG: Record<string, string> = { REGIONAL: 'bg-blue-50 border-blue-200', REPRESENTANTE: 'bg-slate-50 border-slate-200', COMISIONISTA: 'bg-slate-100 border-slate-300', DIRECTO: 'bg-indigo-50 border-indigo-200' };

export default function RedRegional({ data, selectedMonth, onSelectMonth, onBack, activeYear, activeMonth, initialSubTab = 'canales' }: RedRegionalProps) {
  const [matrixCategory, setMatrixCategory] = useState<string>('OVERALL');

  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<string>('MES');

  const [activeSubTab, setActiveSubTab] = useState<'canales' | 'plm'>(initialSubTab);
  const [plmData, setPlmData] = useState<any>(null);
  const [loadingPlm, setLoadingPlm] = useState<boolean>(false);
  const [plmYear, setPlmYear] = useState<string>('2026');
  const [plmViewType, setPlmViewType] = useState<'percent' | 'cabezas' | 'rendimiento'>('percent');

  useEffect(() => {
    if (activeSubTab === 'plm' && !plmData) {
      setLoadingPlm(true);
      fetch(`${API_URL}/metricas-plm`)
        .then(res => res.json())
        .then(data => {
          setPlmData(data);
          setLoadingPlm(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingPlm(false);
        });
    }
  }, [activeSubTab, plmData]);

  const baseMonth = selectedMonth;
  if (!baseMonth) return null;

  // ─── Period definitions ───
  const PERIOD_DEFS: Record<string, { label: string; months: number[] }> = {
    MES: { label: baseMonth.monthName?.substring(0, 3), months: [baseMonth.month] },
    Q1: { label: 'Q1 (Ene-Mar)', months: [1, 2, 3] },
    Q2: { label: 'Q2 (Abr-Jun)', months: [4, 5, 6] },
    Q3: { label: 'Q3 (Jul-Sep)', months: [7, 8, 9] },
    Q4: { label: 'Q4 (Oct-Dic)', months: [10, 11, 12] },
    H1: { label: 'H1 (Ene-Jun)', months: [1, 2, 3, 4, 5, 6] },
    H2: { label: 'H2 (Jul-Dic)', months: [7, 8, 9, 10, 11, 12] },
    AÑO: { label: `Año ${baseMonth.year}`, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  };

  // ─── Aggregate months for selected period ───
  // Available months for the active year
  const yearMonths = useMemo(() => {
    return data.months.filter((pm: any) => pm.year === baseMonth.year);
  }, [data.months, baseMonth.year]);

  const periodMonths = useMemo(() => {
    const def = PERIOD_DEFS[periodType];
    if (!def) return periodType === 'MES' ? [baseMonth] : [];
    if (periodType === 'MES') return [baseMonth];
    return yearMonths.filter((pm: any) => def.months.includes(pm.month));
  }, [yearMonths, baseMonth, periodType]);

  const m = useMemo(() => {
    if (periodMonths.length === 0) {
      // No data for this period — return zeroed structure
      return {
        year: baseMonth.year, month: 0, monthName: PERIOD_DEFS[periodType]?.label || '', anioMes: '',
        tropas: 0, cabezas: 0, importe: 0, resultado: 0, bonificaciones: 0, costoRed: 0, agentes: 0,
        canales: {
          REGIONAL: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
          REPRESENTANTE: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
          COMISIONISTA: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
          DIRECTO: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
        },
        categoriasDetalle: {}, acDetail: [],
      };
    }
    if (periodMonths.length === 1) return periodMonths[0];

    // Aggregate multiple months
    const agg: any = {
      year: baseMonth.year,
      month: baseMonth.month,
      monthName: PERIOD_DEFS[periodType]?.label || '',
      anioMes: baseMonth.anioMes,
      tropas: 0, cabezas: 0, importe: 0, resultado: 0, bonificaciones: 0,
      costoRed: 0, agentes: 0,
      canales: {
        REGIONAL: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
        REPRESENTANTE: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
        COMISIONISTA: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
        DIRECTO: { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, reps: 0, ccc: 0, bonifPct: 0 },
      },
      categoriasDetalle: {} as any,
      acDetail: [] as any[],
    };

    const agentesSet = new Set<string>();
    const canalRepsSet: Record<string, Set<string>> = {
      REGIONAL: new Set(), REPRESENTANTE: new Set(), COMISIONISTA: new Set(), DIRECTO: new Set()
    };
    // For weighted CCC average
    const cccNumerators: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };
    const cccDenominators: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };

    for (const pm of periodMonths) {
      agg.tropas += pm.tropas || 0;
      agg.cabezas += pm.cabezas || 0;
      agg.importe += pm.importe || 0;
      agg.resultado += pm.resultado || 0;
      agg.bonificaciones += pm.bonificaciones || 0;
      agg.costoRed += pm.costoRed || 0;

      // Merge canales
      for (const ck of ['REGIONAL', 'REPRESENTANTE', 'COMISIONISTA', 'DIRECTO']) {
        const src = pm.canales?.[ck];
        if (!src) continue;
        const dst = agg.canales[ck];
        dst.cabezas += src.cabezas || 0;
        dst.tropas += src.tropas || 0;
        dst.importe += src.importe || 0;
        dst.bonificaciones += src.bonificaciones || 0;
        // CCC: acumular para promediar por volumen
        if (src.ccc > 0) {
          cccNumerators[ck] += (src.ccc * (src.cabezas || 0));
          cccDenominators[ck] += (src.cabezas || 0);
        }
      }

      // Merge categoriasDetalle
      if (pm.categoriasDetalle) {
        for (const [catKey, catVal] of Object.entries(pm.categoriasDetalle) as [string, any][]) {
          if (!agg.categoriasDetalle[catKey]) {
            agg.categoriasDetalle[catKey] = { totalCabezas: 0, venta: {}, compra: {}, cruces: {} };
          }
          const dst = agg.categoriasDetalle[catKey];
          dst.totalCabezas += catVal.totalCabezas || 0;
          for (const [k, v] of Object.entries(catVal.venta || {})) dst.venta[k] = (dst.venta[k] || 0) + (v as number);
          for (const [k, v] of Object.entries(catVal.compra || {})) dst.compra[k] = (dst.compra[k] || 0) + (v as number);
          for (const [k, v] of Object.entries(catVal.cruces || {})) dst.cruces[k] = (dst.cruces[k] || 0) + (v as number);
        }
      }

      // Merge acDetail (unique by nombre, sum values)
      if (pm.acDetail) {
        for (const ac of pm.acDetail) {
          if (ac.nombre) agentesSet.add(ac.nombre);
          agg.acDetail.push(ac);
        }
      }
    }

    // Compute CCC and bonifPct for aggregated canales
    for (const ck of ['REGIONAL', 'REPRESENTANTE', 'COMISIONISTA', 'DIRECTO']) {
      const dst = agg.canales[ck];
      dst.ccc = cccDenominators[ck] > 0 ? cccNumerators[ck] / cccDenominators[ck] : 0;
      dst.bonifPct = dst.importe > 0 ? dst.bonificaciones / dst.importe : 0;
      dst.reps = canalRepsSet[ck].size;
    }
    agg.agentes = agentesSet.size || Math.max(...periodMonths.map((pm: any) => pm.agentes || 0));

    // Consolidate acDetail by nombre (sum across months)
    const acMap = new Map<string, any>();
    for (const ac of agg.acDetail) {
      const key = ac.nombre || ac.codigo;
      if (acMap.has(key)) {
        const existing = acMap.get(key);
        existing.cabezas += ac.cabezas || 0;
        existing.cabezasVenta += ac.cabezasVenta || 0;
        existing.cabezasCompra += ac.cabezasCompra || 0;
        existing.tropas += ac.tropas || 0;
        existing.importe += ac.importe || 0;
        existing.resultado += ac.resultado || 0;
        existing.sueldoBruto += ac.sueldoBruto || 0;
        existing.gastosMkt += ac.gastosMkt || 0;
        existing.amortizacion += ac.amortizacion || 0;
        existing.movilidad += ac.movilidad || 0;
        existing.costoTotal += ac.costoTotal || 0;
        existing.fijo += ac.fijo || 0;
        existing.variable += ac.variable || 0;
      } else {
        acMap.set(key, { ...ac });
      }
    }
    agg.acDetail = Array.from(acMap.values());

    return agg;
  }, [periodMonths, baseMonth, periodType]);

  // Period label for display
  const periodLabel = periodType === 'MES' ? `${m.monthName} ${m.year}` : `${PERIOD_DEFS[periodType]?.label} — ${baseMonth.year}`;

  // ─── Derived Data ───
  const canales = m.canales || {};
  const totalCabezas = m.cabezas || 0;
  const totalTropas = m.tropas || 0;
  const totalImporte = m.importe || 0;
  const totalResultado = m.resultado || 0;
  const totalBonif = m.bonificaciones || 0;
  const costoRed = m.costoRed || 0;

  // Agrupar costo de ACs por canal según su tipo
  const costosPorCanal: Record<string, number> = { REGIONAL: 0, REPRESENTANTE: 0, COMISIONISTA: 0, DIRECTO: 0 };
  if (m.acDetail) {
    for (const ac of m.acDetail) {
      const tipo = (ac.tipo || '').toUpperCase();
      if (tipo === 'REGIONAL' || tipo === 'CITY MANAGER') {
        costosPorCanal.REGIONAL += ac.costoTotal || 0;
      } else if (tipo === 'REPRESENTANTE') {
        costosPorCanal.REPRESENTANTE += ac.costoTotal || 0;
      } else {
        // Corporate, Operario, etc → se asigna a DIRECTO
        costosPorCanal.DIRECTO += ac.costoTotal || 0;
      }
    }
  }

  // Key Ratios
  const margenNeto = (totalImporte + totalBonif) > 0 ? totalResultado / (totalImporte + totalBonif) : 0;
  const bonifSobreImporte = totalImporte > 0 ? totalBonif / totalImporte : 0;
  const costoSobreIngreso = (totalImporte + totalBonif) > 0 ? costoRed / (totalImporte + totalBonif) : 0;
  const resultadoPorCabeza = totalCabezas > 0 ? totalResultado / totalCabezas : 0;
  const importePorCabeza = totalCabezas > 0 ? totalImporte / totalCabezas : 0;

  // YoY comparison
  const prevYearMonth = data.months.find((pm: any) => pm.year === baseMonth.year - 1 && pm.month === baseMonth.month);
  const yoyGrowth = prevYearMonth && prevYearMonth.cabezas > 0
    ? ((m.cabezas - prevYearMonth.cabezas) / prevYearMonth.cabezas) * 100
    : null;

  // Chart data (all months of selected year)
  const chartMonths = useMemo(() => {
    return data.months
      .filter((cm: any) => cm.year === baseMonth.year)
      .sort((a: any, b: any) => a.month - b.month)
      .map((cm: any) => ({
        name: cm.monthName?.substring(0, 3),
        Regional: cm.canales?.REGIONAL?.cabezas || 0,
        Representante: cm.canales?.REPRESENTANTE?.cabezas || 0,
        Comisionista: cm.canales?.COMISIONISTA?.cabezas || 0,
        Directo: cm.canales?.DIRECTO?.cabezas || 0,
        total: cm.cabezas || 0,
        isSelected: periodType === 'MES' ? cm.month === baseMonth.month : PERIOD_DEFS[periodType]?.months.includes(cm.month),
      }));
  }, [data.months, baseMonth.year, baseMonth.month, periodType]);

  // ─── Cross table data ───
  const catData = m.categoriasDetalle?.[matrixCategory] || { totalCabezas: 0, cruces: {}, venta: {}, compra: {} };
  const allCruceVals = CHANNELS.flatMap(v => CHANNELS.map(c => (catData.cruces?.[`${v} - ${c}`] || 0)));
  const maxCruceVal = Math.max(...allCruceVals) || 1;
  const rowTotals = CHANNELS.map(v => CHANNELS.reduce((s, c) => s + (catData.cruces?.[`${v} - ${c}`] || 0), 0));
  const colTotals = CHANNELS.map(c => CHANNELS.reduce((s, v) => s + (catData.cruces?.[`${v} - ${c}`] || 0), 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  // ─── Mermaid Diagram ───
  const buildMermaidDiagram = () => {
    if (!catData || catData.totalCabezas === 0) return null;
    const ventaChannels = CHANNELS.filter(ch => (catData.venta?.[ch] || 0) > 0);
    const compraChannels = CHANNELS.filter(ch => (catData.compra?.[ch] || 0) > 0);
    if (ventaChannels.length === 0 && compraChannels.length === 0) return null;

    let mmd = 'graph LR\n';
    mmd += '  classDef ventaRegional fill:#dbeafe,stroke:#3b82f6,color:#1e40af,font-weight:bold\n';
    mmd += '  classDef ventaRepre fill:#f1f5f9,stroke:#94a3b8,color:#475569,font-weight:bold\n';
    mmd += '  classDef ventaCom fill:#e2e8f0,stroke:#475569,color:#1e293b,font-weight:bold\n';
    mmd += '  classDef ventaDir fill:#e0e7ff,stroke:#1e3a8a,color:#1e3a8a,font-weight:bold\n';
    mmd += '  classDef compraRegional fill:#dbeafe,stroke:#3b82f6,color:#1e40af,font-weight:bold\n';
    mmd += '  classDef compraRepre fill:#f1f5f9,stroke:#94a3b8,color:#475569,font-weight:bold\n';
    mmd += '  classDef compraCom fill:#e2e8f0,stroke:#475569,color:#1e293b,font-weight:bold\n';
    mmd += '  classDef compraDir fill:#e0e7ff,stroke:#1e3a8a,color:#1e3a8a,font-weight:bold\n\n';

    for (const vCh of ventaChannels) {
      const vLabel = CH_LABELS[vCh];
      const vTotal = catData.venta?.[vCh] || 0;
      mmd += `  V_${vCh}["🟢 ${vLabel}<br/>${fmtK(vTotal)} cabz"]\n`;
    }
    for (const cCh of compraChannels) {
      const cLabel = CH_LABELS[cCh];
      const cTotal = catData.compra?.[cCh] || 0;
      mmd += `  C_${cCh}["🔵 ${cLabel}<br/>${fmtK(cTotal)} cabz"]\n`;
    }
    mmd += '\n';

    for (const vCh of ventaChannels) {
      for (const cCh of compraChannels) {
        const val = catData.cruces?.[`${vCh} - ${cCh}`] || 0;
        if (val > 0) {
          const maxVal = Math.max(...Object.values(catData.cruces || {}).map(Number)) || 1;

          const pct = catData.totalCabezas > 0 ? ((val / catData.totalCabezas) * 100).toFixed(0) : '0';
          mmd += `  V_${vCh} -->|"${fmtK(val)} (${pct}%)"| C_${cCh}\n`;
        }
      }
    }

    for (const ch of ventaChannels) {
      const cls = ch === 'REGIONAL' ? 'ventaRegional' : ch === 'REPRESENTANTE' ? 'ventaRepre' : ch === 'COMISIONISTA' ? 'ventaCom' : 'ventaDir';
      mmd += `  class V_${ch} ${cls}\n`;
    }
    for (const ch of compraChannels) {
      const cls = ch === 'REGIONAL' ? 'compraRegional' : ch === 'REPRESENTANTE' ? 'compraRepre' : ch === 'COMISIONISTA' ? 'compraCom' : 'compraDir';
      mmd += `  class C_${ch} ${cls}\n`;
    }
    return mmd;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-[10px]">
        <p className="font-black text-slate-800 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="font-bold" style={{ color: p.fill || p.stroke }}>
            {p.name}: {fmt.format(p.value)} cabz
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[98%] 2xl:max-w-[1800px] mx-auto pb-24 mt-8 px-4">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-sm">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-teal-500" />
            Métricas Red Regional
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Datos deduplicados por id_lote · Q95 + Roster</p>
        </div>

        {/* Period type selector */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
          {['MES', 'Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'AÑO'].map(pt => {
            const def = PERIOD_DEFS[pt];
            const hasData = pt === 'MES' ? true : yearMonths.some((pm: any) => def?.months.includes(pm.month));
            const count = pt === 'MES' ? null : yearMonths.filter((pm: any) => def?.months.includes(pm.month)).length;
            return (
              <button
                key={pt}
                onClick={() => hasData && setPeriodType(pt)}
                disabled={!hasData}
                className={`px-2 py-1 rounded-lg text-[8px] font-black whitespace-nowrap transition-all ${
                  !hasData
                    ? 'text-slate-300 cursor-not-allowed'
                    : periodType === pt
                    ? 'bg-teal-600 text-white shadow-sm cursor-pointer'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white cursor-pointer'
                }`}
                title={hasData ? `${count ?? 1} mes(es) con datos` : 'Sin datos para este período'}
              >
                {pt}{count !== null && hasData ? <span className="text-[7px] opacity-70 ml-0.5">({count})</span> : ''}
              </button>
            );
          })}
        </div>

        {/* Month selector pills (only show when period = MES) */}
        {periodType === 'MES' && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200 max-w-[600px] overflow-x-auto">
            {data.months.filter((pm: any) => pm.year === baseMonth.year).sort((a: any, b: any) => a.month - b.month).map((pm: any) => (
              <button
                key={pm.anioMes}
                onClick={() => onSelectMonth(pm)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black whitespace-nowrap transition-all cursor-pointer ${pm.anioMes === baseMonth.anioMes ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}
              >
                {pm.monthName?.substring(0, 3)}
              </button>
            ))}
          </div>
        )}

        <span className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-black">
          {periodLabel}
          {periodType !== 'MES' && <span className="text-[9px] text-teal-500 ml-1">({periodMonths.length} {periodMonths.length === 1 ? 'mes' : 'meses'})</span>}
        </span>
      </div>

      {/* Sub-tab selection */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('canales')}
          className={`pb-2 px-4 font-black text-xs transition-all border-b-2 cursor-pointer ${
            activeSubTab === 'canales'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Canales e Intermediación
        </button>
        <button
          onClick={() => setActiveSubTab('plm')}
          className={`pb-2 px-4 font-black text-xs transition-all border-b-2 cursor-pointer ${
            activeSubTab === 'plm'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Métricas PLM (Share por UN)
        </button>
      </div>

      {activeSubTab === 'canales' && (
        <>
          {/* ═══ KPI CARDS — Fila 1 ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        {[
          { label: 'Cabezas', value: fmt.format(totalCabezas), sub: yoyGrowth !== null ? `${yoyGrowth > 0 ? '↑' : '↓'} ${Math.abs(yoyGrowth).toFixed(0)}% YoY` : '', color: 'text-teal-600', subColor: yoyGrowth !== null && yoyGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500' },
          { label: 'Tropas', value: fmt.format(totalTropas), sub: `${totalCabezas > 0 ? (totalCabezas / totalTropas).toFixed(0) : 0} cbz/tropa`, color: 'text-blue-600' },
          { label: 'Importe Vta', value: fmtCur.format(totalImporte), sub: fmtCur.format(importePorCabeza) + '/cbz', color: 'text-slate-700' },
          { label: 'Resultado', value: fmtCur.format(totalResultado), sub: fmtCur.format(resultadoPorCabeza) + '/cbz', color: totalResultado >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Bonificaciones', value: fmtCur.format(totalBonif), sub: fmtPct(bonifSobreImporte) + ' s/imp', color: 'text-amber-600' },
          { label: 'Costo ACs', value: fmtCur.format(costoRed), sub: fmtPct(costoSobreIngreso) + ' s/(Imp+Bon)', color: 'text-rose-600' },
          { label: 'Margen Neto', value: fmtPct(margenNeto), sub: 'Res/(Imp+Bon)', color: margenNeto >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Agentes', value: m.agentes || 0, sub: 'ACs activos', color: 'text-violet-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-sm lg:text-base font-black ${kpi.color} leading-tight truncate`}>{kpi.value}</p>
            <p className={`text-[9px] font-bold mt-0.5 ${kpi.subColor || 'text-slate-400'} truncate`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══ CANAL BREAKDOWN TABLE ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📊 Desglose por Canal</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/30">
                <th className="px-4 py-2 text-left font-black text-[9px] uppercase tracking-widest text-slate-400">Canal</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Cabezas</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">% Vol</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Tropas</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Importe</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Bonif.</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Bonif/Imp</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400" title="Concretación: Concretada / (Concretada + No Concretada) — solo venta">CCC</th>
                <th className="px-3 py-2 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">Reps</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map(ch => {
                const c = canales[ch] || { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, ccc: 0, bonifPct: 0, reps: 0 };
                const pctVol = totalCabezas > 0 ? (c.cabezas / totalCabezas * 100) : 0;
                const isExpanded = expandedChannel === ch;
                const overallCruces = m.categoriasDetalle?.OVERALL?.cruces || {};
                return (
                  <React.Fragment key={ch}>
                    <tr
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                      onClick={() => setExpandedChannel(isExpanded ? null : ch)}
                    >
                      <td className="px-4 py-2.5 font-black text-[11px]">
                        <span className="flex items-center gap-2">
                          <span className={`text-[8px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CH_COLORS[ch] }} />
                          {CH_LABELS[ch]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-slate-800">{fmt.format(c.cabezas)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-500">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pctVol}%`, backgroundColor: CH_COLORS[ch] }} />
                          </div>
                          {pctVol.toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-600">{fmt.format(c.tropas)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-600">{fmtCur.format(c.importe)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-600">{fmtCur.format(c.bonificaciones)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-500">{fmtPct(c.bonifPct)}</td>
                      <td className="px-3 py-2.5 text-right font-black">
                        <span className={c.ccc > 1 ? 'text-emerald-600' : c.ccc > 0.5 ? 'text-amber-600' : 'text-rose-500'}>
                          {(c.ccc * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-600">{c.reps}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <div className="bg-slate-50/80 border-y border-slate-200 px-6 py-3">
                            <div className="bg-white/60 rounded-lg px-3 py-2 mb-3 border border-slate-200/80">
                              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
                                Cada operación tiene dos partes: un <strong className="text-emerald-600">vendedor</strong> y un <strong className="text-blue-600">comprador</strong>, cada uno clasificado en un canal.
                                Acá se muestra cómo se conecta <strong className="text-slate-800">{CH_LABELS[ch]}</strong> con los demás canales:
                                a la izquierda, cuando {CH_LABELS[ch]} actúa como intermediario de la <strong className="text-emerald-600">venta</strong> (¿quién compra del otro lado?);
                                a la derecha, cuando {CH_LABELS[ch]} actúa del lado de la <strong className="text-blue-600">compra</strong> (¿quién vende del otro lado?).
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {/* Venta: este canal vende → otros compran */}
                              <div>
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">🟢 {CH_LABELS[ch]} vende → ¿quién compra?</p>
                                <p className="text-[8px] font-bold text-slate-400 mb-2">Cabezas operadas donde {CH_LABELS[ch]} interviene en la venta</p>
                                <div className="space-y-1">
                                  {CHANNELS.map(target => {
                                    const val = overallCruces[`${ch} - ${target}`] || 0;
                                    if (val === 0) return null;
                                    const ventaTotal = CHANNELS.reduce((s, t) => s + (overallCruces[`${ch} - ${t}`] || 0), 0);
                                    const pct = ventaTotal > 0 ? (val / ventaTotal * 100) : 0;
                                    return (
                                      <div key={target} className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLORS[target] }} />
                                        <span className="text-[9px] font-bold text-slate-600 w-24">{CH_LABELS[target]}</span>
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-800 w-16 text-right">{fmt.format(val)}</span>
                                        <span className="text-[8px] font-bold text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* Compra: otros venden → este canal compra */}
                              <div>
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-0.5">🔵 {CH_LABELS[ch]} compra ← ¿quién vende?</p>
                                <p className="text-[8px] font-bold text-slate-400 mb-2">Cabezas operadas donde {CH_LABELS[ch]} interviene en la compra</p>
                                <div className="space-y-1">
                                  {CHANNELS.map(source => {
                                    const val = overallCruces[`${source} - ${ch}`] || 0;
                                    if (val === 0) return null;
                                    const compraTotal = CHANNELS.reduce((s, src) => s + (overallCruces[`${src} - ${ch}`] || 0), 0);
                                    const pct = compraTotal > 0 ? (val / compraTotal * 100) : 0;
                                    return (
                                      <div key={source} className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLORS[source] }} />
                                        <span className="text-[9px] font-bold text-slate-600 w-24">{CH_LABELS[source]}</span>
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-800 w-16 text-right">{fmt.format(val)}</span>
                                        <span className="text-[8px] font-bold text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Total row */}
              <tr className="bg-slate-100/60 font-black">
                <td className="px-4 py-2.5 text-[11px] text-slate-700">TOTAL</td>
                <td className="px-3 py-2.5 text-right text-slate-800">{fmt.format(totalCabezas)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">100%</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{fmt.format(totalTropas)}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{fmtCur.format(totalImporte)}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{fmtCur.format(totalBonif)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">{fmtPct(bonifSobreImporte)}</td>
                <td className="px-3 py-2.5 text-right text-slate-500">—</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{m.agentes || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ GRID: Cross Table + Trend Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">

        {/* Cross Table (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🔀 Cruce de Canales: Venta → Compra</span>
            <div className="flex flex-wrap gap-1">
              {m.categoriasDetalle && Object.keys(m.categoriasDetalle).sort().map((catKey: string) => {
                const catName = catKey === 'OVERALL' ? 'Consolidado' : catKey.charAt(0) + catKey.slice(1).toLowerCase();
                const cd = m.categoriasDetalle[catKey];
                if (cd.totalCabezas === 0) return null;
                return (
                  <button
                    key={catKey}
                    onClick={() => setMatrixCategory(catKey)}
                    className={`px-2 py-0.5 rounded-lg text-[8px] font-black transition-all cursor-pointer border ${matrixCategory === catKey ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <th className="px-3 py-2 text-left font-black text-[8px] uppercase tracking-widest text-slate-400 border-b border-r border-slate-200">
                    Venta ↓ / Compra →
                  </th>
                  {CHANNELS.map(c => (
                    <th key={c} className="px-3 py-2 text-center font-black text-[8px] uppercase tracking-wider border-b border-r border-slate-200" style={{ color: CH_COLORS[c] }}>
                      {CH_LABELS[c]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-black text-[8px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-100/80">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((v, vi) => (
                  <tr key={v} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 font-black text-[10px] border-b border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLORS[v] }} />
                        {CH_LABELS[v]}
                      </span>
                    </td>
                    {CHANNELS.map(c => {
                      const val = catData.cruces?.[`${v} - ${c}`] || 0;
                      const intensity = val > 0 ? Math.max(0.06, (val / maxCruceVal) * 0.25) : 0;
                      const pct = grandTotal > 0 ? (val / grandTotal * 100) : 0;
                      return (
                        <td key={c} className="px-3 py-1.5 text-center border-b border-r border-slate-200"
                          style={{ backgroundColor: val > 0 ? `rgba(20, 184, 166, ${intensity})` : 'transparent' }}>
                          {val > 0 ? (
                            <div>
                              <span className="font-black text-slate-800 text-[11px]">{fmt.format(val)}</span>
                              <span className="block text-[7px] font-bold text-slate-400">{pct.toFixed(1)}%</span>
                            </div>
                          ) : <span className="text-slate-300 font-bold">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center font-black text-slate-700 border-b border-slate-200 bg-slate-100/50 text-[11px]">
                      {fmt.format(rowTotals[vi])}
                      <span className="block text-[7px] font-bold text-slate-400">{grandTotal > 0 ? (rowTotals[vi] / grandTotal * 100).toFixed(0) : 0}%</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100/80 font-black">
                  <td className="px-3 py-2 text-[8px] uppercase tracking-wider text-slate-500 border-r border-slate-200">Total</td>
                  {CHANNELS.map((c, ci) => (
                    <td key={c} className="px-3 py-1.5 text-center text-slate-700 border-r border-slate-200 text-[11px]">
                      {fmt.format(colTotals[ci])}
                      <span className="block text-[7px] font-bold text-slate-400">{grandTotal > 0 ? (colTotals[ci] / grandTotal * 100).toFixed(0) : 0}%</span>
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center text-teal-700 bg-teal-50/50 text-[11px]">{fmt.format(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend Chart (5/12) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📈 Volumen Mensual {m.year}</span>
            <div className="flex items-center gap-2 text-[7px] font-extrabold uppercase text-slate-500">
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> REG</span>
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" /> REP</span>
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#475569]" /> COM</span>
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]" /> DIR</span>
            </div>
          </div>
          <div className="flex-1 p-3 min-h-[220px]">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartMonths} margin={{ top: 15, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: '800' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 8, fontWeight: '700' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
                <Bar dataKey="Regional" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Representante" stackId="a" fill="#94a3b8" />
                <Bar dataKey="Comisionista" stackId="a" fill="#475569" />
                <Bar dataKey="Directo" stackId="a" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#ffffff', stroke: '#64748b', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ Financial Ratios ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">💰 Ratios Financieros por Canal</span>
        </div>
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CHANNELS.map(ch => {
              const c = canales[ch] || { cabezas: 0, tropas: 0, importe: 0, bonificaciones: 0, ccc: 0, bonifPct: 0, reps: 0 };
              const chBonifSobreImp = c.importe > 0 ? c.bonificaciones / c.importe : 0;
              const pctVol = totalCabezas > 0 ? (c.cabezas / totalCabezas) : 0;
              return (
                <div key={ch} className={`rounded-xl p-3 border ${CH_BG[ch]}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLORS[ch] }} />
                    <span className="text-[10px] font-black text-slate-700">{CH_LABELS[ch]}</span>
                  </div>
                  <div className="space-y-1.5 text-[9px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vol.</span>
                      <span className="font-black text-slate-800">{fmtK(c.cabezas)} ({(pctVol * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CCC (Concr.)</span>
                      <span className={`font-black ${c.ccc > 1 ? 'text-emerald-600' : c.ccc > 0.5 ? 'text-amber-600' : 'text-rose-500'}`}>
                        {(c.ccc * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bonif/Imp</span>
                      <span className="font-black text-amber-600">{fmtPct(chBonifSobreImp)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1">
                      <span className="text-slate-500 font-black">Costo ACs</span>
                      <span className="font-black text-rose-600">{fmtCur.format(costosPorCanal[ch])}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Costo/(Imp+Bon)</span>
                      <span className="font-black text-rose-500">
                        {(c.importe + c.bonificaciones) > 0 ? fmtPct(costosPorCanal[ch] / (c.importe + c.bonificaciones)) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reps</span>
                      <span className="font-black text-slate-700">{c.reps}</span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
      </div>

      {/* ═══ AC DETAIL TABLE ═══ */}
      {m.acDetail && m.acDetail.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">👥 Asociados Comerciales — Costo Red</span>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5">Sueldos, gastos, amortizaciones y movilidad de cada AC</p>
            </div>
            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{m.acDetail.length} ACs</span>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-200 bg-slate-50/30">
                  <th className="px-3 py-2 text-left font-black text-[8px] uppercase tracking-widest text-slate-400">AC</th>
                  <th className="px-2 py-2 text-left font-black text-[8px] uppercase tracking-wider text-slate-400">Tipo</th>
                  <th className="px-2 py-2 text-left font-black text-[8px] uppercase tracking-wider text-slate-400">Oficina</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Cabezas</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Sueldo</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Gastos</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Amort.</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Movil.</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Costo Total</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">$/Cbz</th>
                  <th className="px-2 py-2 text-right font-black text-[8px] uppercase tracking-wider text-amber-500" title="Bonificación Oculta = Costo / (Importe + Bonificación)">Bonif Oculta</th>
                </tr>
              </thead>
              <tbody>
                {[...m.acDetail]
                  .sort((a: any, b: any) => b.costoTotal - a.costoTotal)
                  .map((ac: any, idx: number) => {
                    const costoPorCbz = ac.cabezas > 0 ? ac.costoTotal / ac.cabezas : 0;
                    const tipoBadge = ac.tipo === 'Regional' || ac.tipo === 'City Manager' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : ac.tipo === 'Representante' 
                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                      : 'bg-violet-50 text-violet-600 border-violet-200';
                    return (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2 font-black text-[10px] text-slate-800 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-slate-400 bg-slate-100 rounded px-1">{ac.codigo}</span>
                            {ac.nombre}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${tipoBadge}`}>
                            {ac.tipo}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-[9px] font-bold text-slate-500 whitespace-nowrap">{ac.oficina || '—'}</td>
                        <td className="px-2 py-2 text-right font-black text-slate-800">{fmt.format(ac.cabezas)}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-600">{fmtCur.format(ac.sueldoBruto)}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-600">{fmtCur.format(ac.gastosMkt)}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-600">{fmtCur.format(ac.amortizacion)}</td>
                        <td className="px-2 py-2 text-right font-bold text-slate-600">{fmtCur.format(ac.movilidad)}</td>
                        <td className="px-2 py-2 text-right font-black text-rose-600">{fmtCur.format(ac.costoTotal)}</td>
                        <td className="px-2 py-2 text-right font-black text-slate-700">
                          {ac.cabezas > 0 ? fmtCur.format(costoPorCbz) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-2 py-2 text-right font-black text-amber-600">
                          {ac.importe > 0 ? fmtPct(ac.costoTotal / ac.importe) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                {/* Total row */}
                <tr className="bg-slate-100/60 font-black sticky bottom-0">
                  <td className="px-3 py-2 text-[10px] text-slate-700" colSpan={3}>TOTAL ({m.acDetail.length} ACs)</td>
                  <td className="px-2 py-2 text-right text-slate-800">{fmt.format(m.acDetail.reduce((s: number, a: any) => s + a.cabezas, 0))}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{fmtCur.format(m.acDetail.reduce((s: number, a: any) => s + a.sueldoBruto, 0))}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{fmtCur.format(m.acDetail.reduce((s: number, a: any) => s + a.gastosMkt, 0))}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{fmtCur.format(m.acDetail.reduce((s: number, a: any) => s + a.amortizacion, 0))}</td>
                  <td className="px-2 py-2 text-right text-slate-700">{fmtCur.format(m.acDetail.reduce((s: number, a: any) => s + a.movilidad, 0))}</td>
                  <td className="px-2 py-2 text-right text-rose-700">{fmtCur.format(costoRed)}</td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {totalCabezas > 0 ? fmtCur.format(costoRed / totalCabezas) : '—'}
                  </td>
                  <td className="px-2 py-2 text-right text-amber-700">
                    {(totalImporte + totalBonif) > 0 ? fmtPct(costoRed / (totalImporte + totalBonif)) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* YoY per channel (5/12) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📊 Variación Interanual (YoY) — {m.monthName}</span>
          </div>
          <div className="p-4 space-y-3">
            {CHANNELS.map(ch => {
              const curr = canales[ch]?.cabezas || 0;
              const prev = prevYearMonth?.canales?.[ch]?.cabezas || 0;
              const delta = prev > 0 ? ((curr - prev) / prev * 100) : (curr > 0 ? 100 : 0);
              const barPct = prev > 0 ? Math.min(Math.abs(delta), 100) : 0;
              return (
                <div key={ch} className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CH_COLORS[ch] }} />
                    <span className="text-[10px] font-black text-slate-700">{CH_LABELS[ch]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold text-slate-400">{fmt.format(prev)} → {fmt.format(curr)}</span>
                      <span className={`text-[10px] font-black ${delta >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${delta >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                        style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Total YoY */}
            <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
              <div className="w-24">
                <span className="text-[10px] font-black text-slate-800">TOTAL</span>
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400">{fmt.format(prevYearMonth?.cabezas || 0)} → {fmt.format(totalCabezas)}</span>
                <span className={`text-[11px] font-black ${(yoyGrowth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {yoyGrowth !== null ? `${yoyGrowth >= 0 ? '↑' : '↓'} ${Math.abs(yoyGrowth).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly listing (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📜 Listado Mensual</span>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-black text-[8px] uppercase tracking-widest text-slate-400">Período</th>
                  <th className="px-3 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Cabezas</th>
                  <th className="px-3 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Tropas</th>
                  <th className="px-3 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Importe</th>
                  <th className="px-3 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Resultado</th>
                  <th className="px-3 py-2 text-right font-black text-[8px] uppercase tracking-wider text-slate-400">Costo/Ing</th>
                  <th className="px-3 py-2 text-center font-black text-[8px] uppercase tracking-wider text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((pm: any) => (
                  <tr key={pm.anioMes}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${pm.anioMes === m.anioMes ? 'bg-teal-50/50' : ''}`}
                    onClick={() => onSelectMonth(pm)}
                  >
                    <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">
                      {pm.monthName?.substring(0, 3)} {pm.year}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-slate-800">{fmt.format(pm.cabezas)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-600">{fmt.format(pm.tropas)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-600">{fmtCur.format(pm.importe)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${pm.resultado >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {fmtCur.format(pm.resultado)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-500">{fmtPct(pm.ratioCosto)}</td>
                    <td className="px-3 py-2 text-center">
                      {pm.anioMes === m.anioMes && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ═══ METRICAS PLM ═══ */}
      {activeSubTab === 'plm' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-800">Métricas PLM / Share Regional</h2>
              <p className="text-xs text-slate-400 mt-0.5">Basado en cabezas del canal de Venta (Q95 Concretadas).</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Filter */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                {['2023', '2024', '2025', '2026', 'Todos'].map(y => (
                  <button
                    key={y}
                    onClick={() => setPlmYear(y)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer ${
                      plmYear === y ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* View Type Toggle */}
              <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                <button
                  onClick={() => setPlmViewType('percent')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer ${
                    plmViewType === 'percent' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                  }`}
                >
                  % Share
                </button>
                <button
                  onClick={() => setPlmViewType('cabezas')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer ${
                    plmViewType === 'cabezas' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                  }`}
                >
                  Cabezas
                </button>
                <button
                  onClick={() => setPlmViewType('rendimiento')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-all cursor-pointer ${
                    plmViewType === 'rendimiento' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                  }`}
                >
                  Rendimiento
                </button>
              </div>
            </div>
          </div>

          {/* Loading or Content */}
          {loadingPlm ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={36} className="animate-spin text-teal-500 mb-3" />
              <p className="text-sm font-bold">Procesando y agrupando datos Q95...</p>
            </div>
          ) : !plmData || !plmData.months ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-16 flex flex-col items-center justify-center text-slate-400">
              <AlertTriangle size={36} className="text-amber-500 mb-3" />
              <p className="text-sm font-bold">No se pudieron cargar los datos de PLM.</p>
            </div>
          ) : (() => {
            // Re-map filtered periods dynamically
            const filteredMonths = plmData.months.filter((m: any) => 
              plmYear === 'Todos' || String(m.year) === plmYear
            ).reverse(); // chronological

            const getUNColor = (un: string) => {
              if (un === 'Faena') return '#3b82f6';
              if (un === 'Invernada') return '#991b1b';
              if (un === 'Invernada Neo') return '#dc2626';
              if (un === 'Cria') return '#f59e0b';
              if (un === 'MAG') return '#10b981';
              return '#64748b';
            };

            const getUNBgClass = (un: string) => {
              if (un === 'Faena') return 'bg-blue-500';
              if (un === 'Invernada') return 'bg-red-900';
              if (un === 'Invernada Neo') return 'bg-red-600';
              if (un === 'Cria') return 'bg-amber-500';
              if (un === 'MAG') return 'bg-emerald-500';
              return 'bg-slate-500';
            };

            return (
              <div className="space-y-6">
                {/* PLM Table */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      📋 Matriz de {plmViewType === 'percent' ? 'Share Regional' : plmViewType === 'cabezas' ? 'Cabezas (Reg / Total)' : 'Rendimiento ($/cbz)'} por UN
                    </span>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {plmViewType === 'percent' ? 'Fórmula: Cabezas Regionales / Cabezas Totales' : 
                       plmViewType === 'cabezas' ? 'Fórmula: Cabezas Canal Venta = REGIONAL vs Total' :
                       'Fórmula: Resultado Final / Cabezas Regionales'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left font-black text-[9px] uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200">
                            Unidad de Negocio
                          </th>
                          {filteredMonths.map((m: any) => (
                            <th key={m.periodId} className="px-3 py-3 text-right font-black text-[9px] uppercase tracking-wider text-slate-400">
                              {plmYear === 'Todos' ? `${String(m.year).substring(2)}/${String(m.month).padStart(2, '0')}` : m.monthName.substring(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plmData.unList.map((un: string) => {
                          return (
                            <tr key={un} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-black text-[11px] text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] border-r border-slate-200 whitespace-nowrap">
                                <span className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${getUNBgClass(un)}`} />
                                  {un}
                                </span>
                              </td>
                              {filteredMonths.map((m: any) => {
                                const ud = m.unData[un] || { totalCabezas: 0, regionalCabezas: 0, resultadoFinal: 0 };
                                const share = ud.totalCabezas > 0 ? (ud.regionalCabezas / ud.totalCabezas) : 0;
                                const rend = ud.regionalCabezas > 0 ? (ud.resultadoFinal / ud.regionalCabezas) : 0;

                                return (
                                  <td key={m.periodId} className="px-3 py-3 text-right border-r border-slate-100/50">
                                    {plmViewType === 'percent' ? (
                                      <div>
                                        <span className="font-black text-slate-800">
                                          {(share * 100).toFixed(1)}%
                                        </span>
                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                          <div className={`h-full ${getUNBgClass(un)}`} style={{ width: `${share * 100}%` }} />
                                        </div>
                                      </div>
                                    ) : plmViewType === 'cabezas' ? (
                                      <div className="flex flex-col text-[10px]">
                                        <span className="font-extrabold text-teal-700">{fmtK(ud.regionalCabezas)}</span>
                                        <span className="font-bold text-slate-400 border-t border-slate-100 mt-0.5 pt-0.5">{fmtK(ud.totalCabezas)}</span>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-slate-700">
                                        {fmtCur.format(rend)}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PLM Trend Chart */}
                {(() => {
                  const chartData = filteredMonths.map((m: any) => {
                    const obj: any = { 
                      name: plmYear === 'Todos' ? `${String(m.year).substring(2)}/${String(m.month).padStart(2, '0')}` : m.monthName.substring(0, 3) 
                    };
                    plmData.unList.forEach((un: string) => {
                      const ud = m.unData[un] || { totalCabezas: 0, regionalCabezas: 0, resultadoFinal: 0 };
                      if (plmViewType === 'percent') {
                        obj[un] = ud.totalCabezas > 0 ? (ud.regionalCabezas / ud.totalCabezas) * 100 : 0;
                      } else if (plmViewType === 'cabezas') {
                        obj[un] = ud.regionalCabezas;
                      } else {
                        obj[un] = ud.regionalCabezas > 0 ? (ud.resultadoFinal / ud.regionalCabezas) : 0;
                      }
                    });
                    return obj;
                  });

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          📈 Evolución Histórica
                        </span>
                        <div className="flex items-center gap-2 text-[8px] font-extrabold uppercase text-slate-500">
                          {plmData.unList.map((un: string) => (
                            <span key={un} className="flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getUNColor(un) }} />
                              {un}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 min-h-[300px]">
                        <ResponsiveContainer width="100%" height={280}>
                          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: '800' }} />
                            <YAxis 
                              tickLine={false} 
                              axisLine={false} 
                              tick={{ fill: '#64748b', fontSize: 9, fontWeight: '700' }} 
                              tickFormatter={(val) => plmViewType === 'percent' ? `${val.toFixed(0)}%` : fmtK(val)} 
                            />
                            <Tooltip 
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload) return null;
                                return (
                                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-[10px]">
                                    <p className="font-black text-slate-800 mb-1">Período: {label}</p>
                                    {payload.map((p: any) => (
                                      <p key={p.name} className="font-bold" style={{ color: p.color }}>
                                        {p.name}: {plmViewType === 'percent' ? `${p.value.toFixed(1)}%` : plmViewType === 'cabezas' ? fmtK(p.value) : fmtCur.format(p.value)}
                                      </p>
                                    ))}
                                  </div>
                                );
                              }} 
                            />
                            {plmData.unList.map((un: string) => (
                              <Line 
                                key={un}
                                type="monotone" 
                                dataKey={un} 
                                stroke={getUNColor(un)} 
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: '#ffffff', stroke: getUNColor(un), strokeWidth: 2 }}
                                activeDot={{ r: 5 }}
                              />
                            ))}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
