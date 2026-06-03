import React, { useState, useMemo } from 'react';
import { BookOpen, TrendingUp, Truck, CreditCard, Users, Scale, ArrowLeft, ChevronRight, Info, Zap, Database, AlertTriangle, Percent, DollarSign, Target, Layers, Download, ExternalLink, FileText } from 'lucide-react';

/* ───────────────────────────────────────────────
   Explorador Interactivo de Modelos de Liquidación
   ─────────────────────────────────────────────── */

// ─── Escala logarítmica (replica calculator.ts getExactScale) ───
function calcScale(cabezasRaw: number, type: 'escalaAC' | 'escalaPersonal' | 'escalaProvincial' | 'escalaOficina'): number {
  let maxScale: number, minScale: number, maxCabezas: number;
  switch (type) {
    case 'escalaAC':         maxScale = 30; minScale = 15; maxCabezas = 4000; break;
    case 'escalaPersonal':   maxScale = 22; minScale = 14; maxCabezas = 6000; break;
    case 'escalaProvincial': maxScale = 10; minScale = 5;  maxCabezas = 15000; break;
    case 'escalaOficina':    maxScale = 20; minScale = 5;  maxCabezas = 2000; break;
  }
  const cabezas = Math.floor(cabezasRaw / 250) * 250;
  if (cabezas === 0) return maxScale / 100;
  if (cabezas >= maxCabezas) return minScale / 100;
  const log100 = Math.log10(100);
  const logMax = Math.log10(maxCabezas);
  const logCab = Math.log10(Math.max(cabezas, 1));
  let pct = minScale + (maxScale - minScale) * (1 - (logCab - log100) / (logMax - log100));
  if (pct > maxScale) pct = maxScale;
  if (pct < minScale) pct = minScale;
  return pct / 100;
}

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ─── Modelo: tipo de cada sección explicativa ───
interface ModelSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;          // tailwind accent
  bgColor: string;
  borderColor: string;
  shortDesc: string;
}

