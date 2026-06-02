import React, { useState, useEffect } from 'react';
import { Map as MapIcon, ArrowLeft, Database, ExternalLink, BarChart3, Calculator, FileText, RefreshCw, BookOpen, Layers, TrendingUp, Users, ChevronRight, Activity, Target, X, CheckCircle, AlertCircle, Package, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import MermaidChart from './MermaidChart';
import { diagramaCierres } from './mermaidConstants';
import SortableTable from './SortableTable';
import RedRegional from './RedRegional';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface HubProps {
  API_URL: string;
  setActiveTab: (tab: any) => void;
  activeYear: string;
  activeMonth: string;
}

export default function Hub({ API_URL, setActiveTab, activeYear, activeMonth }: HubProps) {
  const [data, setData] = useState({
    roster: [] as any[],
    cuentas: [] as any[],
    mendel: [] as any[],
    prices: {} as any
  });
  const [cierreData, setCierreData] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'cards' | 'data_sources' | 'red'>('cards');
  const [kpiModal, setKpiModal] = useState<{ title: string; items: any[]; columns: any[]; type?: 'grouped'; cardId?: string } | null>(null);
  const [historicoModal, setHistoricoModal] = useState<{ agente: string; history: any[] } | null>(null);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [redModal, setRedModal] = useState<{ months: any[]; yearTotals: Record<string, any> } | null>(null);
  const [selectedRedMonth, setSelectedRedMonth] = useState<any | null>(null);
  const [matrixCategory, setMatrixCategory] = useState<string>('OVERALL');
  const [dobleClickView, setDobleClickView] = useState<'diagram' | 'grid'>('diagram');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cuentasRes, rosterRes, mendelRes, pricesRes] = await Promise.all([
          fetch(`${API_URL}/cuentas`).catch(() => null),
          fetch(`${API_URL}/roster`).catch(() => null),
          fetch(`${API_URL}/mendel`).catch(() => null),
          fetch(`${API_URL}/kms-prices`).catch(() => null)
        ]);
        const cuentasData = cuentasRes && cuentasRes.ok ? await cuentasRes.json() : [];
        const rosterData = rosterRes && rosterRes.ok ? await rosterRes.json() : {};
        const mendelData = mendelRes && mendelRes.ok ? await mendelRes.json() : [];
        const pricesData = pricesRes && pricesRes.ok ? await pricesRes.json() : {};
        setData({
          cuentas: cuentasData,
          roster: Object.values(rosterData),
          mendel: mendelData,
          prices: pricesData
        });

        // Buscar snapshot del mes actual
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const snapName = `cierre_${y}_${m}.json`;
        const snapListRes = await fetch(`${API_URL}/snapshots`).catch(() => null);
        if (snapListRes && snapListRes.ok) {
          const snapFiles: string[] = await snapListRes.json();
          if (snapFiles.includes(snapName)) {
            const snapRes = await fetch(`${API_URL}/snapshots/${snapName}`).catch(() => null);
            if (snapRes && snapRes.ok) {
              setCierreData(await snapRes.json());
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, [API_URL]);

  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const activeRoster = data.roster.filter((r: any) => r.activo);
  const oficinas = [...new Set(activeRoster.map((r: any) => r.oficina).filter(Boolean))];

  // Cerrados vs sin cerrar
  const cerradosNames = new Set(cierreData.map((d: any) => d.asociadoComercial));
  const sinCerrar = activeRoster.filter((r: any) => !cerradosNames.has(r.nombre));
  const cerrados = activeRoster.filter((r: any) => cerradosNames.has(r.nombre));

  // ─── KPI MODAL ─────────────────────────────────────────────────────
const AcGroupAccordion: React.FC<{ acName: string; list: any[] }> = ({ acName, list }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30 mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">{acName}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 font-bold text-[9px]">
            {list.length} {list.length === 1 ? 'tropa' : 'tropas'}
          </span>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-3 border-t border-slate-100 bg-white overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-700">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] font-extrabold uppercase tracking-wider border-b border-slate-100">
                <th className="px-3 py-2">ID Lote</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Socidad Vendedora / Compradora</th>
                <th className="px-3 py-2 text-right">Cabezas</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Estado Tropa / Op</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((item: any, idx: number) => (
                <tr key={`${item.lote}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-slate-800">#{item.lote}</td>
                  <td className="px-3 py-2.5 text-slate-500">{item.fecha}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                      item.rol === 'Venta' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      {item.rol === 'Venta' ? 'Vendedor' : 'Comprador'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-800 font-semibold">{item.sociedad_vendedora}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">→ {item.sociedad_compradora}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{item.cantidad.toLocaleString('es-AR')}</td>
                  <td className="px-3 py-2.5 text-slate-500">{item.categoria}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-rose-600 font-bold uppercase text-[9px]">{item.estado_tropa}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">{item.estado_operacion}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

  const renderKpiModal = () => {
    return null; // Inline expansion is used instead
  };

  // Handlers para abrir modal de cada KPI
  const openAgentes = () => setKpiModal({
    title: 'Agentes Activos',
    items: activeRoster.map((r: any) => ({ nombre: r.nombre, email: r.email, oficina: r.oficina, categoria: r.categoria, modelo: r.modelo || 'Simple' })),
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'oficina', label: 'Oficina' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'modelo', label: 'Modelo' },
    ]
  });

  const openOficinas = () => setKpiModal({
    title: 'Oficinas',
    items: oficinas.map(of => {
      const agentesOf = activeRoster.filter((r: any) => r.oficina === of);
      return { oficina: of, agentes: agentesOf.length, nombres: agentesOf.map((r: any) => r.nombre).join(', ') };
    }),
    columns: [
      { key: 'oficina', label: 'Oficina' },
      { key: 'agentes', label: 'Agentes' },
      { key: 'nombres', label: 'Integrantes' },
    ]
  });

  const openCuentas = () => setKpiModal({
    title: 'Cuentas Especiales',
    items: data.cuentas.map((c: any) => ({ agente: c.agente, tipo: c.tipo_cuenta, razon_social: c.razon_social, cuit: c.cuit, porcentaje: c.porcentaje })),
    columns: [
      { key: 'agente', label: 'Agente' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'razon_social', label: 'Razón Social' },
      { key: 'cuit', label: 'CUIT' },
    ]
  });

  const openMendel = () => setKpiModal({
    title: 'Gastos Mendel',
    items: data.mendel.map((m: any) => ({ comercial: m.comercial || m.nombre, monto: m.monto || m.total, concepto: m.concepto || m.categoria || '-' })),
    columns: [
      { key: 'comercial', label: 'Comercial' },
      { key: 'concepto', label: 'Concepto' },
      { key: 'monto', label: 'Monto' },
    ]
  });

  // Lookup roster por nombre para cruzar datos (auto, etc.)
  const rosterByName = new Map(activeRoster.map((r: any) => [r.nombre?.toLowerCase(), r]));

  const openCerrados = () => setKpiModal({
    title: 'Cierre del Mes \u2014 Cerrados',
    items: cierreData.map((d: any) => {
      const rosterAgent = rosterByName.get(d.asociadoComercial?.toLowerCase());
      // Roster: auto="Si" → externo (propio), auto="No" → DCAC
      const autoRoster = String(rosterAgent?.auto || '').trim().toLowerCase();
      const esDcac = autoRoster === 'no' || autoRoster === '';
      return {
        nombre: d.asociadoComercial,
        tropasGeneral: d.tropasGeneral || 0,
        cabezasGeneral: d.cabezasGeneral || 0,
        cierreReal: d.cierreReal || 0,
        componenteP: d.componenteP || 0,
        componenteR: d.componenteR || 0,
        componenteO: d.componenteO || 0,
        ajustes: d.ajustes || 0,
        minimo: (d.componenteP || 0) < (d.minimo || 0) ? 'SI' : 'NO',
        kms: d.kms || 0,
        autoDcac: esDcac ? 'DCAC' : 'Externo',
        sueldo: d.sueldoBruto || d.resultado || 0,
      };
    }),
    columns: [
      { key: 'nombre', label: 'Asociado Comercial' },
      { key: 'tropasGeneral', label: 'Tropas' },
      { key: 'cabezasGeneral', label: 'Cabezas' },
      { key: 'cierreReal', label: 'Resultado Cierre' },
      { key: 'componenteP', label: 'Comp. P' },
      { key: 'componenteR', label: 'Comp. R' },
      { key: 'componenteO', label: 'Comp. O' },
      { key: 'ajustes', label: 'Ajuste' },
      { key: 'minimo', label: 'Mínimo' },
      { key: 'kms', label: 'KMS' },
      { key: 'autoDcac', label: 'Auto' },
      { key: 'sueldo', label: 'Sueldo' },
    ]
  });

  const openSinCerrar = () => setKpiModal({
    title: 'Sin Cerrar este Mes',
    items: sinCerrar.map((r: any) => ({ nombre: r.nombre, email: r.email, oficina: r.oficina, categoria: r.categoria, modelo: r.modelo || 'Simple' })),
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'oficina', label: 'Oficina' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'modelo', label: 'Modelo' },
    ]
  });

  const openTajada = () => {
    // Agrupar por oficina y calcular % tajada real
    const byOficina: Record<string, { totalSoc: number; agentes: any[] }> = {};
    cierreData.forEach((d: any) => {
      const ofi = d.oficina || d.provincia || 'Sin Oficina';
      if (!byOficina[ofi]) byOficina[ofi] = { totalSoc: 0, agentes: [] };
      byOficina[ofi].agentes.push(d);
      byOficina[ofi].totalSoc += (d.socOpGen || 0);
    });
    const items = cierreData.map((d: any) => {
      const ofi = d.oficina || d.provincia || 'Sin Oficina';
      const pool = byOficina[ofi];
      const pct = pool.totalSoc > 0 ? (d.socOpGen || 0) / pool.totalSoc * 100 : 0;
      return {
        nombre: d.asociadoComercial,
        oficina: d.oficina || '--',
        provincia: d.provincia || '--',
        socAgente: d.socOpGen || 0,
        socOficina: pool.totalSoc,
        porcentaje: Math.round(pct * 10) / 10,
        tajada: d.tajadaRegion || 0,
        bolsa: d.bolsaRegion || 0,
      };
    });
    setKpiModal({
      title: 'Tajada Regional — Sociedades Operadas',
      items,
      columns: [
        { key: 'nombre', label: 'Comercial' },
        { key: 'oficina', label: 'Oficina' },
        { key: 'provincia', label: 'Provincia' },
        { key: 'socAgente', label: 'Soc. Agente', render: (v: number) => (v || 0).toLocaleString('es-AR'), align: 'center' },
        { key: 'socOficina', label: 'Soc. Oficina', render: (v: number) => (v || 0).toLocaleString('es-AR'), align: 'center' },
        { key: 'porcentaje', label: '% Real', render: (v: number) => `${v || 0}%`, align: 'right' },
        { key: 'tajada', label: '% Tajada Asignada', render: (v: number) => `${((v || 0) * 100).toFixed(1)}%`, align: 'right' },
        { key: 'bolsa', label: '% Bolsa Reg.', render: (v: number) => `${((v || 0) * 100).toFixed(1)}%`, align: 'right' },
      ]
    });
  };

  const openAjustes = () => {
    const items = cierreData.map((d: any) => ({
      nombre: d.asociadoComercial,
      ajustes: d.ajustes || 0,
      reintegro: d.reintegroMovilidad || 0,
      kms: d.kms || 0,
      amortDcac: d.amortizacioneDcac || 0,
      gastosMkt: d.gastosMkt || 0,
      componenteP: d.componenteP || 0,
      componenteR: d.componenteR || 0,
      componenteO: d.componenteO || 0,
      minimo: d.minimo || 0,
      sueldo: d.sueldoBruto || d.resultado || 0,
      cierreReal: d.cierreReal || 0,
    }));
    setKpiModal({
      title: 'Ajustes y Rendiciones — Detalle por Comercial',
      items,
      columns: [
        { key: 'nombre', label: 'Comercial' },
        { key: 'ajustes', label: 'Ajuste Retro' },
        { key: 'reintegro', label: 'Reintegro KMS' },
        { key: 'kms', label: 'KMS' },
        { key: 'amortDcac', label: 'Amort. DCAC' },
        { key: 'gastosMkt', label: 'Gastos Mendel' },
        { key: 'componenteP', label: 'Comp. P' },
        { key: 'componenteR', label: 'Comp. R' },
        { key: 'componenteO', label: 'Comp. O' },
        { key: 'minimo', label: 'Mínimo' },
        { key: 'sueldo', label: 'Sueldo' },
        { key: 'cierreReal', label: 'Cierre Real' },
      ]
    });
  };

  // ─── DATA SOURCES VIEW ─────────────────────────────────────────────
  if (activeView === 'data_sources') {
    return (
      <div className="max-w-7xl mx-auto pb-24 mt-8 px-4">
        <button
          onClick={() => setActiveView('cards')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Volver al Hub Principal
        </button>

        <div className="flex flex-col gap-8">
          {/* Encabezado */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Database size={24} className="text-blue-500" />
              Origen de Datos y Flujo de Cierre
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Mapa técnico del motor de comisiones de De Campo a Campo. Entendé con precisión de dónde sale cada variable y cómo se procesa el cierre de asociados comerciales.
            </p>
          </div>

          {/* Mapa de Conexiones */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <MapIcon size={14} /> MAPA DE CONEXIONES Y FLUJO GENERAL
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Diagrama visual del pipeline completo de cierres regionales.</p>
              </div>
            </div>

            {/* Etapas del Cierre */}
            <div className="mb-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { n: '1', label: 'Origen', desc: 'Q95 + Roster' },
                  { n: '2', label: 'Topeo', desc: 'Rend. FAE/INV' },
                  { n: '3', label: 'Reparto', desc: '66% Vta / 33% Cpa' },
                  { n: '4', label: 'Componentes', desc: 'P + R + O' },
                  { n: '5', label: 'Mínimo', desc: 'Regla de Oro' },
                  { n: '6', label: 'Gastos', desc: 'KMS / DCAC / Mendel' },
                  { n: '7', label: 'Ajustes', desc: 'Retro mes anterior' },
                  { n: '8', label: 'Cierre', desc: 'Bruto + Ajustes' },
                ].map((s, i, arr) => (
                  <div key={s.n} className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] font-extrabold flex items-center justify-center">{s.n}</span>
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-700 leading-none">{s.label}</p>
                        <p className="text-[8px] text-slate-400 leading-none mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                    {i < arr.length - 1 && <span className="text-slate-300 text-xs">{'\u2192'}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* El Mapa Mermaid */}
            <div className="relative w-full overflow-x-auto mb-4 rounded-[2rem] border border-slate-100 shadow-sm bg-white">
              <div className="min-w-[900px] relative bg-[#fcfcfc] flex items-center justify-center p-6">
                <MermaidChart chart={diagramaCierres} />
              </div>
            </div>

            {/* Glosario de Formas */}
            <div className="mb-8 rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Glosario de Formas y Colores</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-7 h-5 rounded-[3px] border-2 border-slate-400 bg-[#e2e8f0] flex-shrink-0" style={{borderRadius:'40%/50%'}} />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Cilindro</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Fuente de datos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-7 h-5 rounded-[3px] border-2 border-blue-400 bg-[#dbeafe] flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Rectángulo</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Proceso o cálculo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-[#fef3c7] flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Círculo</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Variable intermedia</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-5 h-5 border-2 border-pink-400 bg-[#fce7f3] flex-shrink-0 rotate-45 rounded-[2px]" />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Diamante</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Regla de negocio</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-7 h-5 rounded-[3px] border-2 border-indigo-400 bg-[#e0e7ff] flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Azul Índigo</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Componente (P, R, O)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  <div className="w-7 h-5 rounded-[3px] border-2 border-green-400 bg-[#dcfce3] flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-700 leading-tight">Verde</p>
                    <p className="text-[9px] text-slate-400 leading-tight">Resultado final</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0 border-t-2 border-slate-400" />
                  <span className="text-[9px] font-bold text-slate-400">Línea sólida = flujo principal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0 border-t-2 border-dashed border-slate-400" />
                  <span className="text-[9px] font-bold text-slate-400">Línea punteada = dato de referencia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 rounded-[2px] border-2 border-red-400 bg-[#fee2e2] flex-shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400">Rojo = penalización o pérdida</span>
                </div>
              </div>
            </div>

            {/* Glosario de Variables - Tablas */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Glosario de Variables del Motor</p>
              </div>

              {[
                {
                  title: 'Inputs y Fuentes (Google Sheets)', color: 'bg-slate-400', codeColor: 'text-blue-700 bg-blue-50',
                  items: [
                    { v: 'Q95 Metabase', d: 'Operaciones reales: lotes, CUITs, cabezas, P&L brutos', f: 'Metabase / Q95', link: 'https://metabase.dcac.ar' },
                    { v: 'Roster', d: 'Email, fijos, auto, categoría, modalidad, oficina', f: 'HUB_CONFIG (Roster)', link: 'https://docs.google.com/spreadsheets/d/1dl7NXNS_AvE8vp-bHDtriJXsvYT5H3ViwWwtrg4sg6s' },
                    { v: 'Config_Tajada', d: 'Sociedades operadas por comercial y oficina', f: 'HUB_CONFIG (Config_Tajada)', link: 'https://docs.google.com/spreadsheets/d/1dl7NXNS_AvE8vp-bHDtriJXsvYT5H3ViwWwtrg4sg6s' },
                    { v: 'Config_Minimos', d: 'Sueldo mínimo garantizado por categoría y periodo', f: 'HUB_CONFIG (Config_Minimos)', link: 'https://docs.google.com/spreadsheets/d/1dl7NXNS_AvE8vp-bHDtriJXsvYT5H3ViwWwtrg4sg6s' },
                    { v: 'Config_Escalas', d: 'Escalas (Simple/Completa): min%, max%, topeCabezas', f: 'HUB_CONFIG (Config_Escalas)', link: 'https://docs.google.com/spreadsheets/d/1dl7NXNS_AvE8vp-bHDtriJXsvYT5H3ViwWwtrg4sg6s' },
                    { v: 'KMS', d: 'Kilómetros empresa vs total, patente, tipo vehículo', f: 'HUB_GASTOS (KMS)', link: 'https://docs.google.com/spreadsheets/d/10ZB4qLc4pioGrp6I8fEBlGLZ9Yv8ZS2B3vWsMlyKrf0' },
                    { v: 'Kms & $', d: 'Precio por KM según tipo de vehículo', f: 'HUB_GASTOS (Kms & $)', link: 'https://docs.google.com/spreadsheets/d/10ZB4qLc4pioGrp6I8fEBlGLZ9Yv8ZS2B3vWsMlyKrf0' },
                    { v: 'Amort_DCAC', d: 'Amortización de autos DCAC por año modelo', f: 'HUB_GASTOS (Amort_DCAC)', link: 'https://docs.google.com/spreadsheets/d/10ZB4qLc4pioGrp6I8fEBlGLZ9Yv8ZS2B3vWsMlyKrf0' },
                    { v: 'Config_Mendel', d: 'Gastos Mendel agrupados por periodo y comercial', f: 'HUB_GASTOS (Config_Mendel)', link: 'https://docs.google.com/spreadsheets/d/10ZB4qLc4pioGrp6I8fEBlGLZ9Yv8ZS2B3vWsMlyKrf0' },
                    { v: 'Ajustes', d: 'Ajustes manuales retroactivos con motivo y monto', f: 'HUB_CONFIG (Ajustes_Retroactivos)', link: 'https://docs.google.com/spreadsheets/d/1dl7NXNS_AvE8vp-bHDtriJXsvYT5H3ViwWwtrg4sg6s' },
                  ]
                },
                {
                  title: 'KPIs y Cálculos Intermedios', color: 'bg-blue-500', codeColor: 'text-blue-700 bg-blue-50',
                  items: [
                    { v: 'tropasGeneral', d: 'Cantidad de operaciones (lotes) del comercial', f: 'types.ts:19', link: 'https://github.com' },
                    { v: 'cabezasGeneral', d: 'Total de cabezas operadas (general)', f: 'types.ts:20', link: 'https://github.com' },
                    { v: 'rendimientoGen', d: 'Rendimiento promedio ponderado', f: 'types.ts:72', link: 'https://github.com' },
                    { v: 'resultado_final', d: 'P&L antes de topear', f: 'types.ts:24', link: 'https://github.com' },
                    { v: 'resultado_final_ajustado', d: 'Resultado después de topes FAE/INV', f: 'types.ts:25', link: 'https://github.com' },
                    { v: 'socOpGen', d: 'Sociedades operadas (para %Tajada)', f: 'types.ts:74', link: 'https://github.com' },
                    { v: 'cccGen', d: 'CCC General acumulado', f: 'types.ts:73', link: 'https://github.com' },
                  ]
                },
                {
                  title: 'Componentes del Sueldo', color: 'bg-indigo-500', codeColor: 'text-indigo-700 bg-indigo-50',
                  items: [
                    { v: 'escalaGen (%Bolsa)', d: 'Escala logarítmica según cabezas: Simple o Completa', f: 'calculator.ts:93', link: 'https://github.com' },
                    { v: 'componenteP', d: 'Resultado ajustado \u00d7 escalaGen', f: 'types.ts:29', link: 'https://github.com' },
                    { v: 'tajadaRegion', d: '% según sociedades operadas vs total oficina', f: 'types.ts:50', link: 'https://github.com' },
                    { v: 'bolsaRegion', d: 'Escala provincial según cabezas regionales', f: 'types.ts:49', link: 'https://github.com' },
                    { v: 'componenteR', d: 'Tajada \u00d7 Bolsa Provincial \u00d7 Resultado Regional', f: 'types.ts:51', link: 'https://github.com' },
                    { v: 'escalaOficina', d: '1/N agentes de la oficina \u00d7 escala oficina', f: 'types.ts:60', link: 'https://github.com' },
                    { v: 'componenteO', d: 'EscalaOficina \u00d7 Resultado Oficina', f: 'types.ts:62', link: 'https://github.com' },
                    { v: 'minimo', d: 'Mínimo garantizado según categoría', f: 'calculator.ts:84', link: 'https://github.com' },
                    { v: 'variable_personal', d: 'Comp.P - Mínimo (si lo supera)', f: 'types.ts:88', link: 'https://github.com' },
                  ]
                },
                {
                  title: 'Gastos y Resultado Final', color: 'bg-green-500', codeColor: 'text-green-700 bg-green-50',
                  items: [
                    { v: 'fijo', d: 'Sueldo fijo mensual del roster', f: 'types.ts:87', link: 'https://github.com' },
                    { v: 'sueldoBruto', d: 'Fijo + Variable + Comp.R + Comp.O', f: 'types.ts:89', link: 'https://github.com' },
                    { v: 'auto', d: 'Tipo de auto: DCAC (empresa) o propio', f: 'types.ts:78', link: 'https://github.com' },
                    { v: 'kms', d: 'Kilómetros de empresa en el mes', f: 'types.ts:77', link: 'https://github.com' },
                    { v: 'precioPorKm', d: 'Precio por KM según tipo de vehículo', f: 'types.ts:79', link: 'https://github.com' },
                    { v: 'reintegroMovilidad', d: 'KMS \u00d7 $/KM (solo auto propio)', f: 'types.ts:80', link: 'https://github.com' },
                    { v: 'gastosMovilidad', d: 'Gastos Mendel de movilidad a descontar', f: 'types.ts:76', link: 'https://github.com' },
                    { v: 'amortizacioneDcac', d: 'Amortización auto DCAC', f: 'types.ts:83', link: 'https://github.com' },
                    { v: 'ajustes', d: 'Ajustes retroactivos: diff dinámico vs congelado', f: 'types.ts:65', link: 'https://github.com' },
                    { v: 'cierreReal', d: 'Sueldo + Reintegro - Mendel + Ajustes', f: 'types.ts:92', link: 'https://github.com' },
                  ]
                },
              ].map(section => (
                <div key={section.title} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${section.color}`} />
                    <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">{section.title}</p>
                  </div>
                  <SortableTable
                    columns={[
                      { key: 'v', label: 'Variable', render: (val: string) => <code className={`text-[9px] font-bold ${section.codeColor} px-1.5 py-0.5 rounded`}>{val}</code> },
                      { key: 'd', label: 'Descripción' },
                      { key: 'f', label: 'Archivo' },
                      { key: 'link', label: 'Link', align: 'center', render: (val: string, row: any) => (
                        <a href={val} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
                          title={`Abrir ${row.f}`}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )},
                    ]}
                    data={section.items}
                    size="compact"
                  />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ─── CARDS PRINCIPAL (HUB DASHBOARD) ───────────────────────────────
  const cards = [
    {
      id: 'kpis',
      title: 'KPIs',
      desc: 'Indicadores clave de la red comercial: tropas, cabezas, resultado y rendimiento por AC.',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      badge: `${activeRoster.length} agentes`,
      badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/15',
      action: () => setActiveTab('variables'),
    },
    {
      id: 'red',
      title: 'Métricas Red Regional',
      desc: 'Cabezas, tropas e importe reales de la red, sin duplicar operaciones con dos comerciales.',
      icon: TrendingUp,
      color: 'from-teal-500 to-cyan-600',
      badge: 'RED REAL',
      badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-500/15',
      action: async () => {
        setLoadingCardId('red');
        try {
          setActiveView('red');
          const res = await fetch(`${API_URL}/metricas-red?year=${activeYear}&month=${activeMonth}`);
          if (res.ok) {
            const data = await res.json();
            setRedModal(data);
            // Auto-seleccionar el mes que coincide con el filtro principal
            const targetYear = parseInt(activeYear);
            const targetMonth = parseInt(activeMonth);
            const match = (data.months || []).find((m: any) => m.year === targetYear && m.month === targetMonth);
            setSelectedRedMonth(match || (data.months && data.months[0]) || null);
          }
        } catch (e) { console.error(e); } finally { setLoadingCardId(null); }
      },
    },
    {
      id: 'simulador',
      title: 'Simulador',
      desc: 'Simulá escenarios de cierre en vivo: modificá escalas, cabezas y resultados para proyectar comisiones.',
      icon: Calculator,
      color: 'from-amber-500 to-orange-500',
      badge: 'INTERACTIVO',
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/15',
      action: () => setActiveTab('simulador'),
    },
    {
      id: 'cierres',
      title: 'Cierres',
      desc: 'Liquidación de comisiones: componentes P, R y O, mínimo garantizado y cierre real.',
      icon: FileText,
      color: 'from-violet-500 to-purple-600',
      badge: 'LIQUIDACIÓN',
      badgeColor: 'bg-violet-500/10 text-violet-600 border-violet-500/15',
      action: () => setActiveTab('cierre'),
    },
    {
      id: 'revision',
      title: 'Revisión vs GSheets',
      desc: 'Validador cruzado: compará los datos calculados por el motor contra la planilla oficial en Google Sheets.',
      icon: RefreshCw,
      color: 'from-purple-500 to-pink-600',
      badge: 'VALIDADOR',
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
      action: () => setActiveTab('comparador'),
    },
    {
      id: 'revision-sociedad',
      title: 'Sociedad Sin Legajo',
      desc: 'Lotes donde el AC se resolvió por Sociedad pero la celda AC_Vend o AC_Comp en la tropa está vacía.',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      badge: 'REVISAR AC',
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/15',
      action: async () => {
        setLoadingCardId('revision-sociedad');
        try {
          const res = await fetch(`${API_URL}/revision/sociedad-sin-legajo?year=${activeYear}&month=${activeMonth}`);
          if (res.ok) {
            const data = await res.json();
            setKpiModal({
              title: 'Negocios por Sociedad (Sin Legajo en Tropa)',
              items: data,
              cardId: 'revision-sociedad',
              columns: [
                { key: 'lote', label: 'ID Lote' },
                { key: 'fecha', label: 'Fecha' },
                { key: 'sociedad_vendedora', label: 'Soc. Vendedora' },
                { key: 'sociedad_compradora', label: 'Soc. Compradora' },
                { key: 'cantidad', label: 'Cabezas', render: (v: number) => (v || 0).toLocaleString('es-AR'), align: 'center' },
                { key: 'categoria', label: 'Categoría' },
                { 
                  key: 'ac_negocio_venta', 
                  label: 'Venta (Negocio vs Sociedad)', 
                  render: (val: any, row: any) => (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">Negocio:</span>
                        <span className="font-semibold text-slate-800">{row.ac_negocio_venta}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-violet-50 rounded text-violet-600 font-bold uppercase">Soc. Raw:</span>
                        <span className="font-semibold text-slate-600">{row.ac_sociedad_venta_raw}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-indigo-50 rounded text-indigo-600 font-bold uppercase">Soc. OK:</span>
                        <span className="font-semibold text-indigo-700">{row.ac_sociedad_venta_resuelta}</span>
                      </div>
                      {row.reasignar_venta && (
                        <div className="mt-1">
                          {row.reasignar_venta_valido ? (
                            <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded">
                              ✓ Válido Reasignar ({row.ac_vendedor_tipo})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-bold rounded" title={row.reasignar_venta_motivo}>
                              ⚠ No Reasignar ({row.ac_vendedor_tipo === 'Corporate' ? 'Corporativo' : 'Inactivo'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) 
                },
                { 
                  key: 'ac_negocio_compra', 
                  label: 'Compra (Negocio vs Sociedad)', 
                  render: (val: any, row: any) => (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-slate-100 rounded text-slate-500 font-bold uppercase">Negocio:</span>
                        <span className="font-semibold text-slate-800">{row.ac_negocio_compra}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-violet-50 rounded text-violet-600 font-bold uppercase">Soc. Raw:</span>
                        <span className="font-semibold text-slate-600">{row.ac_sociedad_compra_raw}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-indigo-50 rounded text-indigo-600 font-bold uppercase">Soc. OK:</span>
                        <span className="font-semibold text-indigo-700">{row.ac_sociedad_compra_resuelta}</span>
                      </div>
                      {row.reasignar_compra && (
                        <div className="mt-1">
                          {row.reasignar_compra_valido ? (
                            <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded">
                              ✓ Válido Reasignar ({row.ac_comprador_tipo})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-bold rounded" title={row.reasignar_compra_motivo}>
                              ⚠ No Reasignar ({row.ac_comprador_tipo === 'Corporate' ? 'Corporativo' : 'Inactivo'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) 
                },
              ]
            });
          }
        } catch (e) { console.error(e); } finally { setLoadingCardId(null); }
      },
    },
    {
      id: 'concretadas-sin-cierre',
      title: 'Concretadas Sin Cierre',
      desc: 'Tropas marcadas como Concretadas pero que están en estados no contemplados para el pago de comisiones.',
      icon: AlertCircle,
      color: 'from-rose-500 to-red-600',
      badge: 'ESTADO ALERTA',
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
      action: async () => {
        setLoadingCardId('concretadas-sin-cierre');
        try {
          const res = await fetch(`${API_URL}/revision/concretadas-sin-cierre?year=${activeYear}&month=${activeMonth}`);
          if (res.ok) {
            const data = await res.json();
            setKpiModal({
              title: 'Tropas Concretadas Fuera de Cierre',
              type: 'grouped',
              items: data,
              columns: [],
              cardId: 'concretadas-sin-cierre'
            });
          }
        } catch (e) { console.error(e); } finally { setLoadingCardId(null); }
      },
    },
    {
      id: 'reportes',
      title: 'Reportes',
      desc: 'Consolidado general de la red: resumen por oficina, provincia y tipo de modelo.',
      icon: BarChart3,
      color: 'from-emerald-500 to-green-600',
      badge: 'CONSOLIDADO',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
      action: () => setActiveTab('resumen'),
    },
    {
      id: 'envios',
      title: 'Envíos de Cierres',
      desc: 'Generá PDFs, guardá en Drive y enviá por mail a cada comercial de la red.',
      icon: Mail,
      color: 'from-blue-600 to-indigo-600',
      badge: 'MAILING',
      badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/15',
      action: () => setActiveTab('envios'),
    },
    {
      id: 'historico',
      title: 'Histórico Comercial',
      desc: 'Consultá el historial de cierres de cada comercial con link directo al PDF enviado en Google Drive.',
      icon: Layers,
      color: 'from-indigo-500 to-purple-600',
      badge: 'HISTORIAL',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/15',
      action: () => setHistoricoModal({ agente: '', history: [] }),
    },
    {
      id: 'mapa',
      title: 'Mapa de Conexiones y Flujo General',
      desc: 'Diagrama visual del pipeline de cierres con glosario de variables del motor.',
      icon: Database,
      color: 'from-sky-500 to-blue-600',
      badge: 'MAPA GENERAL',
      badgeColor: 'bg-sky-500/10 text-sky-600 border-sky-500/15',
      action: () => setActiveView('data_sources'),
    },
    {
      id: 'manual',
      title: 'Manual Cierres',
      desc: 'Guía completa de modelos de liquidación: Simple, Completo, Híbrido y reglas de negocio.',
      icon: BookOpen,
      color: 'from-slate-600 to-slate-800',
      badge: 'DOCUMENTACIÓN',
      badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/15',
      action: () => window.open('/docs/Manual_Ejecutivo_Comercial.pdf', '_blank'),
    },
  ];

  const fetchHistorico = async (agente: string) => {
    if (!agente) return;
    setHistoricoLoading(true);
    try {
      const res = await fetch(`${API_URL}/historico/${encodeURIComponent(agente)}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricoModal({ agente: data.agente, history: data.history });
      }
    } catch (e) { console.error(e); }
    setHistoricoLoading(false);
  };

  const renderHistoricoModal = () => {
    if (!historicoModal) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHistoricoModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
            <h3 className="text-lg font-bold text-white">📊 Histórico Comercial</h3>
            <button onClick={() => setHistoricoModal(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
          </div>
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Seleccionar Comercial</label>
            <select
              value={historicoModal.agente}
              onChange={e => { const v = e.target.value; setHistoricoModal(prev => prev ? {...prev, agente: v} : null); fetchHistorico(v); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            >
              <option value="">-- Elegí un comercial --</option>
              {activeRoster.sort((a: any, b: any) => a.nombre.localeCompare(b.nombre)).map((r: any) => (
                <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-auto px-6 py-4">
            {historicoLoading && <div className="text-center py-12 text-slate-400 font-semibold">Cargando historial...</div>}
            {!historicoLoading && historicoModal.agente && historicoModal.history.length === 0 && (
              <div className="text-center py-12 text-slate-400">Sin datos históricos para este comercial.</div>
            )}
            {!historicoLoading && historicoModal.history.length > 0 && (
              <SortableTable
                data={historicoModal.history}
                columns={[
                  { key: 'monthName', label: 'Mes' },
                  { key: 'year', label: 'Año' },
                  { key: 'tropas', label: 'Tropas' },
                  { key: 'cabezas', label: 'Cabezas' },
                  { key: 'compP', label: 'Comp. P' },
                  { key: 'resultado', label: 'Resultado' },
                  { key: 'sueldo', label: 'Sueldo' },
                  { key: 'cierreReal', label: 'Cierre Real' },
                  { key: 'minimo', label: 'Mínimo' },
                ]}
                currencyKeys={['compP', 'resultado', 'sueldo', 'cierreReal', 'minimo']}
                rawNumberKeys={['year', 'tropas', 'cabezas']}
                renderActions={(row: any) => row.driveLink ? (
                  <a href={row.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors" title="Abrir PDF en Drive">
                    <ExternalLink size={12} /> PDF
                  </a>
                ) : <span className="text-slate-300 text-xs">—</span>}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Si estamos en la vista Red, renderizar página completa ---
  if (activeView === 'red') {
    if (!redModal) {
      return (
        <div className="max-w-[98%] 2xl:max-w-[1800px] mx-auto pb-24 mt-8 px-4">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setActiveView('cards')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Métricas Red Regional</h1>
          </div>
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <RefreshCw size={40} className="animate-spin text-teal-500 mb-4" />
            <p className="text-sm font-bold">Cargando datos del Q95...</p>
            <p className="text-xs mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      );
    }
    return (
      <RedRegional
        data={redModal}
        selectedMonth={selectedRedMonth}
        onSelectMonth={setSelectedRedMonth}
        onBack={() => { setActiveView('cards'); setRedModal(null); }}
        activeYear={activeYear}
        activeMonth={activeMonth}
      />
    );
  }



  return (
    <div className="max-w-[98%] 2xl:max-w-[1800px] mx-auto pb-24 mt-8 px-4">
      {renderKpiModal()}
      {renderHistoricoModal()}

      {/* Header del Hub */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hub Principal</h1>
        <p className="text-sm text-slate-500 mt-1">Centro de control del motor de cierres regionales.</p>
      </div>

      {/* KPI Rápidos - Clickeables — siempre 1 fila en desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 lg:gap-3 mb-8">
        {[
          { label: 'Agentes Activos', value: activeRoster.length, icon: Users, color: 'text-blue-600 bg-blue-50', onClick: openAgentes },
          { label: 'Oficinas', value: oficinas.length, icon: Target, color: 'text-violet-600 bg-violet-50', onClick: openOficinas },
          { label: 'Cuentas', value: data.cuentas.length, icon: Database, color: 'text-emerald-600 bg-emerald-50', onClick: openCuentas },
          { label: 'Mendel', value: data.mendel.length, icon: Activity, color: 'text-amber-600 bg-amber-50', onClick: openMendel },
          { label: cierreData.length > 0
              ? `Cerrados ${cerrados.length}/${activeRoster.length}`
              : 'Sin Snapshot',
            value: cierreData.length > 0 ? sinCerrar.length : '-',
            icon: cierreData.length > 0 && sinCerrar.length === 0 ? CheckCircle : AlertCircle,
            color: cierreData.length > 0
              ? (sinCerrar.length === 0 ? 'text-green-600 bg-green-50' : 'text-rose-600 bg-rose-50')
              : 'text-slate-400 bg-slate-50',
            onClick: cierreData.length > 0 ? (sinCerrar.length > 0 ? openSinCerrar : openCerrados) : undefined,
            subtitle: cierreData.length > 0
              ? (sinCerrar.length === 0 ? 'Todos cerrados' : 'Sin Cerrar')
              : 'Calculá primero'
          },
          { label: 'Tajada', value: 'Ver Tabla', icon: Package, color: 'text-teal-600 bg-teal-50', onClick: openTajada, subtitle: 'Soc. operadas' },
          { label: 'Ajustes Retro', value: cierreData.length > 0 ? fmt.format(cierreData.reduce((s: number, d: any) => s + (d.ajustes || 0), 0)) : '--', icon: TrendingUp, color: 'text-orange-600 bg-orange-50', onClick: openAjustes, subtitle: 'Retroactivos' },
        ].map(kpi => (
          <div
            key={kpi.label}
            onClick={kpi.onClick}
            className={`bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-3 border border-slate-200/60 shadow-sm transition-all duration-200 min-w-0 ${kpi.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]' : ''}`}
          >
            <div className="flex items-center justify-between mb-1 lg:mb-2">
              <div className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl ${kpi.color}`}>
                {React.createElement(kpi.icon, { size: 14 })}
              </div>
              {kpi.onClick && <ChevronRight size={10} className="text-slate-300 shrink-0" />}
            </div>
            <p className="text-lg lg:text-2xl font-black text-slate-800 leading-tight truncate">{kpi.value}</p>
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate leading-tight">{(kpi as any).subtitle || kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Panel Detalle de KPI Rápidos Inline */}
      {kpiModal && !kpiModal.cardId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-5 mb-8 animate-fadeIn relative">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">{kpiModal.title}</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{kpiModal.items.length} registros</p>
            </div>
            <button 
              onClick={() => setKpiModal(null)} 
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <SortableTable columns={kpiModal.columns} data={kpiModal.items} fmt={fmt} />
          </div>
        </div>
      )}

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map(card => {
          const isActive = kpiModal && kpiModal.cardId === card.id;
          return (
            <React.Fragment key={card.id}>
              <div
                onClick={() => {
                  if (isActive) {
                    setKpiModal(null);
                  } else {
                    card.action();
                  }
                }}
                className={`cursor-pointer group bg-white rounded-2xl p-4 shadow-sm border transition-all duration-300 select-none ${
                  isActive 
                    ? 'shadow-[0_16px_36px_rgba(0,0,0,0.06)] border-blue-500/40 ring-4 ring-blue-500/10 bg-slate-50/30' 
                    : 'border-slate-200/60 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    {React.createElement(card.icon, { size: 18 })}
                  </div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{card.title}</h3>
                <p className="text-xs text-[#86868b] leading-relaxed mb-3">{card.desc}</p>
                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-[#2997ff] group-hover:text-blue-700 transition-colors">
                  <span>{isActive ? 'Cerrar detalle' : 'Ver detalle'}</span>
                  {loadingCardId === card.id ? (
                    <svg className="animate-spin h-3.5 w-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : isActive ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  )}
                </div>
              </div>

              {isActive && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-lg p-5 my-3">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">{kpiModal.title}</h3>
                      <p className="text-xs text-slate-400 font-bold">{kpiModal.items.length} registros</p>
                    </div>
                    <button 
                      onClick={() => setKpiModal(null)} 
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {kpiModal && kpiModal.cardId === 'revision-sociedad' && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1">
                      <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Guía de Columnas y Reglas de Reasignación</div>
                      <div>• <span className="font-bold text-slate-700">Negocio</span>: AC asignado directamente en la tropa (CRM).</div>
                      <div>• <span className="font-bold text-slate-700">Soc. Raw</span>: Razón social o tag de la sociedad en Metabase.</div>
                      <div>• <span className="font-bold text-slate-700">Soc. OK</span>: AC resuelto canónicamente según el maestro de sociedades.</div>
                      <div>• <span className="font-bold text-slate-700">Reasignar Válido</span>: Es posible reasignar si el AC de la sociedad es un agente activo del Roster. No es válido para cuentas corporativas o comerciales inactivos.</div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    {kpiModal.type === 'grouped' ? (
                      <div className="space-y-3">
                        {(() => {
                          const grouped: Record<string, any[]> = {};
                          kpiModal.items.forEach((item: any) => {
                            const vName = item.ac_vendedor || 'Sin Asignar';
                            const cName = item.ac_comprador || 'Sin Asignar';
                            
                            if (vName && vName !== '—') {
                              if (!grouped[vName]) grouped[vName] = [];
                              if (!grouped[vName].some((x: any) => x.lote === item.lote && x.rol === 'Venta')) {
                                grouped[vName].push({ ...item, rol: 'Venta' });
                              }
                            }
                            if (cName && cName !== '—') {
                              if (!grouped[cName]) grouped[cName] = [];
                              if (!grouped[cName].some((x: any) => x.lote === item.lote && x.rol === 'Compra')) {
                                grouped[cName].push({ ...item, rol: 'Compra' });
                              }
                            }
                            if ((!vName || vName === '—') && (!cName || cName === '—')) {
                              if (!grouped['Sin Asignar']) grouped['Sin Asignar'] = [];
                              grouped['Sin Asignar'].push({ ...item, rol: 'Sin Asignar' });
                            }
                          });

                          return Object.entries(grouped)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([acName, list]) => (
                              <AcGroupAccordion key={acName} acName={acName} list={list} />
                            ));
                        })()}
                      </div>
                    ) : (
                      <SortableTable columns={kpiModal.columns} data={kpiModal.items} fmt={fmt} />
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
