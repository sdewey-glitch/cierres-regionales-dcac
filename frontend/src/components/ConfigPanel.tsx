import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, TrendingUp, Target, Plus, Save, Trash2,
  Edit2, X, Check, AlertTriangle, Loader2, Copy as CopyIcon,
  Wand2, Info, Calculator
} from 'lucide-react';
import { fmt } from '../constants';

/* ─────────────────── Types ─────────────────── */

interface ConfigPanelProps {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
}

interface MinimoRow {
  id?: number;
  idCategoria: string;
  nombreCategoria: string;
  año: number;
  mes: number;
  añoMes?: string;
  sueldoMinimo: number;
  topeExtra: number;
}

interface EscalaRow {
  id?: number;
  tipoEscala: string;
  año: number;
  mes: number;
  añoMes?: string;
  minimoPct: number;
  maximoPct: number;
  topeCabezas: number;
}

interface TajadaRow {
  id?: number;
  año: number;
  mes: number;
  añoMes?: string;
  oficina: string;
  provincia?: string;
  modalidad?: string;
  comercial: string;
  sociedadesOperadas?: string;
  sociedadesOficina?: string;
  pctTajada: number;
}

type SubTab = 'minimos' | 'escalas' | 'tajada' | 'modelos' | 'ajustes';

/* ─────────────────── Constants ─────────────────── */

const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: 'minimos', label: 'Mínimos', icon: Shield },
  { key: 'escalas', label: 'Escalas', icon: TrendingUp },
  { key: 'tajada', label: 'Tajada', icon: Target },
  { key: 'modelos', label: 'Modelos y Fórmulas', icon: Settings },
  { key: 'ajustes', label: 'Ajustes Manuales & Retro', icon: Calculator },
];

const ESCALA_OPTIONS = [
  { value: 'escalaPersonal', label: 'Escala Personal' },
  { value: 'escalaProvincial', label: 'Escala Provincial' },
  { value: 'escalaOficina', label: 'Escala Oficina' },
  { value: 'escalaAC', label: 'Escala AC' },
];

const pctDisplay = (v: number) => Number(v).toFixed(2);
const toAñoMes = (año: number, mes: number) => `${año}${String(mes).padStart(2, '0')}`;
// Show empty for 0 so user doesn't get stuck with leading zero
const numVal = (v: number) => v === 0 ? '' : v;

/* ─────────────────── Shared sub-components ─────────────────── */

const inputClass =
  'w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';
const thClass =
  'py-2.5 px-4 text-left text-[9px] font-extrabold text-slate-400 uppercase tracking-wider';
const tdClass = 'py-2.5 px-4 text-xs text-slate-700';

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold ${
        type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200'
      }`}
    >
      {type === 'success' ? '✅' : '❌'} {message}
    </motion.div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-xs font-semibold">Cargando datos…</span>
    </div>
  );
}

function IconBtn({
  onClick,
  icon: Icon,
  color = 'text-slate-400 hover:text-slate-600',
  title,
}: {
  onClick: () => void;
  icon: React.ElementType;
  color?: string;
  title?: string;
}) {
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${color}`}>
      <Icon size={14} />
    </button>
  );
}

/* ─────────────────── Hook: useCrud ─────────────────── */