const MODELS: ModelSection[] = [
  { id: 'personal',   title: 'Componente Personal (Escalas)',        icon: <TrendingUp size={22} />,   color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',   shortDesc: 'La base de la comisión: cómo el volumen operado determina el % que se lleva cada agente.' },
  { id: 'topes',      title: 'Topes de Rendimiento',                icon: <AlertTriangle size={22} />, color: 'text-amber-600',  bgColor: 'bg-amber-50',  borderColor: 'border-amber-200',  shortDesc: 'Límites de rendimiento (%) que protegen al sistema de operaciones outlier.' },
  { id: 'reparto',    title: 'Reparto Venta / Compra (2/3 – 1/3)',  icon: <Scale size={22} />,        color: 'text-emerald-600',bgColor: 'bg-emerald-50',borderColor: 'border-emerald-200',shortDesc: 'Cómo se divide el resultado de cada operación entre el AC vendedor y el comprador.' },
  { id: 'regional',   title: 'Componente Regional (Bolsa)',         icon: <Users size={22} />,        color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', shortDesc: 'El premio colectivo: la oficina junta un resultado y se reparte entre los agentes.' },
  { id: 'movilidad',  title: 'Movilidad (KMS + Mendel)',            icon: <Truck size={22} />,        color: 'text-red-600',    bgColor: 'bg-red-50',    borderColor: 'border-red-200',    shortDesc: 'Reintegro por kilómetros recorridos, menos los gastos con la tarjeta corporativa Mendel.' },
  { id: 'cuentas',    title: 'Cuentas Especiales (Frutos / Acuña)', icon: <Target size={22} />,       color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', shortDesc: 'Excepciones de negocio: grandes cuentas que operan con mermas y porcentajes distintos.' },
  { id: 'minimo',     title: 'Mínimo Garantizado y Cierre',         icon: <DollarSign size={22} />,   color: 'text-teal-600',   bgColor: 'bg-teal-50',   borderColor: 'border-teal-200',   shortDesc: 'El sueldo fijo que absorbe la variable, y las reglas finales que definen cuánto se cobra.' },
  { id: 'retroactivo',title: 'Ajustes Retroactivos (M-1, M-2, M-3)',icon: <Layers size={22} />,       color: 'text-slate-600',  bgColor: 'bg-slate-50',  borderColor: 'border-slate-200',  shortDesc: 'Recalculamos los 3 meses anteriores y liquidamos la diferencia si Metabase cambió datos.' },
];

// ─── Simulador + Tabla de Escalas unificado ───
function SimPersonal() {
  const [modelo, setModelo] = useState<'escalaAC' | 'escalaPersonal' | 'escalaProvincial' | 'escalaOficina'>('escalaAC');
  const [cabezas, setCabezas] = useState(1500);
  const [resultado, setResultado] = useState(5000000);

  const modelos: Record<string, { label: string; desc: string; max: number; maxPct: number; minPct: number; step: number }> = {
    escalaAC:         { label: 'AC Simple',          desc: 'Asociado Comercial estándar (30% → 15%)',           max: 4000,  maxPct: 30, minPct: 15, step: 500 },
    escalaPersonal:   { label: 'Personal (Oficina)', desc: 'Agentes asignados a oficina (22% → 14%)',           max: 6000,  maxPct: 22, minPct: 14, step: 500 },
    escalaProvincial: { label: 'Provincial (Bolsa)', desc: 'Bolsa regional de la oficina (10% → 5%)',           max: 15000, maxPct: 10, minPct: 5,  step: 1000 },
    escalaOficina:    { label: 'Oficina',            desc: 'Operaciones directas de oficina (20% → 5%)',       max: 2000,  maxPct: 20, minPct: 5,  step: 250 },
  };

  const cfg = modelos[modelo];
  const escala = calcScale(cabezas, modelo);
  const comision = resultado * escala;

  const steps: number[] = [0];
  for (let i = cfg.step; i <= cfg.max; i += cfg.step) steps.push(i);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(modelos).map(([key, m]) => (
          <button key={key} onClick={() => { setModelo(key as any); if (cabezas > modelos[key as keyof typeof modelos].max) setCabezas(modelos[key as keyof typeof modelos].max); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modelo === key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >{m.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-4 flex flex-col">
          <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2"><Zap size={14} className="text-blue-500" /> Probalo vos mismo</h4>
          <p className="text-xs text-slate-500">{cfg.desc}</p>
          <div className="space-y-3 flex-grow">
            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Cabezas operadas</label>
              <input type="range" min={0} max={cfg.max} step={250} value={Math.min(cabezas, cfg.max)} onChange={e => setCabezas(+e.target.value)} className="w-full accent-blue-600" />
              <span className="text-lg font-black text-blue-900">{cabezas.toLocaleString('es-AR')}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Resultado total ($)</label>
              <input type="range" min={0} max={30000000} step={500000} value={resultado} onChange={e => setResultado(+e.target.value)} className="w-full accent-blue-600" />
              <span className="text-lg font-black text-blue-900">{fmt.format(resultado)}</span>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-semibold">Escala aplicada</span>
              <span className="text-xl font-black text-blue-600">{pct(escala)}</span>
            </div>
            <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${escala * 100}%` }} />
            </div>
            <p className="text-[10px] text-blue-400 text-right">del 100% del resultado</p>
            <div className="flex items-center justify-between pt-2 border-t border-blue-100">
              <span className="text-sm text-blue-700 font-semibold">Componente Personal</span>
              <span className="text-2xl font-black text-green-600">{fmt.format(comision)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-600">Tabla: {cfg.label}</p>
            <p className="text-[10px] text-slate-400">{cfg.maxPct}% con 0 cab. → {cfg.minPct}% con {cfg.max.toLocaleString('es-AR')}+ cab.</p>
          </div>
          <div className="overflow-y-auto max-h-[300px] flex-grow">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-1.5 font-bold text-slate-500">Cabezas</th>
                  <th className="text-right px-3 py-1.5 font-bold text-slate-500">Escala</th>
                  <th className="text-left px-3 py-1.5 font-bold text-slate-500">% del resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {steps.map(cab => {
                  const s = calcScale(cab, modelo);
                  const nearestStep = Math.floor(cabezas / cfg.step) * cfg.step;
                  const isActive = cab === nearestStep;
                  return (
                    <tr key={cab} className={`transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <td className={`px-3 py-1 font-mono text-slate-700 ${isActive ? 'font-black' : ''}`}>{cab.toLocaleString('es-AR')}</td>
                      <td className={`px-3 py-1 text-right font-mono font-black ${isActive ? 'text-blue-800' : 'text-blue-600'}`}>{(s * 100).toFixed(1)}%</td>
                      <td className="px-3 py-1">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isActive ? 'bg-blue-600' : 'bg-blue-300'}`} style={{ width: `${s * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini-Simulador de Topes ───
function SimTopes() {
  const [rinde, setRinde] = useState(4.0);
  const [tipo, setTipo] = useState<'INV' | 'FAENA'>('INV');
  const MAX = tipo === 'FAENA' ? 6 : 8;
  const MIN = tipo === 'FAENA' ? -2 : -4.5;
  const resultadoBase = 1000000;
  let ajustado = resultadoBase;
  if (rinde > MAX) ajustado = resultadoBase * (MAX / rinde);
  else if (rinde < MIN && rinde !== 0) ajustado = resultadoBase * (MIN / rinde);
  const wasCapped = rinde > MAX || rinde < MIN;
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 space-y-5">
      <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2"><Zap size={16} className="text-amber-500" /> Probalo vos mismo</h4>
      <div className="flex gap-3 mb-2">
        <button onClick={() => setTipo('INV')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tipo === 'INV' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-200'}`}>Invernada</button>
        <button onClick={() => setTipo('FAENA')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tipo === 'FAENA' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-200'}`}>Faena</button>
      </div>
      <div>
        <label className="block text-xs font-semibold text-amber-800 mb-1">Rendimiento (%)</label>
        <input type="range" min={-6} max={12} step={0.5} value={rinde} onChange={e => setRinde(+e.target.value)} className="w-full accent-amber-600" />
        <span className="text-xl font-black text-amber-900">{rinde.toFixed(1)}%</span>
        <span className="ml-3 text-xs text-amber-600">Tope: {MIN}% a {MAX}%</span>
      </div>
      <div className="bg-white/80 rounded-xl p-4 border border-amber-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div><span className="text-xs text-amber-700 font-semibold">Resultado base</span><br /><span className="text-lg font-bold text-amber-800">{fmt.format(resultadoBase)}</span></div>
          <div className="text-2xl text-amber-300">→</div>
          <div><span className="text-xs text-amber-700 font-semibold">Resultado ajustado</span><br /><span className={`text-lg font-bold ${wasCapped ? 'text-red-600' : 'text-green-600'}`}>{fmt.format(ajustado)}</span></div>
          {wasCapped && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">¡TOPEADO!</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Mini-Simulador de Reparto ───
function SimReparto() {
  const [resultado, setResultado] = useState(3000000);
  const [caso, setCaso] = useState<'normal' | 'doble' | 'sinAC'>('normal');
  let vendedor = 0, comprador = 0;
  if (caso === 'normal') { vendedor = resultado * (2/3); comprador = resultado * (1/3); }
  else if (caso === 'doble') { vendedor = resultado * (2/3); comprador = resultado * (1/3); }
  else { vendedor = 0; comprador = resultado * (1/3); }
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 space-y-5">
      <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2"><Zap size={16} className="text-emerald-500" /> Probalo vos mismo</h4>
      <div className="flex gap-2 flex-wrap mb-2">
        <button onClick={() => setCaso('normal')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${caso === 'normal' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200'}`}>AC Venta ≠ AC Compra</button>
        <button onClick={() => setCaso('doble')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${caso === 'doble' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200'}`}>Doble Punta (mismo AC)</button>
        <button onClick={() => setCaso('sinAC')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${caso === 'sinAC' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200'}`}>Sin AC Venta (Soc. Propia)</button>
      </div>
      <div>
        <label className="block text-xs font-semibold text-emerald-800 mb-1">Resultado total de la operación ($)</label>
        <input type="range" min={0} max={10000000} step={250000} value={resultado} onChange={e => setResultado(+e.target.value)} className="w-full accent-emerald-600" />
        <span className="text-xl font-black text-emerald-900">{fmt.format(resultado)}</span>
      </div>
      <div className="bg-white/80 rounded-xl p-4 border border-emerald-100 grid grid-cols-2 gap-4">
        <div className="text-center">
          <span className="text-xs text-emerald-700 font-semibold block mb-1">AC Vendedor (⅔)</span>
          <span className={`text-2xl font-black ${vendedor > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>{fmt.format(vendedor)}</span>
          {caso === 'sinAC' && <p className="text-[10px] text-gray-400 mt-1">No hay AC de venta → 0</p>}
          {caso === 'doble' && <p className="text-[10px] text-emerald-500 mt-1">Mismo agente, suma todo</p>}
        </div>
        <div className="text-center">
          <span className="text-xs text-emerald-700 font-semibold block mb-1">AC Comprador (⅓)</span>
          <span className="text-2xl font-black text-emerald-700">{fmt.format(comprador)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini-Simulador Regional ───
function SimRegional() {
  const [cabezasReg, setCabezasReg] = useState(5000);
  const [resultadoReg, setResultadoReg] = useState(20000000);
  const [agentes, setAgentes] = useState(5);
  const [socPropias, setSocPropias] = useState(3);
  const [totalSocOficina, setTotalSocOficina] = useState(12);
  const [esBsAs, setEsBsAs] = useState(false);
  let bolsa = calcScale(cabezasReg, 'escalaProvincial');
  if (esBsAs) bolsa = bolsa / 2;
  const tajada = totalSocOficina > 0 ? socPropias / totalSocOficina : 0;
  const premio = tajada * bolsa * resultadoReg;
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6 space-y-5">
      <h4 className="font-bold text-violet-900 text-sm flex items-center gap-2"><Zap size={16} className="text-violet-500" /> Probalo vos mismo</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-violet-800 mb-1">Cabezas de la oficina</label>
          <input type="range" min={0} max={20000} step={500} value={cabezasReg} onChange={e => setCabezasReg(+e.target.value)} className="w-full accent-violet-600" />
          <span className="font-bold text-violet-900">{cabezasReg.toLocaleString('es-AR')}</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-800 mb-1">Resultado total oficina ($)</label>
          <input type="range" min={0} max={80000000} step={1000000} value={resultadoReg} onChange={e => setResultadoReg(+e.target.value)} className="w-full accent-violet-600" />
          <span className="font-bold text-violet-900">{fmt.format(resultadoReg)}</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-800 mb-1">Soc. propias del agente</label>
          <input type="range" min={0} max={15} step={1} value={socPropias} onChange={e => setSocPropias(+e.target.value)} className="w-full accent-violet-600" />
          <span className="font-bold text-violet-900">{socPropias} / {totalSocOficina} totales</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-violet-800 cursor-pointer">
        <input type="checkbox" checked={esBsAs} onChange={e => setEsBsAs(e.target.checked)} className="accent-violet-600 w-4 h-4" />
        <span className="font-semibold">¿Es Buenos Aires? (bolsa ÷ 2)</span>
      </label>
      <div className="bg-white/80 rounded-xl p-4 border border-violet-100 flex flex-wrap items-center justify-between gap-3">
        <div><span className="text-xs text-violet-700 font-semibold">Bolsa</span><br /><span className="text-lg font-black text-violet-600">{pct(bolsa)}</span></div>
        <div className="text-2xl text-violet-300">×</div>
        <div><span className="text-xs text-violet-700 font-semibold">Tajada</span><br /><span className="text-lg font-black text-violet-600">{pct(tajada)}</span></div>
        <div className="text-2xl text-violet-300">×</div>
        <div><span className="text-xs text-violet-700 font-semibold">Resultado oficina</span><br /><span className="text-lg font-black text-violet-600">{fmt.format(resultadoReg)}</span></div>
        <div className="text-2xl text-violet-300">=</div>
        <div><span className="text-xs text-violet-700 font-semibold">Premio Regional</span><br /><span className="text-2xl font-black text-green-600">{fmt.format(premio)}</span></div>
      </div>
    </div>
  );
}

// ─── Mini-Simulador Movilidad ───
function SimMovilidad() {
  const [kms, setKms] = useState(3000);
  const [tipoAuto, setTipoAuto] = useState<'auto' | 'suv' | 'camioneta'>('auto');
  const [gastosMendel, setGastosMendel] = useState(80000);
  const [tieneEmpresa, setTieneEmpresa] = useState(false);
  const precios: Record<string, number> = { auto: 562, suv: 650, camioneta: 730 };
  const precio = precios[tipoAuto];
  const reintegroBruto = tieneEmpresa ? 0 : kms * precio;
  const reintegroNeto = Math.max(0, reintegroBruto - gastosMendel);
  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 space-y-5">
      <h4 className="font-bold text-red-900 text-sm flex items-center gap-2"><Zap size={16} className="text-red-500" /> Probalo vos mismo</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-red-800 mb-1">KMS declarados</label>
          <input type="range" min={0} max={8000} step={100} value={kms} onChange={e => setKms(+e.target.value)} className="w-full accent-red-600" />
          <span className="font-bold text-red-900">{kms.toLocaleString('es-AR')} km</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-red-800 mb-1">Tipo vehículo</label>
          <div className="flex gap-1 mt-1">
            {(['auto', 'suv', 'camioneta'] as const).map(t => (
              <button key={t} onClick={() => setTipoAuto(t)} className={`px-2 py-1 rounded text-xs font-bold capitalize ${tipoAuto === t ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-200'}`}>{t}</button>
            ))}
          </div>
          <span className="text-xs text-red-600 mt-1 block">{fmt.format(precio)}/km</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-red-800 mb-1">Gastos Mendel ($)</label>
          <input type="range" min={0} max={500000} step={10000} value={gastosMendel} onChange={e => setGastosMendel(+e.target.value)} className="w-full accent-red-600" />
          <span className="font-bold text-red-900">{fmt.format(gastosMendel)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-red-800 cursor-pointer">
        <input type="checkbox" checked={tieneEmpresa} onChange={e => setTieneEmpresa(e.target.checked)} className="accent-red-600 w-4 h-4" />
        <span className="font-semibold">¿Tiene vehículo de empresa? (no cobra reintegro)</span>
      </label>
      <div className="bg-white/80 rounded-xl p-4 border border-red-100 flex flex-wrap items-center gap-6">
        <div><span className="text-xs text-red-700 font-semibold">Reintegro total</span><br /><span className={`text-lg font-black ${tieneEmpresa ? 'text-gray-300 line-through' : 'text-red-700'}`}>{fmt.format(reintegroBruto)}</span></div>
        <div className="text-2xl text-red-300">−</div>
        <div><span className="text-xs text-red-700 font-semibold">Mendel</span><br /><span className="text-lg font-black text-red-700">{fmt.format(gastosMendel)}</span></div>
        <div className="text-2xl text-red-300">=</div>
        <div><span className="text-xs text-red-700 font-semibold">Reintegro Neto</span><br /><span className="text-2xl font-black text-green-600">{fmt.format(reintegroNeto)}</span></div>
      </div>
    </div>
  );
}

// ─── Mini-Simulador Mínimo Garantizado ───
function SimMinimo() {
  const [minimo, setMinimo] = useState(950000);
  const [componenteP, setComponenteP] = useState(1200000);
  const [componenteR, setComponenteR] = useState(350000);
  const superaMinimo = componenteP >= minimo;
  const variablePersonal = superaMinimo ? componenteP - minimo : 0;
  const regionalFinal = superaMinimo ? componenteR : 0;
  const cierre = minimo + variablePersonal + regionalFinal;
  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6 space-y-5">
      <h4 className="font-bold text-teal-900 text-sm flex items-center gap-2"><Zap size={16} className="text-teal-500" /> Probalo vos mismo</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-teal-800 mb-1">Mínimo garantizado ($)</label>
          <input type="range" min={0} max={3000000} step={50000} value={minimo} onChange={e => setMinimo(+e.target.value)} className="w-full accent-teal-600" />
          <span className="font-bold text-teal-900">{fmt.format(minimo)}</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-teal-800 mb-1">Componente Personal ($)</label>
          <input type="range" min={0} max={5000000} step={50000} value={componenteP} onChange={e => setComponenteP(+e.target.value)} className="w-full accent-teal-600" />
          <span className="font-bold text-teal-900">{fmt.format(componenteP)}</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-teal-800 mb-1">Componente Regional ($)</label>
          <input type="range" min={0} max={2000000} step={50000} value={componenteR} onChange={e => setComponenteR(+e.target.value)} className="w-full accent-teal-600" />
          <span className="font-bold text-teal-900">{fmt.format(componenteR)}</span>
        </div>
      </div>
      <div className={`rounded-xl p-4 border ${superaMinimo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <p className={`text-sm font-bold ${superaMinimo ? 'text-green-800' : 'text-red-800'}`}>
          {superaMinimo
            ? `✅ Superó el mínimo → Cobra el fijo (${fmt.format(minimo)}) + excedente personal (${fmt.format(variablePersonal)}) + regional (${fmt.format(regionalFinal)})`
            : `❌ No llega al mínimo → Cobra solo el fijo (${fmt.format(minimo)}). Pierde el premio regional.`
          }
        </p>
        <p className="text-2xl font-black text-slate-800 mt-2">Cierre: {fmt.format(cierre)}</p>
      </div>
    </div>
  );
}

// ─── Tabla de Mínimos por Categoría ───
function TablaMinimos() {
  // These are the category labels + reference values from ESCALAS RAC AC
  const categories = [
    { cat: 1, label: 'Top AC',         desc: 'Asociados comerciales senior con máximo histórico', color: 'bg-yellow-400' },
    { cat: 2, label: 'Corporate',       desc: 'Corporate KAM o cuentas estratégicas',             color: 'bg-blue-400' },
    { cat: 3, label: 'General',         desc: 'Categoría estándar de la red comercial',            color: 'bg-green-400' },
    { cat: 4, label: 'Acuerdo',         desc: 'Agentes con acuerdo especial negociado',            color: 'bg-purple-400' },
    { cat: 5, label: 'Híbrido',         desc: 'City Managers con modelo mixto (ej: Saparrat)',     color: 'bg-orange-400' },
    { cat: 6, label: 'Sin Mínimo',      desc: 'Sin mínimo garantizado, cobran 100% variable',      color: 'bg-gray-300' },
    { cat: 7, label: 'Operario Carga 1',desc: 'Operarios de carga nivel 1',                        color: 'bg-slate-400' },
    { cat: 8, label: 'Operario Carga 2',desc: 'Operarios de carga nivel 2',                        color: 'bg-slate-400' },
    { cat: 9, label: 'Operario Carga 3',desc: 'Operarios de carga nivel 3',                        color: 'bg-slate-400' },
    { cat: 10,label: 'Operario Carga 4',desc: 'Operarios de carga nivel 4',                        color: 'bg-slate-400' },
  ];
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><DollarSign size={14} className="text-teal-500" /> Categorías y Mínimos Garantizados</h4>
      <p className="text-xs text-slate-500">Los valores exactos se leen del Google Sheet "ESCALAS RAC AC" al momento de calcular. Abajo se muestra la estructura de categorías.</p>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-600">Cat.</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-600">Nombre</th>
              <th className="text-left px-4 py-2 text-xs font-bold text-slate-600">Descripción</th>
              <th className="text-center px-4 py-2 text-xs font-bold text-slate-600">Regional</th>
              <th className="text-center px-4 py-2 text-xs font-bold text-slate-600">Oficina</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map(c => {
              const sinMinimo = c.cat === 6;
              const esOperario = c.cat >= 7;
              const esHibrido = c.cat === 5;
              const tieneRegional = !sinMinimo && !esHibrido;
              const tieneOficina = !sinMinimo && !esOperario && !esHibrido;
              return (
                <tr key={c.cat} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2"><div className={`w-6 h-6 rounded-full ${c.color} flex items-center justify-center text-white text-xs font-black`}>{c.cat}</div></td>
                  <td className="px-4 py-2 font-bold text-slate-800">{c.label}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{c.desc}</td>
                  <td className="px-4 py-2 text-center">{tieneRegional ? <span className="text-green-600 font-bold">✓</span> : (esOperario ? <span className="text-blue-600 text-xs font-semibold">10% fijo</span> : <span className="text-red-400">✗</span>)}</td>
                  <td className="px-4 py-2 text-center">{tieneOficina ? <span className="text-green-600 font-bold">✓</span> : <span className="text-red-400">✗</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-800">
        <p><strong>💡 Regla clave:</strong> Si el Componente Personal no supera el mínimo de su categoría, el agente cobra solo el fijo y <strong>pierde</strong> los premios Regional y Oficina (excepto David Menghi que los mantiene por acuerdo especial).</p>
      </div>
    </div>
  );
}

// ─── Contenido de cada modelo (explicación + simulador + fuente de datos) ───
function ModelContent({ id }: { id: string }) {
  switch (id) {
    case 'personal': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">El motor suma todas las <strong>cabezas operadas</strong> por el agente en el mes (venta + compra sin duplicar en doble punta). Con ese número busca en una <strong>escala logarítmica</strong> qué porcentaje le corresponde. Luego multiplica ese % por el <strong>resultado total ajustado</strong> (la plata que generaron sus operaciones después de aplicar topes).</p>
          <p className="text-slate-600">A más cabezas, baja el %. Pero como el resultado absoluto sube, el agente siempre gana más vendiendo más.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-blue-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Cabezas</span><span className="text-slate-500">Metabase → campo <code>Cabezas</code> o <code>cantidad</code></span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Resultado</span><span className="text-slate-500">Metabase → <code>resultado_final</code> (ajustado por topes)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Escala</span><span className="text-slate-500">Fórmula logarítmica interna: 30% → 15% (0 a 4.000 cab.)</span></div>
          </div>
        </div>
        <SimPersonal />
      </div>
    );

    case 'topes': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Antes de asignarle el resultado a un agente, el motor verifica si el <strong>rendimiento</strong> (%) de la operación está dentro de los límites. Si el rinde supera el tope máximo o está por debajo del mínimo, el resultado se <strong>recalcula proporcionalmente</strong> para que no explote ni genere pérdidas enormes.</p>
          <ul className="text-slate-600 text-sm">
            <li><strong>Invernada:</strong> Tope entre -4.5% y 8%</li>
            <li><strong>Faena:</strong> Tope entre -2% y 6%</li>
          </ul>
          <p className="text-slate-600">Si una operación rindió 12% (y el tope es 8%), el resultado se multiplica por 8/12 = 0.667.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-amber-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Rendimiento</span><span className="text-slate-500">Metabase → campo <code>rendimiento</code> (ya viene como %)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Tipo de operación</span><span className="text-slate-500">Metabase → <code>Tipo</code> (INVERNADA, FAENA, CRIA, MAG)</span></div>
          </div>
        </div>
        <SimTopes />
      </div>
    );

    case 'reparto': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Cada operación en Metabase tiene un <strong>AC Venta</strong> y un <strong>AC Compra</strong>. El resultado total de la operación se divide:</p>
          <ul className="text-slate-600 text-sm">
            <li><strong>⅔ al AC vendedor</strong> (el que consiguió la venta)</li>
            <li><strong>⅓ al AC comprador</strong> (el que trajo al comprador)</li>
          </ul>
          <p className="text-slate-600">Si no hay AC de venta (sociedad propia), solo el comprador recibe su ⅓. Si es <strong>doble punta</strong> (mismo agente en venta y compra), el agente se lleva ⅔ + ⅓ = 100%.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-emerald-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">AC Venta</span><span className="text-slate-500">Metabase → <code>AC_Vend</code> / <code>asociado_comercial_id_vend</code></span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">AC Compra</span><span className="text-slate-500">Metabase → <code>AC_Comp</code> / <code>asociado_comercial_id_comp</code></span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Resolución</span><span className="text-slate-500">Prioridad: 1) Legajo, 2) Sociedad, 3) Representante</span></div>
          </div>
        </div>
        <SimReparto />
      </div>
    );

    case 'regional': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Todas las operaciones de los agentes de una misma <strong>oficina</strong> se agrupan. Se calcula el resultado total de la oficina y se le aplica una <strong>escala provincial</strong> (10% → 5%, logarítmica sobre cabezas totales). Eso genera la "bolsa".</p>
          <p className="text-slate-600">Cada agente recibe una "tajada" de la bolsa proporcional a la cantidad de <strong>sociedades únicas</strong> que operó respecto al total de la oficina.</p>
          <ul className="text-slate-600 text-sm">
            <li><strong>Buenos Aires:</strong> La bolsa se divide por 2 (porque hay muchas más operaciones).</li>
            <li><strong>Operarios:</strong> Reciben un 10% fijo de su propia ganancia como regional.</li>
            <li><strong>Sin mínimo / Simple / Cuentas Especiales:</strong> No participan del premio regional.</li>
          </ul>
        </div>
        <SimRegional />
      </div>
    );

    case 'movilidad': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">El sistema calcula un <strong>reintegro por kilómetros</strong> recorridos multiplicando los KMS declarados por el precio por KM de su tipo de vehículo (auto, SUV o camioneta).</p>
          <p className="text-slate-600">A ese reintegro se le <strong>restan los gastos realizados con la tarjeta corporativa Mendel</strong> (nafta, peajes, etc.) para llegar al reintegro neto.</p>
          <ul className="text-slate-600 text-sm">
            <li><strong>KMS:</strong> Se cargan desde el Google Sheet "Kms & $".</li>
            <li><strong>Mendel:</strong> Se sincroniza automáticamente desde el Google Sheet "Base Mendel".</li>
            <li>Si el agente tiene <strong>vehículo de empresa</strong> o <strong>amortización DCAC</strong>, el reintegro es $0.</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-red-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">KMS</span><span className="text-slate-500">Google Sheet → Pestaña <code>Kms & $</code></span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Precios por KM</span><span className="text-slate-500">Google Sheet → <code>Kms & $</code> (fila superior)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Gastos Mendel</span><span className="text-slate-500">Google Sheet → <code>Base Mendel</code> (confirmadas)</span></div>
          </div>
        </div>
        <SimMovilidad />
      </div>
    );

    case 'cuentas': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Las <strong>Cuentas Especiales</strong> son excepciones al modelo estándar. Actualmente hay dos tipos:</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-3">
            <h5 className="font-bold text-orange-800 mb-2">🏢 Acuña (Merma fija)</h5>
            <p className="text-sm text-orange-700">Se lleva un <strong>30% del resultado</strong> de cada operación que involucre sus sociedades, sin importar quién sea el AC asignado en Metabase. Se puede configurar un % diferente por sociedad desde la pantalla de Cuentas Especiales.</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-3">
            <h5 className="font-bold text-orange-800 mb-2">👑 Frutos (Grandes Cuentas)</h5>
            <p className="text-sm text-orange-700">Tiene porcentajes diferenciados según el tipo de operación y cuenta:</p>
            <ul className="text-sm text-orange-600 mt-1">
              <li><strong>GC estándar:</strong> 4% venta, 2% compra</li>
              <li><strong>Mermas Invernada:</strong> 15%</li>
              <li><strong>Mermas Faena:</strong> 20%</li>
              <li><strong>Activación CI:</strong> 10%</li>
            </ul>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-orange-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Sociedades</span><span className="text-slate-500">Archivo local → <code>cuentas.json</code> (razón social, CUIT, AC Metabase)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Matching</span><span className="text-slate-500">Se cruza por razón social, CUIT o AC de Metabase contra cada operación de Q95</span></div>
          </div>
        </div>
      </div>
    );

    case 'minimo': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Cada agente tiene un <strong>mínimo garantizado</strong> según su categoría (1 a 10). El fijo "absorbe" a la componente personal:</p>
          <ul className="text-slate-600 text-sm">
            <li>Si la <strong>componente personal &gt; mínimo</strong>: cobra el fijo + el excedente + regional + oficina.</li>
            <li>Si la <strong>componente personal &lt; mínimo</strong>: cobra solo el fijo. <strong>Pierde los premios regional y oficina.</strong></li>
          </ul>
          <p className="text-slate-600">Excepción: los agentes "Sin mínimo" (categoría 6) no tienen fijo y cobran todo como variable.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-teal-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Categoría</span><span className="text-slate-500">Roster (Google Sheet) → campo <code>Categoría</code> (1=Top AC, 2=Corp, etc.)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Valores mínimos</span><span className="text-slate-500">Google Sheet → Pestaña <code>ESCALAS RAC AC</code></span></div>
          </div>
        </div>
        <TablaMinimos />
        <SimMinimo />
      </div>
    );

    case 'retroactivo': return (
      <div className="space-y-6">
        <div className="prose prose-sm max-w-none">
          <h4 className="text-base font-bold text-slate-800">¿Qué calcula?</h4>
          <p className="text-slate-600">Metabase actualiza datos retroactivamente (operaciones que se cierran tarde, correcciones de sociedades, cambios de AC). Por eso, cada vez que se genera un cierre, el motor <strong>recalcula dinámicamente los 3 meses anteriores</strong> (M-1, M-2, M-3) y compara contra lo que realmente se le pagó al agente.</p>
          <ul className="text-slate-600 text-sm">
            <li>Si el recálculo da más → se genera un <strong>ajuste positivo</strong> (se le debe plata).</li>
            <li>Si el recálculo da menos → se genera un <strong>ajuste negativo</strong> (se le pagó de más).</li>
          </ul>
          <p className="text-slate-600">Los ajustes se suman como campos <code>cierreMesM1</code>, <code>cierreMesM2</code>, <code>cierreMesM3</code> en la liquidación final.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database size={14} className="text-slate-500" /> ¿De dónde saca los datos?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Histórico</span><span className="text-slate-500">Google Sheet → Pestaña <code>Historico</code> (lo que se pagó efectivamente)</span></div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs"><span className="font-bold text-slate-700 block">Recálculo</span><span className="text-slate-500">Se vuelve a correr <code>calculateDynamicMonth()</code> para cada mes pasado</span></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-2xl p-6">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3"><Info size={16} className="text-slate-500" /> Ejemplo práctico</h4>
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-sm text-slate-600 space-y-2">
            <p>📅 Estamos en <strong>Mayo 2026</strong>. Se genera el cierre.</p>
            <p>🔄 El motor recalcula <strong>Abril</strong>, <strong>Marzo</strong> y <strong>Febrero</strong> con los datos actuales de Metabase.</p>
            <p>📊 Detecta que en Marzo, Juan Pérez ahora tiene una operación nueva que antes no existía → <strong>+$180.000</strong>.</p>
            <p>💰 Ese ajuste se agrega como <code>cierreMesM2 = +180.000</code> en la liquidación de Mayo.</p>
          </div>
        </div>
      </div>
    );

    default: return <p className="text-slate-500">Seleccioná un modelo del menú.</p>;
  }
}

// ─── Componente Principal ───
interface ModelsGuideProps {
  setActiveTab: (tab: any) => void;
  API_URL: string;
}

export default function ModelsGuide({ setActiveTab, API_URL }: ModelsGuideProps) {
  const [activeModel, setActiveModel] = useState<string>(MODELS[0].id);
  const [activeSubTab, setActiveSubTab] = useState<'descargas' | 'explorador'>('descargas');
  const currentModel = MODELS.find(m => m.id === activeModel)!;

  const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;

  const MANUALS = [
    {
      id: 'comercial',
      title: 'Manual Ejecutivo Comercial',
      desc: 'Guía práctica orientada a asociados comerciales sobre las condiciones de liquidación, comisiones, KMS y movilidad.',
      file: 'Manual_Ejecutivo_Comercial.pdf',
      size: '1.4 MB',
      type: 'PDF',
      badge: 'Guía de Agente',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60',
      accentColor: 'from-amber-500 to-orange-600',
    },
    {
      id: 'webapp',
      title: 'Manual de la Aplicación Web',
      desc: 'Explicación completa de las pantallas, simulador, regresiones OLS, validador de desvíos y ajustes retroactivos.',
      file: 'Manual_Aplicacion_Web.pdf',
      size: '500 KB',
      type: 'PDF',
      badge: 'Manual de Usuario',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      accentColor: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => setActiveTab('hub')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-semibold mb-4 transition-colors">
          <ArrowLeft size={16} /> Volver al Hub
        </button>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">Manuales y Documentación</h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">Descargá las guías operativas o explorá las fórmulas del motor interactivamente.</p>
            </div>
          </div>

          {/* Sub-tabs segmentados estilo iOS */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200/40 relative z-10 shrink-0">
            <button
              onClick={() => setActiveSubTab('descargas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'descargas'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Manuales y Descargas
            </button>
            <button
              onClick={() => setActiveSubTab('explorador')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'explorador'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Explorador de Fórmulas
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'descargas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MANUALS.map(manual => (
            <div
              key={manual.id}
              className="bg-white rounded-2xl border border-slate-200/60 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group"
            >
              {/* Header de la tarjeta con gradiente */}
              <div className={`h-2 bg-gradient-to-r ${manual.accentColor}`} />
              
              <div className="p-6 flex-grow flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${manual.badgeColor}`}>
                      {manual.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                      {manual.type} • {manual.size}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {manual.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {manual.desc}
                  </p>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <a
                    href={`${baseUrl}/docs/${manual.file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center"
                  >
                    <ExternalLink size={14} /> Ver Documento
                  </a>
                  <a
                    href={`${baseUrl}/docs/${manual.file}`}
                    download={manual.file}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-xl text-xs font-bold transition-all"
                    title="Descargar directamente"
                  >
                    <Download size={14} /> Descargar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Layout: sidebar + content */
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Sidebar */}
          <nav className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelos de Liquidación</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActiveModel(m.id)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-all hover:bg-slate-50 ${
                      activeModel === m.id ? `${m.bgColor} ${m.borderColor} border-l-4` : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`mt-0.5 ${activeModel === m.id ? m.color : 'text-slate-400'}`}>{m.icon}</div>
                    <div>
                      <span className={`text-sm font-bold block ${activeModel === m.id ? 'text-slate-900' : 'text-slate-700'}`}>{m.title}</span>
                      <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{m.shortDesc.substring(0, 70)}...</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className={`p-2.5 rounded-xl ${currentModel.bgColor} ${currentModel.color}`}>{currentModel.icon}</div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">{currentModel.title}</h2>
                  <p className="text-sm text-slate-500">{currentModel.shortDesc}</p>
                </div>
              </div>
              <ModelContent id={activeModel} />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
