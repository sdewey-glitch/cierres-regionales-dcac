import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Settings2, Plus, X, Scale, TrendingUp, Users, Download, Loader2, RefreshCw, Printer } from 'lucide-react';

// Tailwind safelist — ensures dynamic `bg-${color}-*` classes are generated:
// bg-indigo-50 text-indigo-800 text-indigo-600 text-indigo-700
// bg-cyan-50 text-cyan-800 text-cyan-600 text-cyan-700
// bg-orange-50 text-orange-800 text-orange-600 text-orange-700
// bg-teal-50 text-teal-800 text-teal-600 text-teal-700
// bg-slate-50 text-slate-800 text-slate-600 text-slate-700
// ─── Constants ───
const MODELOS = [
  { id: 'completo',     name: 'Completo',         tag: 'Personal + Regional* + Oficina**',  esc: 'personal', hasCol: true,  hasOfi: true,  regMult: 1,   color: 'indigo' },
  { id: 'city_manager', name: 'Híbrido',          tag: 'Personal + Regional* (50%)',        esc: 'personal', hasCol: true,  hasOfi: false, regMult: 0.5, color: 'cyan' },
  { id: 'corporate',    name: 'Corporate KAM',    tag: 'Personal',                          esc: 'ac',       hasCol: false, hasOfi: false, regMult: 1,   color: 'orange' },
  { id: 'general',      name: 'General / Simple', tag: 'Personal',                          esc: 'ac',       hasCol: false, hasOfi: false, regMult: 0,   color: 'teal' },
];

const CATEGORIAS = [
  { id: 'top',       name: 'Top AC',            min: 3851170 },
  { id: 'corp',      name: 'Corporate',         min: 3851170 },
  { id: 'general',   name: 'General',           min: 1925585 },
  { id: 'acuerdo',   name: 'Acuerdo',           min: 2160000 },
  { id: 'hibrido',   name: 'Híbrido',           min: 2160000 },
  { id: 'sin_min',   name: 'Sin Mínimo',        min: 0 },
];

function getScale(cabezas: number, type: string) {
  if (type === 'fijo') return 0.10;
  let max = 0, min = 0, maxCab = 0;
  if (type === 'ac')         { max = 0.30; min = 0.15; maxCab = 4000; }
  else if (type === 'personal')   { max = 0.22; min = 0.14; maxCab = 6000; }
  else if (type === 'provincial') { max = 0.10; min = 0.05; maxCab = 15000; }
  else if (type === 'oficina')    { max = 0.20; min = 0.05; maxCab = 2000; }
  const cab = Math.floor(cabezas / 250) * 250;
  if (cab === 0) return max;
  if (cab >= maxCab) return min;
  const log100 = Math.log10(100);
  const logMax = Math.log10(maxCab);
  const logC = Math.log10(Math.max(cab, 1));
  const raw = min + (max - min) * (1 - (logC - log100) / (logMax - log100));
  return Math.min(max, Math.max(min, raw));
}

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const fmtP = (v: number) => `${(v * 100).toFixed(1)}%`;

interface SlotConfig {
  modeloId: string;
  catId: string;
  customMin: number;
}

function calcModel(slot: SlotConfig, shared: any) {
  const modelo = MODELOS.find(m => m.id === slot.modeloId) || MODELOS[3];
  const cat = CATEGORIAS.find(c => c.id === slot.catId) || CATEGORIAS[2];

  const { cabInvV, cabInvC, impInv, rInv, cabFaV, cabFaC, impFa, rFa, cabCrV, cabCrC, impCr, rCr, cabMaV, cabMaC, impMa, rMa, poolCab, poolImp, poolRend, poolDirCab, miembros } = shared;

  const cabV = cabInvV + cabFaV + cabCrV + cabMaV;
  const cabC = cabInvC + cabFaC + cabCrC + cabMaC;
  const cabezas = cabV + cabC;

  const resInv = (cabInvV + cabInvC) * impInv * (rInv / 100);
  const resFa = (cabFaV + cabFaC) * impFa * (rFa / 100);
  const resCr = (cabCrV + cabCrC) * impCr * (rCr / 100);
  const resMa = (cabMaV + cabMaC) * impMa * (rMa / 100);

  const isCorp = modelo.id === 'corporate';
  let resultado = 0;
  let compP = 0;
  const escalaP = getScale(cabezas, modelo.esc);

  if (isCorp) {
    const gcV = cabInvV * impInv * (rInv / 100);
    const gcC = cabInvC * impInv * (rInv / 100);
    const mFa = cabFaV * impFa * (rFa / 100);
    const mIn = cabFaC * impFa * (rFa / 100);
    const act = cabCrC * impCr * (rCr / 100);
    resultado = gcV + gcC + mFa + mIn + act;
    compP = (gcV * 0.04) + (gcC * 0.02) + (mFa * 0.20) + (mIn * 0.15) + (act * 0.10);
  } else {
    resultado = resInv + resFa + resCr + resMa;
    compP = resultado * escalaP;
  }

  const baseMin = slot.catId === 'sin_min' ? 0 : (slot.customMin > 0 ? slot.customMin : cat.min);
  const cobraMin = compP < baseMin && baseMin > 0;
  const variableP = cobraMin ? 0 : (compP - baseMin);

  // Regional
  let compR = 0, escalaR = 0, tajada = 0;
  const poolRes = poolCab * poolImp * (poolRend / 100);
  if (modelo.hasCol && !cobraMin) {
    escalaR = getScale(poolCab, 'provincial') * modelo.regMult;
    const bolsa = poolRes * escalaR;
    tajada = Math.min(1, cabezas / Math.max(poolCab, 1));
    compR = bolsa * tajada;
  }

  // Oficina
  let compO = 0, escalaO = 0;
  if (modelo.hasOfi && !cobraMin) {
    escalaO = getScale(poolDirCab, 'oficina');
    const bolsaO = poolDirCab * poolImp * (poolRend / 100) * escalaO;
    compO = bolsaO / Math.max(miembros, 1);
  }

  const bruto = baseMin + variableP + compR + compO;
  const complemento = cobraMin ? baseMin - compP : 0;

  return { modelo, cat, cabezas, resultado, escalaP, compP, baseMin, cobraMin, variableP, compR, escalaR, tajada, compO, escalaO, bruto, complemento, poolRes, isCorp,
    // Per-UN breakdown
    cabFaTotal: cabFaV + cabFaC, resFa,
    cabMaTotal: cabMaV + cabMaC, resMa,
    cabInvTotal: cabInvV + cabInvC, resInv,
    cabCrTotal: cabCrV + cabCrC, resCr,
    // Pool details
    poolCab, poolDirCab, miembros,
    bolsaR: modelo.hasCol && !cobraMin ? poolRes * escalaR : 0,
    bolsaO: modelo.hasOfi && !cobraMin ? poolDirCab * poolImp * (poolRend / 100) * escalaO : 0,
  };
}