function useCrud<T extends { id?: number }>(
  baseUrl: string,
  año: string,
  mes: string,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: T[] = await res.json();
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const create = async (body: Partial<T>) => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Error al crear');
    showToast('Guardado', 'success');
    await fetchRows();
  };

  const update = async (id: number, body: Partial<T>) => {
    const res = await fetch(`${baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Error al actualizar');
    showToast('Guardado', 'success');
    await fetchRows();
  };

  const remove = async (id: number) => {
    const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar');
    showToast('Eliminado', 'success');
    await fetchRows();
  };

  // Period-filtered view
  const filtered = rows.filter(
    (r: any) => String(r.año) === año && String(r.mes) === mes,
  );

  return { rows, filtered, loading, error, toast, create, update, remove, showToast, fetchRows };
}

/* ═══════════════════════════════════════════════════════════
   TAB: MÍNIMOS
   ═══════════════════════════════════════════════════════════ */

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function MinimosTab({ API_URL, activeYear, activeMonth }: ConfigPanelProps) {
  const { rows, filtered, loading, error, toast, create, update, remove, showToast, fetchRows } =
    useCrud<MinimoRow>(`${API_URL}/config/minimos`, activeYear, activeMonth);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(false);
  const blank: MinimoRow = { idCategoria: '', nombreCategoria: '', año: +activeYear, mes: +activeMonth, sueldoMinimo: 0, topeExtra: 0 };
  const [form, setForm] = useState<MinimoRow>(blank);

  // Clone state
  const [cloneMode, setCloneMode] = useState(false);
  const [cloneSourceMonth, setCloneSourceMonth] = useState(+activeMonth);
  const [cloneSourceYear, setCloneSourceYear] = useState(+activeYear);
  const [cloneTargetMonths, setCloneTargetMonths] = useState<number[]>([]);
  const [cloneAdjustPct, setCloneAdjustPct] = useState(0);
  const [cloning, setCloning] = useState(false);

  const handleSave = async () => {
    try {
      const body = { ...form, añoMes: toAñoMes(form.año, form.mes) };
      if (editingId != null) {
        await update(editingId, body);
        setEditingId(null);
      } else {
        await create(body);
        setAddMode(false);
      }
      setForm(blank);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const startEdit = (row: MinimoRow) => {
    setEditingId(row.id!);
    setForm({ ...row });
    setAddMode(false);
  };

  const cancel = () => { setEditingId(null); setAddMode(false); setForm(blank); };

  // Clone logic
  const sourceRows = rows.filter(r => r.año === cloneSourceYear && r.mes === cloneSourceMonth);

  const toggleTargetMonth = (m: number) => {
    setCloneTargetMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleClone = async () => {
    if (sourceRows.length === 0) return showToast('No hay datos en el período origen', 'error');
    if (cloneTargetMonths.length === 0) return showToast('Seleccioná al menos un mes destino', 'error');

    const multiplier = 1 + cloneAdjustPct / 100;
    const bulkRows: any[] = [];
    for (const targetMonth of cloneTargetMonths) {
      // Check if target already has data
      const existing = rows.filter(r => r.año === cloneSourceYear && r.mes === targetMonth);
      if (existing.length > 0) {
        if (!window.confirm(`El mes ${MONTH_NAMES[targetMonth - 1]} ${cloneSourceYear} ya tiene ${existing.length} registros. ¿Agregar igual? (Se duplicarán)`)) {
          continue;
        }
      }
      for (const src of sourceRows) {
        bulkRows.push({
          idCategoria: src.idCategoria,
          nombreCategoria: src.nombreCategoria,
          año: cloneSourceYear,
          mes: targetMonth,
          sueldoMinimo: Math.round(src.sueldoMinimo * multiplier),
          topeExtra: Math.round(src.topeExtra * multiplier),
        });
      }
    }

    if (bulkRows.length === 0) return;

    setCloning(true);
    try {
      const res = await fetch(`${API_URL}/config/minimos/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: bulkRows }),
      });
      if (!res.ok) throw new Error('Error al clonar');
      showToast(`✅ ${bulkRows.length} registros creados`, 'success');
      setCloneMode(false);
      setCloneTargetMonths([]);
      setCloneAdjustPct(0);
      await fetchRows();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setCloning(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="flex items-center gap-2 p-6 text-xs text-red-600 font-semibold"><AlertTriangle size={14} /> {error}</div>;

  const isEditing = (id?: number) => editingId === id;

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {filtered.length} registro{filtered.length !== 1 && 's'}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => { setCloneMode(!cloneMode); setAddMode(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              cloneMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}>
            <CopyIcon size={14} /> Clonar a Meses
          </button>
          {!addMode && (
            <button onClick={() => { setAddMode(true); setForm({ ...blank }); setEditingId(null); setCloneMode(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
              <Plus size={14} /> Agregar Mínimo
            </button>
          )}
        </div>
      </div>

      {/* Clone Panel */}
      <AnimatePresence>
        {cloneMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-indigo-50/50 border-b border-indigo-100 px-5 py-4">
              <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider mb-3">
                Clonar Mínimos a Múltiples Meses
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source */}
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1.5">Período Origen</label>
                  <div className="flex gap-2">
                    <select value={cloneSourceMonth} onChange={e => setCloneSourceMonth(+e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                      {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={cloneSourceYear} onChange={e => setCloneSourceYear(+e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                      <option value={2025}>2025</option><option value={2026}>2026</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-indigo-500 mt-1 font-medium">
                    {sourceRows.length} categoría{sourceRows.length !== 1 && 's'} encontrada{sourceRows.length !== 1 && 's'}
                  </p>
                </div>

                {/* Target months */}
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1.5">Meses Destino</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MONTH_NAMES.map((m, i) => {
                      const month = i + 1;
                      const isSelected = cloneTargetMonths.includes(month);
                      const isSource = month === cloneSourceMonth;
                      return (
                        <button key={i}
                          onClick={() => !isSource && toggleTargetMonth(month)}
                          disabled={isSource}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                            isSource ? 'bg-slate-100 text-slate-300 cursor-not-allowed' :
                            isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Adjustment */}
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 uppercase block mb-1.5">Ajuste %</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={numVal(cloneAdjustPct)}
                      onChange={e => setCloneAdjustPct(+e.target.value || 0)}
                      className="w-20 px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                    />
                    <span className="text-xs text-indigo-600 font-bold">%</span>
                    <span className="text-[10px] text-slate-500">
                      {cloneAdjustPct === 0 ? '(sin cambio)' : cloneAdjustPct > 0 ? `(+${cloneAdjustPct}% aumento)` : `(${cloneAdjustPct}% reducción)`}
                    </span>
                  </div>

                  <button onClick={handleClone} disabled={cloning || sourceRows.length === 0 || cloneTargetMonths.length === 0}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    {cloning ? <Loader2 size={14} className="animate-spin" /> : <CopyIcon size={14} />}
                    Clonar {sourceRows.length} × {cloneTargetMonths.length} = {sourceRows.length * cloneTargetMonths.length} registros
                  </button>
                </div>
              </div>

              {/* Preview */}
              {sourceRows.length > 0 && cloneAdjustPct !== 0 && (
                <div className="mt-3 bg-white/60 rounded-lg p-3 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1.5">Vista previa del ajuste</p>
                  <div className="flex flex-wrap gap-2">
                    {sourceRows.map(s => (
                      <div key={s.idCategoria} className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200">
                        <span className="font-bold text-slate-700">Cat {s.idCategoria}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="line-through text-slate-400">{fmt.format(s.sueldoMinimo)}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-bold text-indigo-700">{fmt.format(Math.round(s.sueldoMinimo * (1 + cloneAdjustPct / 100)))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              {['Cat.', 'Nombre Categoría', 'Año', 'Mes', 'Sueldo Mínimo ($)', 'Tope Extra ($)', 'Acciones'].map(h => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {addMode && (
              <FormRow form={form} setForm={setForm} onSave={handleSave} onCancel={cancel}
                fields={['idCategoria', 'nombreCategoria', 'año', 'mes', 'sueldoMinimo', 'topeExtra']} />
            )}
            {filtered.map(row => (
              isEditing(row.id) ? (
                <FormRow key={row.id} form={form} setForm={setForm} onSave={handleSave} onCancel={cancel}
                  fields={['idCategoria', 'nombreCategoria', 'año', 'mes', 'sueldoMinimo', 'topeExtra']} />
              ) : (
                <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className={tdClass + ' font-mono font-bold'}>{row.idCategoria}</td>
                  <td className={tdClass + ' font-semibold text-slate-800'}>{row.nombreCategoria}</td>
                  <td className={tdClass}>{row.año}</td>
                  <td className={tdClass}>{row.mes}</td>
                  <td className={tdClass + ' font-mono font-bold text-slate-800'}>{fmt.format(row.sueldoMinimo)}</td>
                  <td className={tdClass + ' font-mono'}>{fmt.format(row.topeExtra)}</td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-1">
                      <IconBtn icon={Edit2} onClick={() => startEdit(row)} title="Editar" color="text-blue-400 hover:text-blue-600" />
                      <IconBtn icon={Trash2} onClick={() => { if (window.confirm('¿Eliminar este mínimo?')) remove(row.id!).catch(e => showToast(e.message, 'error')); }} title="Eliminar" color="text-red-400 hover:text-red-600" />
                    </div>
                  </td>
                </tr>
              )
            ))}
            {!filtered.length && !addMode && (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-slate-400 font-semibold">Sin registros para este período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   TAB: ESCALAS
   ═══════════════════════════════════════════════════════════ */

function EscalasTab({ API_URL, activeYear, activeMonth }: ConfigPanelProps) {
  const { filtered, loading, error, toast, create, update, remove, showToast } =
    useCrud<EscalaRow>(`${API_URL}/config/escalas`, activeYear, activeMonth);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(false);
  const blank: EscalaRow = { tipoEscala: 'escalaPersonal', año: +activeYear, mes: +activeMonth, minimoPct: 0, maximoPct: 0, topeCabezas: 0 };
  const [form, setForm] = useState<EscalaRow>(blank);

  const handleSave = async () => {
    try {
      const body = {
        ...form,
        añoMes: toAñoMes(form.año, form.mes),
      };
      if (editingId != null) {
        await update(editingId, body);
        setEditingId(null);
      } else {
        await create(body);
        setAddMode(false);
      }
      setForm(blank);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const startEdit = (row: EscalaRow) => {
    setEditingId(row.id!);
    setForm({ ...row });
    setAddMode(false);
  };

  const cancel = () => { setEditingId(null); setAddMode(false); setForm(blank); };

  if (loading) return <Spinner />;
  if (error) return <div className="flex items-center gap-2 p-6 text-xs text-red-600 font-semibold"><AlertTriangle size={14} /> {error}</div>;

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {filtered.length} registro{filtered.length !== 1 && 's'}
        </span>
        {!addMode && (
          <button onClick={() => { setAddMode(true); setForm({ ...blank }); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
            <Plus size={14} /> Agregar Escala
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              {['Tipo Escala', 'Año', 'Mes', 'Mín %', 'Máx %', 'Tope Cabezas', 'Acciones'].map(h => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {addMode && (
              <EscalaFormRow form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} />
            )}
            {filtered.map(row => (
              editingId === row.id ? (
                <EscalaFormRow key={row.id} form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} />
              ) : (
                <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className={tdClass}>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-100">
                      {ESCALA_OPTIONS.find(o => o.value === row.tipoEscala)?.label || row.tipoEscala}
                    </span>
                  </td>
                  <td className={tdClass}>{row.año}</td>
                  <td className={tdClass}>{row.mes}</td>
                  <td className={tdClass + ' font-mono font-bold'}>{pctDisplay(row.minimoPct)}%</td>
                  <td className={tdClass + ' font-mono font-bold'}>{pctDisplay(row.maximoPct)}%</td>
                  <td className={tdClass + ' font-mono'}>{(row.topeCabezas || 0).toLocaleString('es-AR')}</td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-1">
                      <IconBtn icon={Edit2} onClick={() => startEdit(row)} title="Editar" color="text-blue-400 hover:text-blue-600" />
                      <IconBtn icon={Trash2} onClick={() => { if (window.confirm('¿Eliminar esta escala?')) remove(row.id!).catch(e => showToast(e.message, 'error')); }} title="Eliminar" color="text-red-400 hover:text-red-600" />
                    </div>
                  </td>
                </tr>
              )
            ))}
            {!filtered.length && !addMode && (
              <tr><td colSpan={7} className="py-10 text-center text-xs text-slate-400 font-semibold">Sin registros para este período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EscalaFormRow({
  form, setForm, onSave, onCancel,
}: {
  form: EscalaRow;
  setForm: React.Dispatch<React.SetStateAction<EscalaRow>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <tr className="bg-blue-50/30">
      <td className={tdClass}>
        <select value={form.tipoEscala} onChange={e => setForm(f => ({ ...f, tipoEscala: e.target.value }))} className={inputClass}>
          {ESCALA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td className={tdClass}><input type="number" value={form.año} onChange={e => setForm(f => ({ ...f, año: +e.target.value }))} className={inputClass + ' w-20'} /></td>
      <td className={tdClass}><input type="number" value={form.mes} min={1} max={12} onChange={e => setForm(f => ({ ...f, mes: +e.target.value }))} className={inputClass + ' w-16'} /></td>
      <td className={tdClass}><input type="number" value={numVal(form.minimoPct)} onChange={e => setForm(f => ({ ...f, minimoPct: +e.target.value || 0 }))} className={inputClass + ' w-20'} /></td>
      <td className={tdClass}><input type="number" step="0.01" value={numVal(form.maximoPct)} onChange={e => setForm(f => ({ ...f, maximoPct: +e.target.value || 0 }))} className={inputClass + ' w-20'} /></td>
      <td className={tdClass}><input type="number" value={numVal(form.topeCabezas)} onChange={e => setForm(f => ({ ...f, topeCabezas: +e.target.value || 0 }))} className={inputClass + ' w-24'} /></td>
      <td className={tdClass}>
        <div className="flex items-center gap-1">
          <IconBtn icon={Check} onClick={onSave} title="Guardar" color="text-emerald-500 hover:text-emerald-700" />
          <IconBtn icon={X} onClick={onCancel} title="Cancelar" color="text-slate-400 hover:text-slate-600" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB: TAJADA
   ═══════════════════════════════════════════════════════════ */

function TajadaTab({ API_URL, activeYear, activeMonth }: ConfigPanelProps) {
  const { filtered, loading, error, toast, create, remove, showToast } =
    useCrud<TajadaRow>(`${API_URL}/config/tajada`, activeYear, activeMonth);

  const [addMode, setAddMode] = useState(false);
  const blank: TajadaRow = { año: +activeYear, mes: +activeMonth, oficina: '', comercial: '', pctTajada: 0 };
  const [form, setForm] = useState<TajadaRow>(blank);

  const handleSave = async () => {
    try {
      await create({ ...form, añoMes: toAñoMes(form.año, form.mes) });
      setAddMode(false);
      setForm(blank);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="flex items-center gap-2 p-6 text-xs text-red-600 font-semibold"><AlertTriangle size={14} /> {error}</div>;

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
          {filtered.length} registro{filtered.length !== 1 && 's'}
        </span>
        {!addMode && (
          <button onClick={() => { setAddMode(true); setForm({ ...blank }); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
            <Plus size={14} /> Agregar Tajada
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              {['Año', 'Mes', 'Oficina', 'Comercial', '% Tajada', 'Acciones'].map(h => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {addMode && (
              <tr className="bg-blue-50/30">
                <td className={tdClass}><input type="number" value={form.año} onChange={e => setForm(f => ({ ...f, año: +e.target.value }))} className={inputClass + ' w-20'} /></td>
                <td className={tdClass}><input type="number" value={form.mes} min={1} max={12} onChange={e => setForm(f => ({ ...f, mes: +e.target.value }))} className={inputClass + ' w-16'} /></td>
                <td className={tdClass}><input value={form.oficina} onChange={e => setForm(f => ({ ...f, oficina: e.target.value }))} className={inputClass} placeholder="Oficina" /></td>
                <td className={tdClass}><input value={form.comercial} onChange={e => setForm(f => ({ ...f, comercial: e.target.value }))} className={inputClass} placeholder="Comercial" /></td>
                <td className={tdClass}><input type="number" step="0.01" value={numVal(form.pctTajada)} onChange={e => setForm(f => ({ ...f, pctTajada: +e.target.value || 0 }))} className={inputClass + ' w-20'} /></td>
                <td className={tdClass}>
                  <div className="flex items-center gap-1">
                    <IconBtn icon={Check} onClick={handleSave} title="Guardar" color="text-emerald-500 hover:text-emerald-700" />
                    <IconBtn icon={X} onClick={() => { setAddMode(false); setForm(blank); }} title="Cancelar" color="text-slate-400 hover:text-slate-600" />
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                <td className={tdClass}>{row.año}</td>
                <td className={tdClass}>{row.mes}</td>
                <td className={tdClass + ' font-semibold text-slate-800'}>{row.oficina}</td>
                <td className={tdClass + ' font-semibold text-slate-800'}>{row.comercial}</td>
                <td className={tdClass + ' font-mono font-bold'}>{pctDisplay(row.pctTajada)}%</td>
                <td className={tdClass}>
                  <IconBtn icon={Trash2} onClick={() => { if (window.confirm('¿Eliminar esta tajada?')) remove(row.id!).catch(e => showToast(e.message, 'error')); }} title="Eliminar" color="text-red-400 hover:text-red-600" />
                </td>
              </tr>
            ))}
            {!filtered.length && !addMode && (
              <tr><td colSpan={6} className="py-10 text-center text-xs text-slate-400 font-semibold">Sin registros para este período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─────────────────── Ajustes Manuales & Retro Tab ─────────────────── */

interface AjustesTabProps {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
}

function AjustesTab({ API_URL, activeYear, activeMonth }: AjustesTabProps) {
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [retroRows, setRetroRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRetro, setLoadingRetro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Formulario manual
  const [comercial, setComercial] = useState('');
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState<number>(0);
  const [formYear, setFormYear] = useState(+activeYear);
  const [formMonth, setFormMonth] = useState(+activeMonth);
  const [submitting, setSubmitting] = useState(false);

  // Acordeón retroactivos
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchManualAndRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resManual, resRoster] = await Promise.all([
        fetch(`${API_URL}/ajustes-manuales`),
        fetch(`${API_URL}/roster`)
      ]);
      const dataManual = await resManual.json();
      const dataRoster = await resRoster.json();

      setManualRows(dataManual);
      setRoster(dataRoster);
    } catch (e: any) {
      setError(e.message || 'Error al conectar con la API.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRetroactive = async () => {
    setLoadingRetro(true);
    try {
      const res = await fetch(`${API_URL}/retroactivos?year=${activeYear}&month=${activeMonth}`);
      const data = await res.json();
      setRetroRows(data || []);
    } catch (e) {
      console.error('Error al cargar retroactivos:', e);
    } finally {
      setLoadingRetro(false);
    }
  };

  useEffect(() => {
    fetchManualAndRoster();
    fetchRetroactive();
  }, [activeYear, activeMonth]);

  const handleSaveManual = async () => {
    if (!comercial || !motivo || monto === 0) {
      showToast('Por favor, completá todos los campos y definí un monto distinto de cero.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/ajustes-manuales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          año: formYear,
          mes: formMonth,
          comercial,
          motivo,
          monto
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Ajuste manual guardado con éxito.', 'success');
        setMotivo('');
        setMonto(0);
        fetchManualAndRoster();
      } else {
        showToast(data.error || 'Error al guardar.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteManual = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este ajuste?')) return;

    try {
      const res = await fetch(`${API_URL}/ajustes-manuales/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Ajuste eliminado con éxito.', 'success');
        fetchManualAndRoster();
      } else {
        showToast(data.error || 'Error al eliminar.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    }
  };

  const filteredManual = manualRows.filter(r => r.año === +activeYear && r.mes === +activeMonth);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-slate-500" size={32} />
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cargando Ajustes...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL IZQUIERDO: AJUSTES MANUALES */}
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Premios y Descuentos Manuales</h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Cargar ajustes directos para el periodo {activeMonth}/{activeYear}</p>
          </div>

          {/* Formulario de Carga */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Nuevo Ajuste Manual</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comercial</label>
                <select
                  value={comercial}
                  onChange={e => setComercial(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Seleccionar Comercial...</option>
                  {roster.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto ($)</label>
                <input
                  type="number"
                  value={numVal(monto)}
                  onChange={e => setMonto(+e.target.value || 0)}
                  placeholder="Monto (positivo o negativo)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo / Concepto</label>
              <input
                type="text"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej. Premio por volumen de ventas / Reintegro de gastos"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveManual}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                Cargar Ajuste
              </button>
            </div>
          </div>

          {/* Listado de Ajustes Manuales */}
          <div className="overflow-x-auto border border-slate-200/60 rounded-xl bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-2 px-3 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Comercial</th>
                  <th className="py-2 px-3 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Motivo</th>
                  <th className="py-2 px-3 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider">Monto</th>
                  <th className="py-2 px-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredManual.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/40">
                    <td className="py-2 px-3 font-bold text-slate-700">{row.comercial}</td>
                    <td className="py-2 px-3 text-slate-500">{row.motivo}</td>
                    <td className={`py-2 px-3 text-right font-black ${row.monto > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {row.monto > 0 ? '+' : ''}{fmt.format(row.monto)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <IconBtn icon={Trash2} onClick={() => handleDeleteManual(row.id)} title="Eliminar" color="text-rose-400 hover:text-rose-600" />
                    </td>
                  </tr>
                ))}
                {!filteredManual.length && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400 italic font-semibold">
                      Sin ajustes manuales cargados en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: AUDITORÍA DE AJUSTES RETROACTIVOS */}
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Auditoría de Ajustes Retroactivos</h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Diferencias Estática vs Dinámica de los últimos 3 meses
              </p>
            </div>
            <button
              onClick={fetchRetroactive}
              disabled={loadingRetro}
              className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              {loadingRetro ? 'Actualizando...' : 'Recargar'}
            </button>
          </div>

          <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <Info size={16} className="text-sky-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-sky-700 font-semibold leading-normal">
              <strong>Regla de negocio:</strong> Las diferencias mostradas abajo sirven únicamente como reporte de auditoría por tropa modificada/nueva/caída. Solo el valor consolidado del ajuste se liquida en el mes corriente, sin alterar las operaciones individuales del cierre activo.
            </p>
          </div>

          {loadingRetro ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : !retroRows.length ? (
            <div className="p-8 text-center bg-white border border-slate-200/60 rounded-xl shadow-sm text-slate-400 font-semibold italic text-xs">
              No se detectaron desvíos retroactivos con respecto a los snapshots congelados de meses anteriores.
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {retroRows.map((ret, idx) => {
                const isExpanded = expandedAgent === `${ret.comercial}_${ret.mesAjustado}`;
                const key = `${ret.comercial}_${ret.mesAjustado}`;
                const monthName = MONTH_NAMES[ret.mesAjustado - 1];

                return (
                  <div key={idx} className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
                    {/* Fila Encabezado Acordeón */}
                    <div
                      onClick={() => setExpandedAgent(isExpanded ? null : key)}
                      className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                    >
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs">{ret.comercial}</h4>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                          Ajuste periodo: {monthName} {ret.añoAjustado}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`text-xs font-black ${ret.ajusteComponenteP > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {ret.ajusteComponenteP > 0 ? '+' : ''}{fmt.format(ret.ajusteComponenteP)}
                          </span>
                          <span className="block text-[8px] text-slate-400 font-bold uppercase">Factor: {(ret.escalaCongelada * 100).toFixed(2)}%</span>
                        </div>
                        <span className="text-slate-300 font-bold text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Contenido Desplegable (Lotes y Tropas) */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-slate-50/20 border-t border-slate-100 p-3 space-y-2.5"
                      >
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-100">
                          Detalle de Tropas que Variaron en el Histórico
                        </div>
                        
                        <div className="space-y-2">
                          {ret.detalleLotes.map((lote: any, lIdx: number) => (
                            <div key={lIdx} className="bg-white border border-slate-100 rounded-lg p-2.5 text-[11px] font-semibold flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-800 text-xs">Lote #{lote.idLote}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-black ${
                                    lote.tipo === 'nuevo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    lote.tipo === 'caido' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
                                    {lote.tipo === 'nuevo' ? 'Nueva' : lote.tipo === 'caido' ? 'Bajada' : 'Modificada'}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 block mt-1 leading-tight">
                                  {lote.sociedadVendedora} → {lote.sociedadCompradora}
                                </span>
                              </div>

                              <div className="text-right space-y-1">
                                <div className="text-[10px]">
                                  <span className="text-slate-400">Cabezas:</span>{' '}
                                  <span className="font-extrabold text-slate-700">{lote.cabezasAntes} → {lote.cabezasDespues}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Comisión Base:</span>{' '}
                                  <span className="font-extrabold text-slate-700">{fmt.format(lote.resultadoDespues - lote.resultadoAntes)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ─────────────────── Modelos y Fórmulas Tab ─────────────────── */

interface ModelosTabProps {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
}

function ModelosTab({ API_URL, activeYear, activeMonth }: ModelosTabProps) {
  const CONFIG_MODELS_URL = `${API_URL.replace('/api', '')}/api/config-models`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Datos de API
  const [models, setModels] = useState<any[]>([]);
  const [customScales, setCustomScales] = useState<Record<string, any>>({});
  const [standardScales, setStandardScales] = useState<any[]>([]);

  // Estados del creador de escalas
  const [scaleForm, setScaleForm] = useState<{ id: string; nombre: string; tramos: { cabezas: number; porcentaje: number }[] }>({
    id: '', nombre: '', tramos: [{ cabezas: 1500, porcentaje: 1.5 }]
  });
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [isScaleFormOpen, setIsScaleFormOpen] = useState(false);

  // Estados del creador de modelos
  const [modelForm, setModelForm] = useState({
    id: '',
    nombre: '',
    tieneMinimo: true,
    descripcion: '',
    componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC' },
    componenteR: { activa: false, pesoR: 1.0 },
    componenteO: { activa: false, pesoO: 1.0 }
  });
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isModelFormOpen, setIsModelFormOpen] = useState(false);

  // Estados de calibración (regresión)
  const [regressionPeriod, setRegressionPeriod] = useState({ year: activeYear, month: activeMonth });
  const [regressionTarget, setRegressionTarget] = useState<'sueldoBruto' | 'sueldoNeto'>('sueldoBruto');
  const [regressionResult, setRegressionResult] = useState<any | null>(null);
  const [regressionError, setRegressionError] = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CONFIG_MODELS_URL}/models`);
      const data = await res.json();
      if (data.success) {
        setModels(data.models || []);
        setCustomScales(data.customScales || {});
        setStandardScales(data.standardScales || []);
      } else {
        setError(data.error || 'No se pudo cargar la configuración de modelos.');
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeYear, activeMonth]);

  // --- CRUD ESCALAS ---
  const handleSaveScale = async () => {
    if (!scaleForm.id || !scaleForm.nombre) {
      showToast('Por favor, ingresá ID y Nombre de la escala.', 'error');
      return;
    }

    try {
      const body = {
        id: scaleForm.id,
        nombre: scaleForm.nombre,
        // Convertir de porcentaje humano (ej: 1.5) a base decimal para backend (ej: 0.015)
        tramos: scaleForm.tramos.map(t => ({
          cabezas: Number(t.cabezas),
          porcentaje: Number(t.porcentaje) / 100
        }))
      };

      const res = await fetch(`${CONFIG_MODELS_URL}/scales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        showToast('Escala guardada con éxito.', 'success');
        setIsScaleFormOpen(false);
        setEditingScaleId(null);
        setScaleForm({ id: '', nombre: '', tramos: [{ cabezas: 1500, porcentaje: 1.5 }] });
        fetchData();
      } else {
        showToast(data.error || 'Error al guardar la escala.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    }
  };

  const startEditScale = (id: string, scale: any) => {
    setEditingScaleId(id);
    setScaleForm({
      id,
      nombre: scale.nombre,
      // Convertir de base decimal a porcentaje humano
      tramos: scale.tramos.map((t: any) => ({
        cabezas: t.cabezas,
        porcentaje: Number((t.porcentaje * 100).toFixed(4))
      }))
    });
    setIsScaleFormOpen(true);
  };

  const handleDeleteScale = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar esta escala?')) return;
    try {
      const res = await fetch(`${CONFIG_MODELS_URL}/scales/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Escala eliminada con éxito.', 'success');
        fetchData();
      } else {
        showToast(data.error || 'Error al eliminar.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    }
  };

  // --- CRUD MODELOS ---
  const handleSaveModel = async () => {
    if (!modelForm.id || !modelForm.nombre) {
      showToast('Por favor, ingresá ID y Nombre del modelo.', 'error');
      return;
    }

    try {
      const res = await fetch(`${CONFIG_MODELS_URL}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelForm)
      });
      const data = await res.json();

      if (data.success) {
        showToast('Modelo de liquidación guardado.', 'success');
        setIsModelFormOpen(false);
        setEditingModelId(null);
        setModelForm({
          id: '', nombre: '', tieneMinimo: true, descripcion: '',
          componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC' },
          componenteR: { activa: false, pesoR: 1.0 },
          componenteO: { activa: false, pesoO: 1.0 }
        });
        fetchData();
      } else {
        showToast(data.error || 'Error al guardar.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    }
  };

  const startEditModel = (id: string, model: any) => {
    // Buscar modelo en la lista detallada de modelos custom si aplica
    setEditingModelId(id);
    setModelForm({
      id,
      nombre: model.nombre,
      tieneMinimo: model.tieneMinimo,
      descripcion: model.descripcion || '',
      componenteP: {
        activa: model.componenteP?.activa ?? true,
        umbralCabezas: model.componenteP?.umbralCabezas ?? 0,
        escalaId: model.componenteP?.escalaId ?? 'escalaAC'
      },
      componenteR: {
        activa: model.componenteR?.activa ?? false,
        pesoR: model.componenteR?.pesoR ?? 1.0
      },
      componenteO: {
        activa: model.componenteO?.activa ?? false,
        pesoO: model.componenteO?.pesoO ?? 1.0
      }
    });
    setIsModelFormOpen(true);
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este modelo?')) return;
    try {
      const res = await fetch(`${CONFIG_MODELS_URL}/models/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Modelo eliminado con éxito.', 'success');
        fetchData();
      } else {
        showToast(data.error || 'Error al eliminar.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error de conexión.', 'error');
    }
  };

  // --- CALIBRACIÓN POR REGRESIÓN ---
  const handleCalibrate = async () => {
    setCalibrating(true);
    setRegressionError(null);
    setRegressionResult(null);

    try {
      const res = await fetch(`${CONFIG_MODELS_URL}/regression/calibrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: regressionPeriod.year,
          month: regressionPeriod.month,
          targetField: regressionTarget
        })
      });
      const data = await res.json();
      if (data.success) {
        setRegressionResult(data.result);
      } else {
        setRegressionError(data.error || 'Error al realizar regresión.');
      }
    } catch (e: any) {
      setRegressionError(e.message || 'Error de conexión.');
    } finally {
      setCalibrating(false);
    }
  };

  const handleApplyRegression = () => {
    if (!regressionResult) return;
    
    // Rellenar formulario de modelo con los pesos de la regresión
    const modelId = `calibrado_${regressionPeriod.month}_${regressionPeriod.year}`;
    setModelForm({
      id: modelId,
      nombre: `Calibrado ${regressionPeriod.month}/${regressionPeriod.year}`,
      tieneMinimo: true,
      descripcion: `Modelo calibrado estadísticamente (OLS) a partir de liquidaciones reales de ${regressionPeriod.month}/${regressionPeriod.year} (R2: ${(regressionResult.r2 * 100).toFixed(1)}%).`,
      componenteP: {
        activa: Math.abs(regressionResult.coefP) > 0.05,
        umbralCabezas: 0,
        escalaId: 'escalaAC' // mantiene la escala tradicional
      },
      componenteR: {
        activa: Math.abs(regressionResult.coefR) > 0.05,
        pesoR: Number(regressionResult.coefR.toFixed(4))
      },
      componenteO: {
        activa: Math.abs(regressionResult.coefO) > 0.05,
        pesoO: Number(regressionResult.coefO.toFixed(4))
      }
    });
    setIsModelFormOpen(true);
    showToast('Pesos sugeridos copiados al formulario de modelo.', 'success');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-slate-500" size={32} />
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cargando modelos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200/50 rounded-2xl m-5">
        <AlertTriangle className="text-rose-500 mx-auto mb-3" size={32} />
        <p className="text-sm font-bold text-rose-800">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA 1 & 2: LISTADOS Y CREACIONES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TABLA DE MODELOS DE COMISIÓN */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Modelos de Liquidación</h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Modelos de cálculo paramétricos disponibles en el roster</p>
              </div>
              {!isModelFormOpen && (
                <button
                  onClick={() => {
                    setEditingModelId(null);
                    setModelForm({
                      id: '', nombre: '', tieneMinimo: true, descripcion: '',
                      componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC' },
                      componenteR: { activa: false, pesoR: 1.0 },
                      componenteO: { activa: false, pesoO: 1.0 }
                    });
                    setIsModelFormOpen(true);
                  }}
                  className="flex items-center gap-1 bg-black text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <Plus size={14} /> Nuevo Modelo
                </button>
              )}
            </div>

            {/* FORMULARIO DE MODELO CUSTOM */}
            {isModelFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    {editingModelId ? 'Editar Modelo Custom' : 'Crear Nuevo Modelo'}
                  </h4>
                  <button onClick={() => setIsModelFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Único (Modalidad)</label>
                    <input
                      type="text"
                      disabled={!!editingModelId}
                      value={modelForm.id}
                      onChange={e => setModelForm({ ...modelForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      placeholder="ej: oficina_pringles"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Descriptivo</label>
                    <input
                      type="text"
                      value={modelForm.nombre}
                      onChange={e => setModelForm({ ...modelForm, nombre: e.target.value })}
                      placeholder="ej: Oficina Repre (Pringles)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción</label>
                  <input
                    type="text"
                    value={modelForm.descripcion}
                    onChange={e => setModelForm({ ...modelForm, descripcion: e.target.value })}
                    placeholder="Escribí una descripción corta..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <input
                    type="checkbox"
                    id="tieneMinimo"
                    checked={modelForm.tieneMinimo}
                    onChange={e => setModelForm({ ...modelForm, tieneMinimo: e.target.checked })}
                    className="rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                  />
                  <label htmlFor="tieneMinimo" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Aplica Sueldo Mínimo Garantizado (absorbe comisiones)
                  </label>
                </div>

                {/* COMPONENTES PARAMETRIZABLES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                  {/* COMPONENTE PERSONAL (P) */}
                  <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <input
                        type="checkbox"
                        id="compP_activa"
                        checked={modelForm.componenteP.activa}
                        onChange={e => setModelForm({ ...modelForm, componenteP: { ...modelForm.componenteP, activa: e.target.checked } })}
                      />
                      <label htmlFor="compP_activa" className="text-xs font-extrabold text-slate-700">Componente Personal</label>
                    </div>
                    {modelForm.componenteP.activa && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400">Escala de Comisión</label>
                          <select
                            value={modelForm.componenteP.escalaId}
                            onChange={e => setModelForm({ ...modelForm, componenteP: { ...modelForm.componenteP, escalaId: e.target.value } })}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-medium"
                          >
                            <optgroup label="Estándar">
                              {standardScales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </optgroup>
                            <optgroup label="Customizadas">
                              {Object.entries(customScales).map(([id, s]) => <option key={id} value={id}>{s.nombre}</option>)}
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400">Umbral mínimo de cabezas</label>
                          <input
                            type="number"
                            value={numVal(modelForm.componenteP.umbralCabezas)}
                            onChange={e => setModelForm({ ...modelForm, componenteP: { ...modelForm.componenteP, umbralCabezas: +e.target.value || 0 } })}
                            placeholder="ej: 1500"
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COMPONENTE REGIONAL (R) */}
                  <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <input
                        type="checkbox"
                        id="compR_activa"
                        checked={modelForm.componenteR.activa}
                        onChange={e => setModelForm({ ...modelForm, componenteR: { ...modelForm.componenteR, activa: e.target.checked } })}
                      />
                      <label htmlFor="compR_activa" className="text-xs font-extrabold text-slate-700">Componente Regional</label>
                    </div>
                    {modelForm.componenteR.activa && (
                      <div className="mt-2">
                        <label className="block text-[9px] font-bold text-slate-400">Multiplicador / Coeficiente</label>
                        <input
                          type="number"
                          step="0.01"
                          value={numVal(modelForm.componenteR.pesoR)}
                          onChange={e => setModelForm({ ...modelForm, componenteR: { ...modelForm.componenteR, pesoR: +e.target.value || 0 } })}
                          placeholder="ej: 1.00 o 0.50"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-medium"
                        />
                        <span className="text-[9px] text-slate-400 block mt-1 leading-tight">1.00 = 100% de la Tajada regional. 0.50 = Mitad de tajada.</span>
                      </div>
                    )}
                  </div>

                  {/* COMPONENTE OFICINA (O) */}
                  <div className="border border-slate-100 p-3 rounded-lg bg-slate-50/20">
                    <div className="flex items-center gap-1.5 mb-2">
                      <input
                        type="checkbox"
                        id="compO_activa"
                        checked={modelForm.componenteO.activa}
                        onChange={e => setModelForm({ ...modelForm, componenteO: { ...modelForm.componenteO, activa: e.target.checked } })}
                      />
                      <label htmlFor="compO_activa" className="text-xs font-extrabold text-slate-700">Componente Oficina</label>
                    </div>
                    {modelForm.componenteO.activa && (
                      <div className="mt-2">
                        <label className="block text-[9px] font-bold text-slate-400">Multiplicador / Coeficiente</label>
                        <input
                          type="number"
                          step="0.01"
                          value={numVal(modelForm.componenteO.pesoO)}
                          onChange={e => setModelForm({ ...modelForm, componenteO: { ...modelForm.componenteO, pesoO: +e.target.value || 0 } })}
                          placeholder="ej: 1.00 o 0.00"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-medium"
                        />
                        <span className="text-[9px] text-slate-400 block mt-1 leading-tight">Determina el peso de la componente oficina.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setIsModelFormOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveModel}
                    className="flex items-center gap-1 bg-slate-800 text-white hover:bg-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold"
                  >
                    <Save size={12} /> Guardar Modelo
                  </button>
                </div>
              </motion.div>
            )}

            {/* TABLA DE MODELOS */}
            <div className="overflow-x-auto border border-slate-200/60 rounded-xl bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID / Modalidad</th>
                    <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                    <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mínimo</th>
                    <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal (P)</th>
                    <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regional (R)</th>
                    <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oficina (O)</th>
                    <th className="py-2.5 px-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {models.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-4 text-xs font-black text-slate-900">
                        {m.id}
                        {!m.isCustom && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-500 uppercase font-black tracking-wider">Fijo</span>}
                        {m.isCustom && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-sky-50 text-sky-600 border border-sky-100 uppercase font-black tracking-wider">Custom</span>}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-700">
                        <div>{m.nombre}</div>
                        <span className="text-[9px] text-slate-400 font-medium leading-relaxed block max-w-xs truncate">{m.descripcion}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] ${m.tieneMinimo ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                          {m.tieneMinimo ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-center text-slate-600">
                        {m.id === 'operario' ? '10% Fijo' : m.id === 'fijo' ? '10% Fijo' : m.id === 'lucila frutos' ? 'GC Especial' : m.id === 'agustín acuña' ? '30% Especial' : 'Escala Activa'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-center text-slate-600">
                        {m.id === 'completa' ? '100% Tajada' : m.id === 'hibrida' ? '50% Tajada' : m.id === 'operario' ? '10% Propio' : m.isCustom ? (m.componenteR?.activa ? `${(m.componenteR.pesoR * 100).toFixed(0)}% Tajada` : 'NO') : 'NO'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold text-center text-slate-600">
                        {m.id === 'completa' ? '100% Oficina' : m.isCustom ? (m.componenteO?.activa ? `${(m.componenteO.pesoO * 100).toFixed(0)}% Oficina` : 'NO') : 'NO'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-right">
                        {m.isCustom ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <IconBtn icon={Edit2} onClick={() => startEditModel(m.id, m)} title="Editar" color="text-slate-600 hover:text-slate-900" />
                            <IconBtn icon={Trash2} onClick={() => handleDeleteModel(m.id)} title="Eliminar" color="text-rose-500 hover:text-rose-700" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic select-none">Predefinido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLA DE ESCALAS CUSTOMIZADAS */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Tablas de Escalas Custom</h3>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">Tablas de tramos personalizables basadas en cabezas operadas</p>
              </div>
              {!isScaleFormOpen && (
                <button
                  onClick={() => {
                    setEditingScaleId(null);
                    setScaleForm({ id: '', nombre: '', tramos: [{ cabezas: 1500, porcentaje: 1.5 }] });
                    setIsScaleFormOpen(true);
                  }}
                  className="flex items-center gap-1 bg-black text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <Plus size={14} /> Nueva Escala
                </button>
              )}
            </div>

            {/* FORMULARIO DE ESCALA CUSTOM */}
            {isScaleFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    {editingScaleId ? 'Editar Escala Custom' : 'Crear Nueva Escala de Tramos'}
                  </h4>
                  <button onClick={() => setIsScaleFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID Escala</label>
                    <input
                      type="text"
                      disabled={!!editingScaleId}
                      value={scaleForm.id}
                      onChange={e => setScaleForm({ ...scaleForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      placeholder="ej: escala_pringles"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
                    <input
                      type="text"
                      value={scaleForm.nombre}
                      onChange={e => setScaleForm({ ...scaleForm, nombre: e.target.value })}
                      placeholder="ej: Escala Oficina Pringles"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                {/* TRAMOS EDITABLES */}
                <div className="space-y-2 mt-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tramos de Escala</label>
                  {scaleForm.tramos.map((tramo, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="relative">
                          <input
                            type="number"
                            value={numVal(tramo.cabezas)}
                            onChange={e => {
                              const list = [...scaleForm.tramos];
                              list[index].cabezas = +e.target.value || 0;
                              setScaleForm({ ...scaleForm, tramos: list });
                            }}
                            placeholder="Cabezas operadas"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                          <span className="absolute right-3 top-1.5 text-[10px] text-slate-400 font-bold uppercase">Cabezas</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={numVal(tramo.porcentaje)}
                            onChange={e => {
                              const list = [...scaleForm.tramos];
                              list[index].porcentaje = +e.target.value || 0;
                              setScaleForm({ ...scaleForm, tramos: list });
                            }}
                            placeholder="Porcentaje de comisión"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                          />
                          <span className="absolute right-3 top-1.5 text-[10px] text-slate-400 font-bold uppercase">%</span>
                        </div>
                      </div>
                      {scaleForm.tramos.length > 1 && (
                        <button
                          onClick={() => {
                            const list = scaleForm.tramos.filter((_, i) => i !== index);
                            setScaleForm({ ...scaleForm, tramos: list });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded"
                          title="Eliminar tramo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setScaleForm({ ...scaleForm, tramos: [...scaleForm.tramos, { cabezas: 0, porcentaje: 0 }] })}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline pt-1"
                  >
                    <Plus size={12} /> Añadir Tramo
                  </button>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setIsScaleFormOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveScale}
                    className="flex items-center gap-1 bg-slate-800 text-white hover:bg-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold"
                  >
                    <Save size={12} /> Guardar Escala
                  </button>
                </div>
              </motion.div>
            )}

            {/* TABLA DE ESCALAS */}
            {Object.keys(customScales).length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200/60 rounded-xl shadow-sm text-slate-400 font-semibold italic text-xs">
                No hay escalas custom creadas. Podés crear escalas como la de Pringles para definir comisiones por tramos de cabezas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(customScales).map(([id, scale]) => (
                  <div key={id} className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs">{scale.nombre}</h4>
                          <span className="text-[9px] text-slate-400 font-black block tracking-wider uppercase mt-0.5">{id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconBtn icon={Edit2} onClick={() => startEditScale(id, scale)} title="Editar" color="text-slate-500 hover:text-slate-800" />
                          <IconBtn icon={Trash2} onClick={() => handleDeleteScale(id)} title="Eliminar" color="text-rose-500 hover:text-rose-700" />
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto mt-2">
                        {scale.tramos.map((t: any, index: number) => (
                          <div key={index} className="flex justify-between py-1 text-[11px] font-semibold text-slate-600">
                            <span>Desde {t.cabezas.toLocaleString()} cabezas:</span>
                            <span className="font-extrabold text-slate-800">{Number((t.porcentaje * 100).toFixed(2))}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 3: CALIBRACIÓN POR REGRESIÓN ESTADÍSTICA */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-850 p-5 shadow-md flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
                  <Wand2 size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs tracking-wider text-slate-200 uppercase">Calibrador Estadístico OLS</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed mt-0.5">Optimizar variables mediante regresión</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4">
                El calibrador analiza las comisiones calculadas y calcula de forma matemática cuáles deberían ser los coeficientes exactos del modelo para que la liquidación final bruto/neto aproxime de la mejor manera a tus valores reales pagados de forma histórica.
              </p>

              <div className="space-y-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Año</label>
                    <select
                      value={regressionPeriod.year}
                      onChange={e => setRegressionPeriod({ ...regressionPeriod, year: e.target.value })}
                      className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mes</label>
                    <select
                      value={regressionPeriod.month}
                      onChange={e => setRegressionPeriod({ ...regressionPeriod, month: e.target.value })}
                      className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
                    >
                      {MONTH_NAMES.map((name, i) => (
                        <option key={i + 1} value={(i + 1).toString()}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Variable Objetivo</label>
                  <select
                    value={regressionTarget}
                    onChange={e => setRegressionTarget(e.target.value as any)}
                    className="w-full bg-slate-850 border border-slate-700 rounded px-2 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
                  >
                    <option value="sueldoBruto">Sueldo Bruto Real (Histórico)</option>
                    <option value="sueldoNeto">Cierre Neto Real (Histórico)</option>
                  </select>
                </div>

                <button
                  onClick={handleCalibrate}
                  disabled={calibrating}
                  className="w-full flex items-center justify-center gap-1.5 bg-sky-500 text-slate-900 font-extrabold hover:bg-sky-400 py-2 rounded-lg text-xs transition-all active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer shadow"
                >
                  {calibrating ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Calibrando...
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} /> Calcular Regresión
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RESULTADOS DE LA REGRESIÓN */}
            <div className="mt-4">
              {regressionError && (
                <div className="bg-rose-950/40 text-rose-300 p-3 rounded-xl border border-rose-900/50 text-[10px] font-semibold leading-relaxed flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                  <div>{regressionError}</div>
                </div>
              )}

              {regressionResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3 mt-2"
                >
                  <div className="flex justify-between items-center bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Coeficiente de ajuste R²</span>
                    <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                      regressionResult.r2 >= 0.85 ? 'bg-emerald-950 text-emerald-400' :
                      regressionResult.r2 >= 0.60 ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {(regressionResult.r2 * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-850 rounded-xl p-3 border border-slate-800 text-[11px] font-semibold space-y-1.5">
                    <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-800/60 mb-1">Pesos Óptimos Calculados</h5>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coeficiente Personal (P):</span>
                      <span className="font-extrabold text-sky-400">{regressionResult.coefP.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coeficiente Regional (R):</span>
                      <span className="font-extrabold text-sky-400">{regressionResult.coefR.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coeficiente Oficina (O):</span>
                      <span className="font-extrabold text-sky-400">{regressionResult.coefO.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/60 pt-1.5 mt-1 text-slate-300">
                      <span>Intercepto (Fijo Sugerido):</span>
                      <span className="font-black text-slate-100">${Math.round(regressionResult.intercepto).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyRegression}
                    className="w-full flex items-center justify-center gap-1 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750 hover:text-slate-100 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
                  >
                    Aplicar Pesos a Nuevo Modelo
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────── Generic inline form row (for Mínimos) ─────────────────── */

function FormRow({
  form, setForm, onSave, onCancel, fields,
}: {
  form: MinimoRow;
  setForm: React.Dispatch<React.SetStateAction<MinimoRow>>;
  onSave: () => void;
  onCancel: () => void;
  fields: (keyof MinimoRow)[];
}) {
  const numericFields = new Set<keyof MinimoRow>(['año', 'mes', 'sueldoMinimo', 'topeExtra']);
  return (
    <tr className="bg-blue-50/30">
      {fields.map(f => (
        <td key={f} className={tdClass}>
          <input
            type={numericFields.has(f) ? 'number' : 'text'}
            value={numericFields.has(f) ? numVal(form[f] as number) : (form[f] as string)}
            onChange={e => setForm(prev => ({ ...prev, [f]: numericFields.has(f) ? (+e.target.value || 0) : e.target.value }))}
            placeholder={numericFields.has(f) ? '0' : ''}
            className={inputClass + (f === 'año' ? ' w-20' : f === 'mes' || f === 'idCategoria' ? ' w-16' : '')}
          />
        </td>
      ))}
      <td className={tdClass}>
        <div className="flex items-center gap-1">
          <IconBtn icon={Check} onClick={onSave} title="Guardar" color="text-emerald-500 hover:text-emerald-700" />
          <IconBtn icon={X} onClick={onCancel} title="Cancelar" color="text-slate-400 hover:text-slate-600" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function ConfigPanel({ API_URL, activeYear, activeMonth }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('minimos');

  const tabProps = { API_URL, activeYear, activeMonth };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-slate-100 rounded-xl">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Configuración</h2>
          <p className="text-[11px] text-slate-400 font-semibold">
            Mínimos, escalas y tajadas para el período {activeMonth}/{activeYear}
          </p>
        </div>
      </div>

      {/* Card shell */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Segmented tab bar */}
        <div className="px-5 pt-4 pb-0">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {SUB_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'minimos' && <MinimosTab {...tabProps} />}
              {activeTab === 'escalas' && <EscalasTab {...tabProps} />}
              {activeTab === 'tajada' && <TajadaTab {...tabProps} />}
              {activeTab === 'modelos' && <ModelosTab {...tabProps} />}
              {activeTab === 'ajustes' && <AjustesTab {...tabProps} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
