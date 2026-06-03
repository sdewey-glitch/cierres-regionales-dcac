import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Send, TestTube, FileDown, Save, Loader2, CheckCircle, 
  XCircle, Clock, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, 
  Search, RefreshCw, Users, FolderOpen, Eye, X, Check,
  MailCheck, MailX
} from 'lucide-react';
import { MONTHS } from '../constants';

// ── Tipos ──
interface EnvioConfig {
  nombre: string;
  codigo: string;
  email: string;
  enviar: boolean;
  cc: string;
  ultimoEnvio: string;
  estado: string;
  pdfLink: string;
  ajustesManualesMonto: number;
  incluirAjustesManuales: boolean;
}

interface HistorialEntry {
  timestamp: string;
  añoMes: string;
  comercial: string;
  email: string;
  cc: string;
  remitente: string;
  estado: string;
  pdfLink: string;
  emailId: string;
}

interface Props {
  API_URL: string;
  activeYear: string;
  activeMonth: string;
  data: any[];
  onRefresh?: () => void;
}

// ── Remitentes disponibles ──
const REMITENTES = [
  { name: 'Santos Dewey', email: 'sdewey@decampoacampo.com' },
  { name: 'Juan Sineriz', email: 'jsineriz@decampoacampo.com' },
  { name: 'Pablo Taffarel', email: 'ptaffarel@decampoacampo.com' },
  { name: 'Andrés Rivas', email: 'arivas@decampoacampo.com' },
  { name: 'Ignacio Cavanagh', email: 'icavanagh@decampoacampo.com' },
];

const DEFAULT_TEMPLATE = `{saludo} {nombre}!

Te comparto el cierre del mes de {mes} {año}.
Avisame cualquier cosa que falte o se necesite aclarar.

Saludos,
{remitente_nombre}.`;