// ─── Compact Number Input ───
function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(abs >= 10_000 ? 0 : 1) + 'K';
  return String(v);
}

function NumInput({ label, value, onChange, color, step, compact }: { label?: string; value: number; onChange: (v: number) => void; color?: string; step?: string; compact?: boolean }) {
  const [focused, setFocused] = useState(false);
  const showCompact = compact && !focused && value !== 0;
  return (
    <div>
      {label && <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">{label}</label>}
      <input
        type={showCompact ? 'text' : 'number'}
        step={step}
        value={showCompact ? fmtCompact(value) : value}
        onChange={e => { if (!showCompact) onChange(Number(e.target.value)); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={showCompact}
        className={`w-full bg-slate-50/60 rounded text-xs px-1.5 py-1 text-center font-bold outline-none ${focused ? 'ring-1 ring-blue-400 bg-white' : 'hover:bg-slate-100/60'} transition-all ${showCompact ? 'cursor-pointer' : ''}`}
      />
    </div>
  );
}

// ─── SessionStorage persistence ───
const SS_KEY = 'sim_state_v2';

function loadSS<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`${SS_KEY}_${key}`);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveSS(key: string, value: any) {
  try { sessionStorage.setItem(`${SS_KEY}_${key}`, JSON.stringify(value)); } catch {}
}

// ─── Main Component ───
export default function Simulator({ activeMonth, activeYear }: { activeMonth: string; activeYear: string }) {
  // Shared production data — initialized from sessionStorage
  const [cabInvV, setCabInvV] = useState(() => loadSS('cabInvV', 0));
  const [cabInvC, setCabInvC] = useState(() => loadSS('cabInvC', 0));
  const [impInv, setImpInv] = useState(() => loadSS('impInv', 400000));
  const [rInv, setRInv] = useState(() => loadSS('rInv', 2.5));

  const [cabFaV, setCabFaV] = useState(() => loadSS('cabFaV', 0));
  const [cabFaC, setCabFaC] = useState(() => loadSS('cabFaC', 0));
  const [impFa, setImpFa] = useState(() => loadSS('impFa', 900000));
  const [rFa, setRFa] = useState(() => loadSS('rFa', 2.5));

  const [cabCrV, setCabCrV] = useState(() => loadSS('cabCrV', 0));
  const [cabCrC, setCabCrC] = useState(() => loadSS('cabCrC', 0));
  const [impCr, setImpCr] = useState(() => loadSS('impCr', 400000));
  const [rCr, setRCr] = useState(() => loadSS('rCr', 2.5));

  const [cabMaV, setCabMaV] = useState(() => loadSS('cabMaV', 0));
  const [cabMaC, setCabMaC] = useState(() => loadSS('cabMaC', 0));
  const [impMa, setImpMa] = useState(() => loadSS('impMa', 600000));
  const [rMa, setRMa] = useState(() => loadSS('rMa', 1.5));

  // Pool
  const [poolCab, setPoolCab] = useState(() => loadSS('poolCab', 12000));
  const [poolImp, setPoolImp] = useState(() => loadSS('poolImp', 600000));
  const [poolRend, setPoolRend] = useState(() => loadSS('poolRend', 2.5));
  const [poolDirCab, setPoolDirCab] = useState(() => loadSS('poolDirCab', 1500));
  const [miembros, setMiembros] = useState(() => loadSS('miembros', 5));

  // Auto-persist to sessionStorage
  useEffect(() => { saveSS('cabInvV', cabInvV); }, [cabInvV]);
  useEffect(() => { saveSS('cabInvC', cabInvC); }, [cabInvC]);
  useEffect(() => { saveSS('impInv', impInv); }, [impInv]);
  useEffect(() => { saveSS('rInv', rInv); }, [rInv]);
  useEffect(() => { saveSS('cabFaV', cabFaV); }, [cabFaV]);
  useEffect(() => { saveSS('cabFaC', cabFaC); }, [cabFaC]);
  useEffect(() => { saveSS('impFa', impFa); }, [impFa]);
  useEffect(() => { saveSS('rFa', rFa); }, [rFa]);
  useEffect(() => { saveSS('cabCrV', cabCrV); }, [cabCrV]);
  useEffect(() => { saveSS('cabCrC', cabCrC); }, [cabCrC]);
  useEffect(() => { saveSS('impCr', impCr); }, [impCr]);
  useEffect(() => { saveSS('rCr', rCr); }, [rCr]);
  useEffect(() => { saveSS('cabMaV', cabMaV); }, [cabMaV]);
  useEffect(() => { saveSS('cabMaC', cabMaC); }, [cabMaC]);
  useEffect(() => { saveSS('impMa', impMa); }, [impMa]);
  useEffect(() => { saveSS('rMa', rMa); }, [rMa]);
  useEffect(() => { saveSS('poolCab', poolCab); }, [poolCab]);
  useEffect(() => { saveSS('poolImp', poolImp); }, [poolImp]);
  useEffect(() => { saveSS('poolRend', poolRend); }, [poolRend]);
  useEffect(() => { saveSS('poolDirCab', poolDirCab); }, [poolDirCab]);
  useEffect(() => { saveSS('miembros', miembros); }, [miembros]);

  // Snapshot: derived from App's month/year
  const snapshotFile = `cierre_${activeYear}_${activeMonth.padStart(2, '0')}.json`;
  const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const snapshotLabel = `${MESES[parseInt(activeMonth)] || activeMonth} ${activeYear}`;

  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [loadedLabel, setLoadedLabel] = useState(() => loadSS('loadedLabel', ''));
  const didAutoLoad = useRef(false);

  const loadFromSnapshot = useCallback(async () => {
    setLoadingSnapshot(true);
    try {
      // 1) Try to get REAL market metrics from Metabase (rendimientos reales de tropas)
      let usedMarket = false;
      try {
        const mRes = await fetch(`/api/market-metrics?year=${activeYear}&month=${parseInt(activeMonth)}`);
        if (mRes.ok) {
          const mData = await mRes.json();
          const m = mData.metrics;
          if (m && m.TOTAL && m.TOTAL.cab > 0) {
            // $/CAB per UN from real lote data
            const dpcTotal = m.TOTAL.dollarPerCab || 500000;
            setImpInv(m.INV?.dollarPerCab || dpcTotal);
            setImpFa(m.FAENA?.dollarPerCab || dpcTotal);
            setImpCr(m.CRIA?.dollarPerCab || dpcTotal);
            setImpMa(m.MAG?.dollarPerCab || dpcTotal);
            // Rend% per UN from cabeza-weighted average
            setRInv(m.INV?.rend || 0);
            setRFa(m.FAENA?.rend || 0);
            setRCr(m.CRIA?.rend || 0);
            setRMa(m.MAG?.rend || 0);
            // Pool rend from total
            setPoolImp(dpcTotal);
            setPoolRend(m.TOTAL.rend || 2.5);
            usedMarket = true;

          }
        }
      } catch (mErr) {
        console.warn('Market metrics API unavailable, falling back to snapshot:', mErr);
      }

      // 2) Fallback: derive from snapshot (engine-adjusted values — less accurate)
      if (!usedMarket) {
        const dataRes = await fetch(`/api/snapshots/${snapshotFile}`);
        if (!dataRes.ok) { alert(`No hay datos para ${snapshotLabel}`); return; }
        const data: any[] = await dataRes.json();
        const active = data.filter((a: any) => a.cabezasGeneral > 0);
        let tCabInv = 0, tResInv = 0, tCabFa = 0, tResFa = 0, tCabCr = 0, tResCr = 0, tCabMa = 0, tResMa = 0;
        let tImpGen = 0, tCabGen = 0;
        for (const a of active) {
          tCabInv += a.cabInv || 0; tResInv += a.resInv || 0;
          tCabFa += a.cabFaena || 0; tResFa += a.resFaena || 0;
          tCabCr += a.cabCria || 0; tResCr += a.resCria || 0;
          tCabMa += a.cabMag || 0; tResMa += a.resMag || 0;
          tCabGen += a.cabezasGeneral || 0;
          tImpGen += a.importeGen || 0;
        }
        const dollarPerCab = tCabGen > 0 ? Math.round(tImpGen / tCabGen) : 500000;
        const rendInv = tCabInv > 0 ? Math.round((tResInv / tCabInv) / dollarPerCab * 10000) / 100 : 0;
        const rendFa  = tCabFa > 0 ? Math.round((tResFa / tCabFa) / dollarPerCab * 10000) / 100 : 0;
        const rendCr  = tCabCr > 0 ? Math.round((tResCr / tCabCr) / dollarPerCab * 10000) / 100 : 0;
        const rendMa  = tCabMa > 0 ? Math.round((tResMa / tCabMa) / dollarPerCab * 10000) / 100 : 0;
        setImpInv(dollarPerCab); setRInv(rendInv);
        setImpFa(dollarPerCab);  setRFa(rendFa);
        setImpCr(dollarPerCab);  setRCr(rendCr);
        setImpMa(dollarPerCab);  setRMa(rendMa);
      }

      setLoadedLabel(snapshotLabel);
      saveSS('loadedLabel', snapshotLabel);
    } catch (e: any) {
      console.error('Error cargando snapshot:', e.message);
    } finally {
      setLoadingSnapshot(false);
    }
  }, [snapshotFile, snapshotLabel, activeYear, activeMonth]);

  // Auto-load on first mount
  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    if (!loadedLabel) loadFromSnapshot();
  }, []);

  // Reset all to defaults
  const resetAll = useCallback(() => {
    if (!confirm('¿Resetear todos los datos del simulador?')) return;
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(k => { if (k.startsWith(SS_KEY)) sessionStorage.removeItem(k); });
    // Reset state
    setCabInvV(0); setCabInvC(0); setImpInv(400000); setRInv(2.5);
    setCabFaV(0); setCabFaC(0); setImpFa(900000); setRFa(2.5);
    setCabCrV(0); setCabCrC(0); setImpCr(400000); setRCr(2.5);
    setCabMaV(0); setCabMaC(0); setImpMa(600000); setRMa(1.5);
    setPoolCab(12000); setPoolImp(600000); setPoolRend(2.5); setPoolDirCab(1500); setMiembros(5);
    setLoadedLabel('');
    setSlots([
      { modeloId: 'completo', catId: 'top', customMin: 0 },
      { modeloId: 'general', catId: 'general', customMin: 0 },
    ]);
  }, []);

  // Print
  const handlePrint = useCallback(() => { window.print(); }, []);

  // Comparison slots
  const [slots, setSlots] = useState<SlotConfig[]>(() => loadSS('slots', [
    { modeloId: 'completo', catId: 'top', customMin: 0 },
    { modeloId: 'general', catId: 'general', customMin: 0 },
  ]));
  useEffect(() => { saveSS('slots', slots); }, [slots]);

  const addSlot = () => {
    if (slots.length >= 4) return;
    const used = new Set(slots.map(s => s.modeloId));
    const next = MODELOS.find(m => !used.has(m.id)) || MODELOS[0];
    setSlots([...slots, { modeloId: next.id, catId: 'general', customMin: 0 }]);
  };

  const removeSlot = (i: number) => {
    if (slots.length <= 1) return;
    setSlots(slots.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i: number, patch: Partial<SlotConfig>) => {
    setSlots(slots.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const shared = { cabInvV, cabInvC, impInv, rInv, cabFaV, cabFaC, impFa, rFa, cabCrV, cabCrC, impCr, rCr, cabMaV, cabMaC, impMa, rMa, poolCab, poolImp, poolRend, poolDirCab, miembros };

  const results = useMemo(() => slots.map(s => calcModel(s, shared)), [slots, shared]);

  // Find the best bruto for highlighting
  const maxBruto = Math.max(...results.map(r => r.bruto));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-24">

      {/* ═══════ TOP TOOLBAR ═══════ */}
      <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Scale size={24} className="text-blue-600" /> Simulador Comercial
          {snapshotLabel && <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">📊 {snapshotLabel}</span>}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => loadFromSnapshot()} disabled={loadingSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
            {loadingSnapshot ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {loadingSnapshot ? 'Cargando...' : `Cargar ${snapshotLabel}`}
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <button onClick={resetAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-200">
            <RefreshCw size={12} /> Resetear
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-colors">
            <Printer size={12} /> Imprimir
          </button>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5"><Settings2 size={13} className="text-slate-400" /> Datos de Producción</h2>
          <span className="text-[10px] text-slate-400">Compartidos entre todos los modelos</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr_auto] gap-0 items-start">
          {/* ── Componente Personal ── */}
          {(() => {
            const cabPers = cabInvV + cabInvC + cabFaV + cabFaC + cabCrV + cabCrC + cabMaV + cabMaC;
            const resInv = (cabInvV + cabInvC) * impInv * rInv / 100;
            const resFa = (cabFaV + cabFaC) * impFa * rFa / 100;
            const resCr = (cabCrV + cabCrC) * impCr * rCr / 100;
            const resMa = (cabMaV + cabMaC) * impMa * rMa / 100;
            const resPers = resInv + resFa + resCr + resMa;
            const escP = getScale(cabPers, 'personal');
            const poolRes = poolCab * poolImp * poolRend / 100;
            const escR = getScale(poolCab, 'provincial');
            const tajada = poolCab > 0 ? Math.min(1, cabPers / poolCab) : 0;
            const escO = getScale(poolDirCab, 'oficina');
            const resOfi = poolDirCab * poolImp * poolRend / 100;

            return (<>
          <div className="pr-3">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">Comp. Personal</div>
            <table className="text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="w-14"></th>
                  <th className="px-1 py-1 text-center font-bold text-red-600">Invernada</th>
                  <th className="px-1 py-1 text-center font-bold text-blue-600">Faena</th>
                  <th className="px-1 py-1 text-center font-bold text-amber-600">Cría</th>
                  <th className="px-1 py-1 text-center font-bold text-emerald-600">MAG</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-1 py-1 font-semibold text-slate-500">Venta</td>
                  <td className="px-1"><NumInput value={cabInvV} onChange={setCabInvV} /></td>
                  <td className="px-1"><NumInput value={cabFaV} onChange={setCabFaV} /></td>
                  <td className="px-1"><NumInput value={cabCrV} onChange={setCabCrV} /></td>
                  <td className="px-1"><NumInput value={cabMaV} onChange={setCabMaV} /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-1 py-1 font-semibold text-slate-500">Compra</td>
                  <td className="px-1"><NumInput value={cabInvC} onChange={setCabInvC} /></td>
                  <td className="px-1"><NumInput value={cabFaC} onChange={setCabFaC} /></td>
                  <td className="px-1"><NumInput value={cabCrC} onChange={setCabCrC} /></td>
                  <td className="px-1"><NumInput value={cabMaC} onChange={setCabMaC} /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-1 py-1 font-semibold text-slate-500">$/CAB</td>
                  <td className="px-1"><NumInput value={impInv} onChange={setImpInv} compact /></td>
                  <td className="px-1"><NumInput value={impFa} onChange={setImpFa} compact /></td>
                  <td className="px-1"><NumInput value={impCr} onChange={setImpCr} compact /></td>
                  <td className="px-1"><NumInput value={impMa} onChange={setImpMa} compact /></td>
                </tr>
                <tr>
                  <td className="px-1 py-1 font-semibold text-slate-500">Rend%</td>
                  <td className="px-1"><NumInput value={rInv} onChange={setRInv} step="0.1" /></td>
                  <td className="px-1"><NumInput value={rFa} onChange={setRFa} step="0.1" /></td>
                  <td className="px-1"><NumInput value={rCr} onChange={setRCr} step="0.1" /></td>
                  <td className="px-1"><NumInput value={rMa} onChange={setRMa} step="0.1" /></td>
                </tr>
              </tbody>
            </table>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex gap-4 text-xs text-slate-500">
              <span>Cab <b className="text-slate-700">{cabPers.toLocaleString('es-AR')}</b></span>
              <span>Res <b className="text-slate-700">{fmtCompact(Math.round(resPers))}</b></span>
              <span>%Bolsa <b className="text-blue-700">{fmtP(escP)}</b></span>
            </div>
          </div>

          {/* ── Componentes ── */}
          <div className="border-l border-slate-200 px-4 flex-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Componentes</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left font-bold text-slate-400 py-1"></th>
                  <th className="text-right font-bold text-slate-400 py-1 px-2">Cabezas</th>
                  <th className="text-right font-bold text-slate-400 py-1 px-2">Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-bold text-blue-600">Personal</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{cabPers.toLocaleString('es-AR')}</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(resPers))}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-bold text-violet-600">Regional</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{poolCab.toLocaleString('es-AR')}</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(poolRes))}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold text-teal-600">Oficina</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{poolDirCab.toLocaleString('es-AR')}</td>
                  <td className="py-1 px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(resOfi))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Inputs Regional / Oficina ── */}
          <div className="border-l border-slate-200 px-4">
            <table className="text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-semibold text-violet-600 pr-3">Cab. Regional</td>
                  <td className="w-20"><NumInput value={poolCab} onChange={setPoolCab} /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-semibold text-teal-600 pr-3">Cab. directas</td>
                  <td><NumInput value={poolDirCab} onChange={setPoolDirCab} /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-semibold text-teal-600 pr-3">Miembros</td>
                  <td><NumInput value={miembros} onChange={setMiembros} /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1 font-semibold text-slate-500 pr-3">$/cab</td>
                  <td><NumInput value={poolImp} onChange={setPoolImp} compact /></td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold text-slate-500 pr-3">Rend%</td>
                  <td><NumInput value={poolRend} onChange={setPoolRend} step="0.1" /></td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
              <div>* Regional = tropas oficina total</div>
              <div>** Oficina = cabezas directas</div>
            </div>
          </div>
            </>);
          })()}
        </div>
      </div>

      {/* ═══════ BOTTOM: Model comparison ═══════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800 text-lg">Comparador de Modelos</h2>
          </div>
          {slots.length < 4 && (
            <button onClick={addSlot} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={14} /> Agregar modelo
            </button>
          )}
        </div>

        <div className={`grid gap-4 ${slots.length === 1 ? 'grid-cols-1 max-w-xl' : slots.length === 2 ? 'grid-cols-1 md:grid-cols-2' : slots.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'}`}>
          {results.map((r, i) => {
            const slot = slots[i];
            const isWinner = r.bruto === maxBruto && results.length > 1;
            const m = r.modelo;
            // UN rows in requested order: FAENA, MAG, INV, CRIA
            const unRows = [
              { name: 'Faena', color: 'text-blue-700', cab: r.cabFaTotal, res: r.resFa },
              { name: 'MAG', color: 'text-emerald-700', cab: r.cabMaTotal, res: r.resMa },
              { name: 'Invernada', color: 'text-red-700', cab: r.cabInvTotal, res: r.resInv },
              { name: 'Cría', color: 'text-yellow-700', cab: r.cabCrTotal, res: r.resCr },
            ];
            const bolsaPersonalPct = r.resultado > 0 ? r.compP / r.resultado : 0;
            return (
              <div key={i} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col transition-all ${isWinner ? 'border-green-400 shadow-green-100' : 'border-slate-200'}`}>
                {/* Model header */}
                <div className={`px-4 py-2.5 border-b border-slate-200 bg-${m.color}-50`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-extrabold text-${m.color}-800 text-sm`}>{m.name}</h3>
                      <span className={`text-[10px] text-${m.color}-600 font-medium`}>{m.tag}</span>
                    </div>
                    {slots.length > 1 && (
                      <button onClick={() => removeSlot(i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
                    )}
                  </div>
                </div>

                {/* Config: model + category + custom min */}
                <div className="p-2.5 space-y-1.5 bg-slate-50/50 border-b border-slate-100">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Modelo</label>
                    <select value={slot.modeloId} onChange={e => updateSlot(i, { modeloId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none">
                      {MODELOS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.tag})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Categoría</label>
                      <select value={slot.catId} onChange={e => updateSlot(i, { catId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none">
                        {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.name} ({fmtCompact(c.min)})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Mín. custom</label>
                      <input type="number" value={slot.customMin} onChange={e => updateSlot(i, { customMin: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none" />
                    </div>
                  </div>
                </div>

                {/* ─── Componente Personal ─── */}
                <div className="px-3 pt-2 pb-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Comp. Personal — {r.isCorp ? 'KAM%' : fmtP(r.escalaP)}</div>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-[9px] text-slate-400 uppercase">
                        <th className="text-left font-bold py-0.5">UN</th>
                        <th className="text-right font-bold py-0.5">Cab</th>
                        <th className="text-right font-bold py-0.5">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unRows.map(u => (
                        <tr key={u.name} className={u.cab === 0 ? 'opacity-30' : ''}>
                          <td className={`py-0.5 font-bold ${u.color}`}>{u.name}</td>
                          <td className="py-0.5 text-right text-slate-600">{u.cab.toLocaleString('es-AR')}</td>
                          <td className="py-0.5 text-right font-semibold text-slate-800">{fmtCompact(Math.round(u.res))}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 font-bold">
                        <td className="py-1 text-slate-700">Total</td>
                        <td className="py-1 text-right text-slate-700">{r.cabezas.toLocaleString('es-AR')}</td>
                        <td className="py-1 text-right text-slate-900">{fmtCompact(Math.round(r.resultado))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ─── Componente Personal Block ─── */}
                <div className="px-3 py-2 border-t-2 border-blue-200 bg-blue-50/30">
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr>
                        <td rowSpan={2} className="pr-2 font-black text-blue-600 text-[11px] align-middle w-16 border-r border-blue-100">PERSONAL</td>
                        <td className="px-2 text-right font-semibold text-slate-700">{r.cabezas.toLocaleString('es-AR')}</td>
                        <td className="px-1 text-slate-400">Cabezas</td>
                        <td className="px-2 text-center text-slate-400">Venta <b className="text-slate-600">{(cabInvV + cabFaV + cabCrV + cabMaV).toLocaleString('es-AR')}</b></td>
                        <td className="px-2 text-center text-slate-400">Compra <b className="text-slate-600">{(cabInvC + cabFaC + cabCrC + cabMaC).toLocaleString('es-AR')}</b></td>
                        <td rowSpan={2} className="pl-3 text-right font-black text-blue-800 text-base align-middle">{fmt.format(r.compP)}</td>
                      </tr>
                      <tr>
                        <td className="px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(r.resultado))}</td>
                        <td className="px-1 text-slate-400">Resultado</td>
                        <td colSpan={2} className="px-2 text-center font-bold text-blue-600">Bolsa {fmtP(bolsaPersonalPct)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Min status */}
                <div className={`mx-3 rounded px-2 py-1 mb-1 text-[10px] flex justify-between ${r.cobraMin ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  <span className="font-bold">{r.cobraMin ? '❌ Bajo mínimo' : '✅ Supera mínimo'}</span>
                  <span className="font-bold">{fmtCompact(r.baseMin)}</span>
                </div>

                {/* ─── Componente Regional Block ─── */}
                {m.hasCol && (
                  <div className="px-3 py-2 border-t-2 border-violet-200 bg-violet-50/30">
                    <table className="w-full text-[10px]">
                      <tbody>
                        <tr>
                          <td rowSpan={2} className="pr-2 font-black text-violet-600 text-[11px] align-middle w-16 border-r border-violet-100">REGIONAL</td>
                          <td className="px-2 text-right font-semibold text-slate-700">{r.poolCab.toLocaleString('es-AR')}</td>
                          <td className="px-1 text-slate-400">Cabezas</td>
                          <td className="px-2 text-center font-bold text-violet-600">Bolsa</td>
                          <td className="px-2 text-center font-bold text-violet-600">Tajada</td>
                          <td rowSpan={2} className="pl-3 text-right font-black text-violet-800 text-base align-middle">{fmt.format(r.compR)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(r.poolRes))}</td>
                          <td className="px-1 text-slate-400">Resultado</td>
                          <td className="px-2 text-center font-bold text-violet-700">{fmtP(r.escalaR)}</td>
                          <td className="px-2 text-center font-bold text-violet-700">{fmtP(r.tajada)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ─── Componente Oficina Block ─── */}
                {m.hasOfi && (
                  <div className="px-3 py-2 border-t-2 border-teal-200 bg-teal-50/30">
                    <table className="w-full text-[10px]">
                      <tbody>
                        <tr>
                          <td rowSpan={2} className="pr-2 font-black text-teal-600 text-[11px] align-middle w-16 border-r border-teal-100">OFICINA</td>
                          <td className="px-2 text-right font-semibold text-slate-700">{r.poolDirCab.toLocaleString('es-AR')}</td>
                          <td className="px-1 text-slate-400">Cabezas</td>
                          <td className="px-2 text-center font-bold text-teal-600">Escala</td>
                          <td className="px-2 text-center font-bold text-teal-600">%OP</td>
                          <td rowSpan={2} className="pl-3 text-right font-black text-teal-800 text-base align-middle">{fmt.format(r.compO)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 text-right font-semibold text-slate-700">{fmtCompact(Math.round(r.bolsaO / (r.escalaO || 1)))}</td>
                          <td className="px-1 text-slate-400">Resultado</td>
                          <td className="px-2 text-center font-bold text-teal-700">{fmtP(r.escalaO)}</td>
                          <td className="px-2 text-center font-bold text-teal-700">{((1 / Math.max(r.miembros, 1)) * 100).toFixed(1)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {r.complemento > 0 && (
                  <div className="px-3 py-1 text-[11px] flex justify-between border-t border-slate-100">
                    <span className="text-amber-600">Complemento mínimo</span>
                    <span className="font-bold text-amber-700">+{fmt.format(r.complemento)}</span>
                  </div>
                )}

                {/* Total */}
                <div className={`px-4 py-3 border-t-2 mt-auto ${isWinner ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-black uppercase tracking-wider ${isWinner ? 'text-green-800' : 'text-slate-600'}`}>
                      {isWinner && '🏆 '} Sueldo a facturar
                    </span>
                    <span className={`text-xl font-black ${isWinner ? 'text-green-700' : 'text-slate-800'}`}>{fmt.format(r.bruto)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════ OFFICE TEAM: Per-agent comparison ═══════ */}
      <OfficeTeam impInv={impInv} rInv={rInv} impFa={impFa} rFa={rFa} impCr={impCr} rCr={rCr} impMa={impMa} rMa={rMa} poolImp={poolImp} poolRend={poolRend}
        refCabInvV={cabInvV} refCabInvC={cabInvC} refCabFaV={cabFaV} refCabFaC={cabFaC} refCabCrV={cabCrV} refCabCrC={cabCrC} refCabMaV={cabMaV} refCabMaC={cabMaC}
        setPoolImp={setPoolImp} setPoolRend={setPoolRend} snapshotFile={snapshotFile}
        onSimulateAgent={(a) => {
          // Set per-UN cabezas directly (venta gets all, compra=0 per UN)
          // resultado = (V+C)*$/cab*rend% so the split doesn't affect the total
          setCabInvV(a.cabInv); setCabInvC(0);
          setCabFaV(a.cabFa);   setCabFaC(0);
          setCabCrV(a.cabCr);   setCabCrC(0);
          setCabMaV(a.cabMa);   setCabMaC(0);
          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />

    </div>
  );
}

// ─── Office Team sub-component ───
interface AgentRow {
  id: number;
  nombre: string;
  cabV: number;
  cabC: number;
  cabInv: number;
  cabFa: number;
  cabCr: number;
  cabMa: number;
  modeloA: string;
  modeloB: string;
  catId: string;
}

let _nextId = 100;
function OfficeTeam({ impInv, rInv, impFa, rFa, impCr, rCr, impMa, rMa, poolImp, poolRend,
  refCabInvV, refCabInvC, refCabFaV, refCabFaC, refCabCrV, refCabCrC, refCabMaV, refCabMaC,
  setPoolImp, setPoolRend, snapshotFile, onSimulateAgent }: {
  impInv: number; rInv: number; impFa: number; rFa: number; impCr: number; rCr: number; impMa: number; rMa: number; poolImp: number; poolRend: number;
  refCabInvV: number; refCabInvC: number; refCabFaV: number; refCabFaC: number; refCabCrV: number; refCabCrC: number; refCabMaV: number; refCabMaC: number;
  setPoolImp: (v: number) => void; setPoolRend: (v: number) => void; snapshotFile: string;
  onSimulateAgent: (a: AgentRow) => void;
}) {
  const defaultAgents: AgentRow[] = [
    { id: 1, nombre: 'Agente 1', cabV: 1200, cabC: 600, cabInv: 1200, cabFa: 600, cabCr: 0, cabMa: 0, modeloA: 'completo', modeloB: 'general', catId: 'general' },
    { id: 2, nombre: 'Agente 2', cabV: 800,  cabC: 400, cabInv: 800, cabFa: 400, cabCr: 0, cabMa: 0, modeloA: 'completo', modeloB: 'general', catId: 'general' },
    { id: 3, nombre: 'City Manager', cabV: 1500, cabC: 500, cabInv: 1500, cabFa: 500, cabCr: 0, cabMa: 0, modeloA: 'city_manager', modeloB: 'general', catId: 'hibrido' },
  ];
  const [agents, setAgents] = useState<AgentRow[]>(() => loadSS('officeAgents', defaultAgents));
  useEffect(() => { saveSS('officeAgents', agents); }, [agents]);

  const [poolDirCab, setPoolDirCab] = useState(() => loadSS('officePoolDirCab', 1500));
  useEffect(() => { saveSS('officePoolDirCab', poolDirCab); }, [poolDirCab]);

  const [loadingOffice, setLoadingOffice] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(() => loadSS('selectedOffice', 'Oficina Entre Rios'));
  useEffect(() => { saveSS('selectedOffice', selectedOffice); }, [selectedOffice]);

  const [availableOffices, setAvailableOffices] = useState<string[]>([]);
  const [officeLoaded, setOfficeLoaded] = useState(() => loadSS('officeLoaded', ''));
  useEffect(() => { saveSS('officeLoaded', officeLoaded); }, [officeLoaded]);

  // Load available offices from current snapshot
  useEffect(() => {
    if (!snapshotFile) return;
    fetch(`/api/snapshots/${snapshotFile}`).then(r => {
      if (!r.ok) return;
      return r.json();
    }).then((data: any[]) => {
      if (!data) return;
      const offices = [...new Set(data.map((a: any) => a.oficina).filter((o: string) => o && o !== 'Desconocida'))].sort();
      setAvailableOffices(offices);
    }).catch(() => {});
  }, [snapshotFile]);

  // Category mapping from roster number to our CATEGORIAS id
  const catMap: Record<number, string> = { 1: 'top', 2: 'corp', 3: 'general', 4: 'acuerdo', 5: 'hibrido', 6: 'sin_min', 7: 'op1', 8: 'op2', 9: 'op3', 10: 'op4' };

  const loadOffice = useCallback(async () => {
    setLoadingOffice(true);
    try {
      const dataRes = await fetch(`/api/snapshots/${snapshotFile}`);
      if (!dataRes.ok) { alert('No hay datos para este mes'); setLoadingOffice(false); return; }
      const data: any[] = await dataRes.json();

      const officeAgents = data.filter((a: any) => a.oficina === selectedOffice);
      if (!officeAgents.length) { alert(`No hay agentes en ${selectedOffice}`); setLoadingOffice(false); return; }

      const getModelId = (a: any) => {
        const tipo = (a.tipo || '').toLowerCase();
        if (tipo.includes('city') || tipo.includes('hibrido') || tipo.includes('híbrido')) return 'city_manager';
        if (a.componenteR > 0 && a.componenteO > 0) return 'completo';
        if (a.componenteR > 0) return 'completo';
        return 'general';
      };

      const newAgents: AgentRow[] = officeAgents.map((a: any) => ({
        id: _nextId++,
        nombre: a.asociadoComercial,
        cabV: Math.round(a.cabzGenVenta || 0),
        cabC: Math.round(a.cabzGenCompra || 0),
        cabInv: Math.round(a.cabInv || 0),
        cabFa: Math.round(a.cabFaena || 0),
        cabCr: Math.round(a.cabCria || 0),
        cabMa: Math.round(a.cabMag || 0),
        modeloA: getModelId(a),
        modeloB: 'general',
        catId: catMap[a.categoria] || 'general',
      }));

      setAgents(newAgents);

      // Also compute avg pool importe and rend from office data
      const totalCab = officeAgents.reduce((s: number, a: any) => s + (a.cabezasGeneral || 0), 0);
      const totalRes = officeAgents.reduce((s: number, a: any) => s + (a.resultado_final || 0), 0);
      const totalImp = officeAgents.reduce((s: number, a: any) => s + (a.importeGen || 0), 0);
      const avgImp = totalCab > 0 ? Math.round(totalImp / totalCab) : poolImp;
      setPoolImp(avgImp);

      // Compute rend from resultado / (cabezas * importe)
      if (totalCab > 0 && avgImp > 0) {
        const derivedRend = (totalRes / (totalCab * avgImp)) * 100;
        setPoolRend(Math.round(derivedRend * 10) / 10);
      }

      // Set directas from office level data if available
      const ofiAgent = officeAgents.find((a: any) => a.cabezasOfi > 0);
      if (ofiAgent) setPoolDirCab(Math.round(ofiAgent.cabezasOfi));

      setOfficeLoaded(selectedOffice);
    } catch (e: any) {
      alert('Error cargando oficina: ' + e.message);
    } finally {
      setLoadingOffice(false);
    }
  }, [selectedOffice, poolImp, snapshotFile]);

  // Auto-reload office when snapshot month changes
  const prevSnapshotRef = useRef(snapshotFile);
  useEffect(() => {
    if (prevSnapshotRef.current !== snapshotFile && officeLoaded) {
      prevSnapshotRef.current = snapshotFile;
      loadOffice();
    }
    prevSnapshotRef.current = snapshotFile;
  }, [snapshotFile, officeLoaded, loadOffice]);

  const addAgent = () => {
    setAgents([...agents, { id: _nextId++, nombre: `Agente ${agents.length + 1}`, cabV: 500, cabC: 200, cabInv: 500, cabFa: 200, cabCr: 0, cabMa: 0, modeloA: 'completo', modeloB: 'general', catId: 'general' }]);
  };

  const removeAgent = (id: number) => {
    if (agents.length <= 1) return;
    setAgents(agents.filter(a => a.id !== id));
  };

  const updateAgent = (id: number, patch: Partial<AgentRow>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  // Auto-calculate pool from all agents
  const poolCab = agents.reduce((sum, a) => sum + a.cabV + a.cabC, 0);

  // Reference resultado-per-cabeza from top panel data
  const refCabTotal = refCabInvV + refCabInvC + refCabFaV + refCabFaC + refCabCrV + refCabCrC + refCabMaV + refCabMaC;
  const refResTotal = (refCabInvV + refCabInvC) * impInv * (rInv / 100)
                    + (refCabFaV + refCabFaC) * impFa * (rFa / 100)
                    + (refCabCrV + refCabCrC) * impCr * (rCr / 100)
                    + (refCabMaV + refCabMaC) * impMa * (rMa / 100);
  const resPerCab = refCabTotal > 0 ? refResTotal / refCabTotal : 0;

  // Calculate results for each agent under both models
  const teamResults = useMemo(() => {
    return agents.map(agent => {
      const cabezas = agent.cabV + agent.cabC;
      // Compute resultado per-UN using shared $/CAB and Rend% (same formula as top comparator)
      const resultado = agent.cabInv * impInv * (rInv / 100)
                      + agent.cabFa * impFa * (rFa / 100)
                      + agent.cabCr * impCr * (rCr / 100)
                      + agent.cabMa * impMa * (rMa / 100);

      const cat = CATEGORIAS.find(c => c.id === agent.catId) || CATEGORIAS[2];
      const baseMinA = agent.catId === 'sin_min' ? 0 : cat.min;
      const baseMinB = baseMinA;

      // Calc for model A
      const mA = MODELOS.find(m => m.id === agent.modeloA) || MODELOS[3];
      const escalaPA = mA.id === 'corporate' ? 0 : getScale(cabezas, mA.esc);
      const compPA = mA.id === 'corporate' ? resultado * 0.04 : resultado * escalaPA;
      const cobraMinA = compPA < baseMinA && baseMinA > 0;
      const variablePA = cobraMinA ? 0 : (compPA - baseMinA);

      let compRA = 0, escalaRA = 0, tajadaA = 0;
      const poolRes = poolCab * poolImp * (poolRend / 100);
      if (mA.hasCol && !cobraMinA) {
        escalaRA = getScale(poolCab, 'provincial') * mA.regMult;
        tajadaA = Math.min(1, cabezas / Math.max(poolCab, 1));
        compRA = poolRes * escalaRA * tajadaA;
      }
      let compOA = 0, escalaOA = 0;
      if (mA.hasOfi && !cobraMinA) {
        escalaOA = getScale(poolDirCab, 'oficina');
        compOA = (poolDirCab * poolImp * (poolRend / 100) * escalaOA) / Math.max(agents.length, 1);
      }
      const brutoA = (cobraMinA ? baseMinA : baseMinA + variablePA) + compRA + compOA;

      // Calc for model B
      const mB = MODELOS.find(m => m.id === agent.modeloB) || MODELOS[3];
      const escalaPB = mB.id === 'corporate' ? 0 : getScale(cabezas, mB.esc);
      const compPB = mB.id === 'corporate' ? resultado * 0.04 : resultado * escalaPB;
      const cobraMinB = compPB < baseMinB && baseMinB > 0;
      const variablePB = cobraMinB ? 0 : (compPB - baseMinB);

      let compRB = 0, escalaRB = 0;
      if (mB.hasCol && !cobraMinB) {
        escalaRB = getScale(poolCab, 'provincial') * mB.regMult;
        compRB = poolRes * escalaRB * Math.min(1, cabezas / Math.max(poolCab, 1));
      }
      let compOB = 0;
      if (mB.hasOfi && !cobraMinB) {
        const eO = getScale(poolDirCab, 'oficina');
        compOB = (poolDirCab * poolImp * (poolRend / 100) * eO) / Math.max(agents.length, 1);
      }
      const brutoB = (cobraMinB ? baseMinB : baseMinB + variablePB) + compRB + compOB;

      return {
        agent, cabezas, resultado,
        resA: { escalaP: escalaPA, compP: compPA, cobraMin: cobraMinA, bruto: brutoA, isCorp: mA.id === 'corporate', modelo: mA },
        resB: { escalaP: escalaPB, compP: compPB, cobraMin: cobraMinB, bruto: brutoB, isCorp: mB.id === 'corporate', modelo: mB },
      };
    });
  }, [agents, poolCab, poolDirCab, impInv, rInv, impFa, rFa, impCr, rCr, impMa, rMa, poolImp, poolRend]);

  const totalA = teamResults.reduce((s, r) => s + r.resA.bruto, 0);
  const totalB = teamResults.reduce((s, r) => s + r.resB.bruto, 0);
  const bestTotal = Math.max(totalA, totalB);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-violet-600" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Equipo de Oficina — Comparación por Agente</h2>
            <p className="text-[10px] text-slate-400">Cargá una oficina real o armá tu equipo manualmente</p>
          </div>
          {officeLoaded && <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">📍 {officeLoaded}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Office selector + load */}
          <select value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)}
            className="bg-white border border-violet-200 rounded-lg px-2 py-1.5 text-xs font-bold text-violet-800 outline-none max-w-[180px]">
            {availableOffices.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <button onClick={loadOffice} disabled={loadingOffice}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loadingOffice ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {loadingOffice ? 'Cargando...' : 'Cargar'}
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="text-right">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Pool auto</p>
            <p className="text-sm font-black text-violet-700">{poolCab.toLocaleString('es-AR')} cab.</p>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block">Dir. Ofi.</label>
            <input type="number" value={poolDirCab} onChange={e => setPoolDirCab(Number(e.target.value))}
              className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-center" />
          </div>
          <button onClick={addAgent} className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
            <Plus size={12} /> Agente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-bold text-slate-500 uppercase text-[10px]">Agente</th>
              <th className="text-center px-2 py-2 font-bold text-slate-500 uppercase text-[10px]">Cab. Vta</th>
              <th className="text-center px-2 py-2 font-bold text-slate-500 uppercase text-[10px]">Cab. Cpa</th>
              <th className="text-center px-2 py-2 font-bold text-slate-500 uppercase text-[10px]">Categoría</th>
              <th className="text-center px-2 py-2 font-bold text-blue-600 uppercase text-[10px] bg-blue-50 border-x border-blue-100">Modelo A</th>
              <th className="text-right px-2 py-2 font-bold text-blue-600 uppercase text-[10px] bg-blue-50">Escala A</th>
              <th className="text-right px-3 py-2 font-bold text-blue-600 uppercase text-[10px] bg-blue-50 border-r border-blue-100">Sueldo A</th>
              <th className="text-center px-2 py-2 font-bold text-emerald-600 uppercase text-[10px] bg-emerald-50 border-l border-emerald-100">Modelo B</th>
              <th className="text-right px-2 py-2 font-bold text-emerald-600 uppercase text-[10px] bg-emerald-50">Escala B</th>
              <th className="text-right px-3 py-2 font-bold text-emerald-600 uppercase text-[10px] bg-emerald-50 border-r border-emerald-100">Sueldo B</th>
              <th className="text-right px-3 py-2 font-bold text-slate-500 uppercase text-[10px]">Δ (A−B)</th>
              <th className="px-2 py-2 text-[10px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamResults.map(({ agent, resA, resB }) => {
              const delta = resA.bruto - resB.bruto;
              return (
                <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <input type="text" value={agent.nombre} onChange={e => updateAgent(agent.id, { nombre: e.target.value })}
                      className="bg-transparent font-bold text-slate-800 outline-none w-full min-w-[100px] hover:bg-slate-50 rounded px-1 py-0.5 transition-colors"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="number" value={agent.cabV} onChange={e => updateAgent(agent.id, { cabV: Number(e.target.value) })}
                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="number" value={agent.cabC} onChange={e => updateAgent(agent.id, { cabC: Number(e.target.value) })}
                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <select value={agent.catId} onChange={e => updateAgent(agent.id, { catId: e.target.value })}
                      className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold w-full max-w-[90px]">
                      {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  {/* Model A */}
                  <td className="px-2 py-2 text-center bg-blue-50/30">
                    <select value={agent.modeloA} onChange={e => updateAgent(agent.id, { modeloA: e.target.value })}
                      className="bg-white border border-blue-200 rounded px-1 py-0.5 text-[10px] font-bold w-full max-w-[100px]">
                      {MODELOS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right bg-blue-50/30 font-mono font-bold text-blue-700">{resA.isCorp ? 'KAM' : fmtP(resA.escalaP)}</td>
                  <td className="px-3 py-2 text-right bg-blue-50/30 font-black text-blue-800">{fmt.format(resA.bruto)}</td>
                  {/* Model B */}
                  <td className="px-2 py-2 text-center bg-emerald-50/30">
                    <select value={agent.modeloB} onChange={e => updateAgent(agent.id, { modeloB: e.target.value })}
                      className="bg-white border border-emerald-200 rounded px-1 py-0.5 text-[10px] font-bold w-full max-w-[100px]">
                      {MODELOS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right bg-emerald-50/30 font-mono font-bold text-emerald-700">{resB.isCorp ? 'KAM' : fmtP(resB.escalaP)}</td>
                  <td className="px-3 py-2 text-right bg-emerald-50/30 font-black text-emerald-800">{fmt.format(resB.bruto)}</td>
                  {/* Delta: green=mejor, red=peor */}
                  <td className={`px-3 py-2 text-right font-black ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {delta > 0 ? `+${fmt.format(delta)}` : delta < 0 ? fmt.format(delta) : '—'}
                  </td>
                  <td className="px-2 py-2 flex items-center gap-1">
                    <button onClick={() => onSimulateAgent(agent)} title={`Simular ${agent.nombre} arriba`}
                      className="p-0.5 text-blue-400 hover:text-blue-700 transition-colors" style={{ cursor: 'pointer' }}>
                      <Scale size={12} />
                    </button>
                    {agents.length > 1 && (
                      <button onClick={() => removeAgent(agent.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><X size={12} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
            <tr className="font-black text-sm">
              <td className="px-3 py-3 text-slate-600 uppercase text-xs tracking-wider" colSpan={4}>Total Oficina ({agents.length} agentes · {poolCab.toLocaleString('es-AR')} cab.)</td>
              <td className="bg-blue-50/50 border-x border-blue-100" colSpan={2}></td>
              <td className={`px-3 py-3 text-right bg-blue-50/50 border-r border-blue-100 ${totalA >= totalB ? 'text-blue-800' : 'text-slate-500'}`}>
                {totalA >= totalB && '🏆 '}{fmt.format(totalA)}
              </td>
              <td className="bg-emerald-50/50 border-l border-emerald-100" colSpan={2}></td>
              <td className={`px-3 py-3 text-right bg-emerald-50/50 border-r border-emerald-100 ${totalB > totalA ? 'text-emerald-800' : 'text-slate-500'}`}>
                {totalB > totalA && '🏆 '}{fmt.format(totalB)}
              </td>
              <td className={`px-3 py-3 text-right ${totalA - totalB > 0 ? 'text-green-600' : totalA - totalB < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {totalA - totalB > 0 ? `+${fmt.format(totalA - totalB)}` : totalA - totalB < 0 ? fmt.format(totalA - totalB) : '—'}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