export default function Envios({ API_URL, activeYear, activeMonth, data, onRefresh }: Props) {
  // ── Estado ──
  const [config, setConfig] = useState<EnvioConfig[]>([]);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [remitente, setRemitente] = useState(REMITENTES[0]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [sendingAgent, setSendingAgent] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [confirmModal, setConfirmModal] = useState<'batch' | 'batchTest' | null>(null);
  const [previewAgent, setPreviewAgent] = useState<string | null>(null);
  
  // Editor WYSIWYG states
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const mesNombre = MONTHS[Number(activeMonth) - 1];
  const añoMes = `${activeYear}${activeMonth.padStart(2, '0')}`;

  // ── Fetch config de envío ──
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/dispatch/config?year=${activeYear}&month=${activeMonth}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || []);
        setHistorial(data.historial || []);
      }
    } catch (e) {
      console.error('Error cargando config de envío:', e);
    } finally {
      setLoading(false);
    }
  }, [API_URL, activeYear, activeMonth]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // ── Guardar config ──
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/dispatch/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, year: activeYear, month: activeMonth }),
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        alert('Error guardando configuración');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  // ── Enviar a un agente ──
  const handleSend = async (nombre: string, isTest: boolean) => {
    setSendingAgent(nombre);
    try {
      const endpoint = isTest ? 'dispatch/test' : 'dispatch/send';
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: nombre,
          year: Number(activeYear),
          month: Number(activeMonth),
          sender: remitente.email,
          senderName: remitente.name,
          template,
        }),
      });
      const result = await res.json();
      if (result.success) {
        // Actualizar estado en la config local
        setConfig(prev => prev.map(c => 
          c.nombre === nombre 
            ? { ...c, estado: isTest ? 'Test enviado' : 'Enviado', ultimoEnvio: new Date().toISOString(), pdfLink: result.pdfUrl || c.pdfLink }
            : c
        ));
        fetchConfig(); // Refresh historial
      } else {
        alert(`Error: ${result.error || 'Error desconocido'}`);
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSendingAgent(null);
    }
  };

  // ── Envío masivo ──
  const handleBatchSend = async (isTest: boolean) => {
    setConfirmModal(null);
    const toSend = config.filter(c => c.enviar && c.email);
    if (toSend.length === 0) return alert('No hay comerciales marcados para enviar');
    
    setBatchSending(true);
    setBatchProgress({ current: 0, total: toSend.length });

    for (let i = 0; i < toSend.length; i++) {
      setBatchProgress({ current: i + 1, total: toSend.length });
      await handleSend(toSend[i].nombre, isTest);
      // Pequeña pausa entre envíos para no saturar
      await new Promise(r => setTimeout(r, 1500));
    }

    setBatchSending(false);
    fetchConfig();
  };

  // ── Preview PDF ──
  const handlePreviewPdf = async (nombre: string) => {
    setPreviewAgent(nombre);
    try {
      const res = await fetch(`${API_URL}/dispatch/preview-pdf/${encodeURIComponent(nombre)}?year=${activeYear}&month=${activeMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('Error generando PDF');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setPreviewAgent(null);
    }
  };

  // ── Editar HTML (WYSIWYG) ──
  const handleEditPdf = async (nombre: string) => {
    setEditingAgent(nombre);
    try {
      const res = await fetch(`${API_URL}/dispatch/preview-html/${encodeURIComponent(nombre)}?year=${activeYear}&month=${activeMonth}`);
      if (res.ok) {
        const html = await res.text();
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
            doc.designMode = 'on';
          }
        }
      } else {
        alert('Error obteniendo HTML para edición');
        setEditingAgent(null);
      }
    } catch (e) {
      alert('Error de conexión');
      setEditingAgent(null);
    }
  };

  const handleSaveOverride = async () => {
    if (!editingAgent || !iframeRef.current?.contentDocument) return;
    setSavingOverride(true);
    const modifiedHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
    
    try {
      const res = await fetch(`${API_URL}/dispatch/override/${encodeURIComponent(editingAgent)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: activeYear, month: activeMonth, html: modifiedHtml }),
      });
      const result = await res.json();
      if (result.success) {
        setEditingAgent(null);
        alert('Edición guardada correctamente. El próximo envío o preview usará esta versión.');
      } else {
        alert('Error al guardar edición');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setSavingOverride(false);
    }
  };

  // ── Actualizar campo de un agente ──
  const updateAgent = (nombre: string, field: keyof EnvioConfig, value: any) => {
    setConfig(prev => prev.map(c => c.nombre === nombre ? { ...c, [field]: value } : c));
  };

  // ── Toggle seleccionar todos ──
  const allSelected = config.every(c => c.enviar);
  const toggleAll = () => {
    const newVal = !allSelected;
    setConfig(prev => prev.map(c => ({ ...c, enviar: newVal })));
  };

  // ── Filtrado ──
  const filteredConfig = config.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Stats ──
  const stats = useMemo(() => {
    const enviados = config.filter(c => c.estado === 'Enviado').length;
    const pendientes = config.filter(c => c.enviar && c.estado !== 'Enviado').length;
    const sinEmail = config.filter(c => !c.email).length;
    const marcados = config.filter(c => c.enviar).length;
    return { enviados, pendientes, sinEmail, marcados, total: config.length };
  }, [config]);

  const hasSnapshot = data && data.length > 0;

  // ── Estado Icon ──
  const EstadoIcon = ({ estado }: { estado: string }) => {
    if (estado === 'Enviado') return <CheckCircle size={14} className="text-green-500" />;
    if (estado === 'Test enviado') return <MailCheck size={14} className="text-blue-500" />;
    if (estado === 'Error') return <XCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-gray-300" />;
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 size={36} className="text-slate-400 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500">Cargando módulo de envíos...</p>
      </div>
    );
  }

  if (!hasSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <Mail className="text-gray-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin datos de cierre</h2>
        <p className="text-gray-500 mb-2">Primero generá el cierre de {mesNombre} {activeYear} desde el Hub o con el botón Calcular.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header con stats ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Mail size={20} className="text-blue-400" />
                Envío de Cierres — {mesNombre} {activeYear}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Generá PDFs, guardá en Drive y enviá por mail a cada comercial
              </p>
            </div>
            
            {/* Stats pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <Users size={13} className="text-slate-300" />
                <span className="text-white text-xs font-bold">{stats.total}</span>
                <span className="text-slate-400 text-xs">total</span>
              </div>
              <div className="bg-green-500/20 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <CheckCircle size={13} className="text-green-400" />
                <span className="text-green-300 text-xs font-bold">{stats.enviados}</span>
                <span className="text-green-400/70 text-xs">enviados</span>
              </div>
              <div className="bg-amber-500/20 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-amber-400" />
                <span className="text-amber-300 text-xs font-bold">{stats.pendientes}</span>
                <span className="text-amber-400/70 text-xs">pendientes</span>
              </div>
              {stats.sinEmail > 0 && (
                <div className="bg-red-500/20 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-400" />
                  <span className="text-red-300 text-xs font-bold">{stats.sinEmail}</span>
                  <span className="text-red-400/70 text-xs">sin email</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
          {/* Remitente selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">De:</span>
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                value={remitente.email}
                onChange={e => {
                  const r = REMITENTES.find(r => r.email === e.target.value);
                  if (r) setRemitente(r);
                }}
              >
                {REMITENTES.map(r => (
                  <option key={r.email} value={r.email}>{r.name} ({r.email})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Búsqueda */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Buscar comercial..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Acciones masivas */}
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${showTemplate ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
          >
            <Eye size={13} /> Template
          </button>

          <button
            onClick={() => setConfirmModal('batchTest')}
            disabled={batchSending || stats.marcados === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <TestTube size={13} /> Test ({stats.marcados})
          </button>

          <button
            onClick={() => setConfirmModal('batch')}
            disabled={batchSending || stats.marcados === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Send size={13} /> Enviar ({stats.marcados})
          </button>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-900 text-white hover:bg-black transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar
          </button>
        </div>
      </motion.div>

      {/* ── Batch progress bar ── */}
      {batchSending && (
        <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <Loader2 size={20} className="text-blue-600 animate-spin" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-bold text-blue-800 mb-1">
              <span>Enviando cierres...</span>
              <span>{batchProgress.current} / {batchProgress.total}</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Template editor (collapsible) ── */}
      <AnimatePresence>
        {showTemplate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail size={16} className="text-slate-500" />
                  Template del email
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{'{nombre}'}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{'{mes}'}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{'{año}'}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{'{saludo}'}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{'{remitente_nombre}'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  rows={7}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preview</div>
                  <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {template
                      .replace(/\{saludo\}/g, new Date().getHours() < 12 ? 'Buenos días' : 'Buenas tardes')
                      .replace(/\{nombre\}/g, (filteredConfig[0]?.nombre || 'Comercial').split(' ')[0])
                      .replace(/\{mes\}/g, mesNombre)
                      .replace(/\{año\}/g, activeYear)
                      .replace(/\{remitente_nombre\}/g, remitente.name.split(' ')[0])
                    }
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabla principal ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={allSelected} 
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Comercial</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">CC</th>
                  <th className="py-3 px-4 text-right">Ajuste Manual ($)</th>
                  <th className="py-3 px-4 text-center">Incluir Ajuste</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">PDF</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredConfig.map((agent, i) => {
                  const isSending = sendingAgent === agent.nombre;
                  const isPreviewing = previewAgent === agent.nombre;
                  return (
                    <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${!agent.email ? 'opacity-50' : ''}`}>
                      <td className="py-2.5 px-4">
                        <input 
                          type="checkbox" 
                          checked={agent.enviar} 
                          onChange={e => updateAgent(agent.nombre, 'enviar', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{agent.nombre}</div>
                        {agent.codigo && <div className="text-[10px] text-slate-400 font-medium">{agent.codigo}</div>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium">
                        {agent.email || <span className="text-red-400 italic">Sin email</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={agent.cc}
                          onChange={e => updateAgent(agent.nombre, 'cc', e.target.value)}
                          placeholder="email1@..., email2@..."
                          className="w-full min-w-[200px] bg-transparent border-b border-dashed border-slate-200 px-1 py-0.5 text-xs text-slate-600 focus:outline-none focus:border-blue-400 placeholder:text-slate-300"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <input
                          type="number"
                          value={agent.ajustesManualesMonto !== undefined ? agent.ajustesManualesMonto : 0}
                          onChange={e => updateAgent(agent.nombre, 'ajustesManualesMonto', Number(e.target.value))}
                          className="w-24 bg-transparent border-b border-dashed border-slate-200 px-1 py-0.5 text-xs text-right text-slate-850 font-bold focus:outline-none focus:border-blue-400"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={agent.incluirAjustesManuales !== undefined ? agent.incluirAjustesManuales : true}
                          onChange={e => updateAgent(agent.nombre, 'incluirAjustesManuales', e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <EstadoIcon estado={agent.estado} />
                          <span className={`text-[10px] font-bold ${
                            agent.estado === 'Enviado' ? 'text-green-600' : 
                            agent.estado === 'Test enviado' ? 'text-blue-600' :
                            agent.estado === 'Error' ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {agent.estado || 'Pendiente'}
                          </span>
                        </div>
                        {agent.ultimoEnvio && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {new Date(agent.ultimoEnvio).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {agent.pdfLink ? (
                          <a href={agent.pdfLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 font-bold text-[10px] flex items-center justify-center gap-1">
                            <FolderOpen size={12} /> Drive
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditPdf(agent.nombre)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            title="Editar manualmente antes de enviar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handlePreviewPdf(agent.nombre)}
                            disabled={isPreviewing}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Ver PDF"
                          >
                            {isPreviewing ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                            PDF
                          </button>
                          <button
                            onClick={() => handleSend(agent.nombre, true)}
                            disabled={isSending}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Enviar test a tu mail"
                          >
                            {isSending ? <Loader2 size={11} className="animate-spin" /> : <TestTube size={11} />}
                            Test
                          </button>
                          <button
                            onClick={() => handleSend(agent.nombre, false)}
                            disabled={isSending || !agent.email}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Enviar al comercial"
                          >
                            {isSending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                            Enviar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── Historial (collapsible) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowHistorial(!showHistorial)}
          className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            Historial de envíos ({historial.length})
          </span>
          {showHistorial ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        
        <AnimatePresence>
          {showHistorial && historial.length > 0 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    <tr>
                      <th className="py-2 px-4">Fecha</th>
                      <th className="py-2 px-4">Comercial</th>
                      <th className="py-2 px-4">Email</th>
                      <th className="py-2 px-4">Remitente</th>
                      <th className="py-2 px-4 text-center">Estado</th>
                      <th className="py-2 px-4">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.slice().reverse().map((h, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-4 text-slate-500 font-medium">
                          {new Date(h.timestamp).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-800">{h.comercial}</td>
                        <td className="py-2 px-4 text-slate-600">{h.email}</td>
                        <td className="py-2 px-4 text-slate-500">{h.remitente}</td>
                        <td className="py-2 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.estado === 'Enviado' ? 'bg-green-100 text-green-800' :
                            h.estado === 'Test' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {h.estado}
                          </span>
                        </td>
                        <td className="py-2 px-4">
                          {h.pdfLink ? (
                            <a href={h.pdfLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Ver</a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal de confirmación ── */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className={`px-6 py-4 ${confirmModal === 'batch' ? 'bg-green-600' : 'bg-blue-600'}`}>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  {confirmModal === 'batch' ? <Send size={20} /> : <TestTube size={20} />}
                  {confirmModal === 'batch' ? 'Confirmar envío masivo' : 'Confirmar test masivo'}
                </h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-700 mb-4">
                  {confirmModal === 'batch' 
                    ? `Se enviará el cierre de ${mesNombre} ${activeYear} a ${stats.marcados} comerciales desde ${remitente.email}.`
                    : `Se enviarán ${stats.marcados} PDFs de prueba a ${remitente.email} para revisión.`
                  }
                </p>
                <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600">
                  <div><strong>Remitente:</strong> {remitente.name} ({remitente.email})</div>
                  <div><strong>Comerciales:</strong> {stats.marcados} marcados</div>
                  <div><strong>Período:</strong> {mesNombre} {activeYear}</div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleBatchSend(confirmModal === 'batchTest')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors shadow-sm ${
                      confirmModal === 'batch' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {confirmModal === 'batch' ? 'Enviar todos' : 'Enviar tests'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL EDITOR WYSIWYG */}
      <AnimatePresence>
        {editingAgent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-[900px] h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    Editor de Cierre
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">BETA</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Modificando liquidación de {editingAgent}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingAgent(null)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveOverride}
                    disabled={savingOverride}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingOverride ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar Cambios
                  </button>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  <strong>Modo Diseño Activado:</strong> Podés clickear en cualquier texto o número del documento de abajo y modificarlo como si fuera un Word. Estos cambios "pisarán" al documento automático al momento de enviarlo.
                </p>
              </div>

              <div className="flex-1 bg-slate-100 overflow-hidden relative p-4">
                <div className="w-full h-full bg-white shadow-sm ring-1 ring-slate-200 rounded-lg overflow-hidden mx-auto" style={{ maxWidth: '210mm' }}>
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title="Editor WYSIWYG"
                    onLoad={(e) => {
                      // Asegurar designMode on en caso de recarga
                      const doc = (e.target as HTMLIFrameElement).contentDocument;
                      if (doc) doc.designMode = 'on';
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
