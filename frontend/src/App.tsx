import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Download, Calculator, FileText, CheckCircle, UploadCloud, TrendingUp, BarChart3, Users, Save, ShieldAlert, LayoutDashboard, Database, UserCheck, Check, Edit2, Loader2, PlayCircle, RefreshCw, AlertTriangle, Layers, Plus, Edit, X, ChevronDown, ChevronUp, ChevronsUpDown, Play, BookOpen, Mail, Settings } from 'lucide-react';
// @ts-ignore
import '@fontsource/lato';
import Simulator from './components/Simulator';
import Hub from './components/Hub';
import Wizard from './components/Wizard';
import ModelsGuide from './components/ModelsGuide';
import Comparator from './components/Comparator';
import VariablesHub from './components/VariablesHub';
import Envios from './components/Envios';
import ConfigPanel from './components/ConfigPanel';
import { MONTHS } from './constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getUnBadgeClass = (tipo: string) => {
  const t = (tipo || '').toUpperCase().trim();
  if (t.includes('CRIA') || t.includes('CRÍA')) {
    return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  }
  if (t === 'MAG') {
    return 'bg-green-50 text-green-700 border border-green-200';
  }
  if (t === 'INVERNADA NEO' || t.includes('NEO')) {
    return 'bg-red-600 text-white border border-red-700 font-black shadow-sm';
  }
  if (t === 'INVERNADA') {
    return 'bg-red-900 text-white border border-red-950 font-bold';
  }
  if (t === 'FAENA' || t.includes('FAENA')) {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }
  if (t.includes('INVERNADA')) {
    return 'bg-red-900 text-white border border-red-950 font-bold';
  }
  return 'bg-gray-100 text-gray-800 border border-gray-300';
};

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const sharedAgent = searchParams.get('agente');
  const sharedYear = searchParams.get('year');
  const sharedMonth = searchParams.get('month');
  const isReadonly = searchParams.get('readonly') === 'true';
  const isSimulador = searchParams.get('simulador') === 'true';
  const isRestricted = !!sharedAgent || isReadonly || isSimulador;

  const [activeTab, setActiveTab] = useState<'cierre' | 'simulador' | 'resumen' | 'roster' | 'cuentas' | 'hub' | 'comparador' | 'wizard' | 'manuales' | 'variables' | 'envios' | 'config'>((isReadonly || isSimulador) ? 'simulador' : 'hub');

  useEffect(() => {
    // Inject print styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
        .print-break-inside-avoid { break-inside: avoid; }
        #root { width: 100%; zoom: 0.62; }
        .print-hide-lotes { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [rosterData, setRosterData] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Roster Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [showFullGrid, setShowFullGrid] = useState(false);
  const [modalTab, setModalTab] = useState<'personales' | 'zonificacion' | 'operativa' | 'reglas'>('personales');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  
  // Cuentas Especiales State
  const [cuentasEspeciales, setCuentasEspeciales] = useState<any[]>([]);
  const [newCuenta, setNewCuenta] = useState<any>({ agente: 'Lucila Frutos', tipo_cuenta: 'Mermas', razon_social: '', cuit: '', ac_metabase: '', porcentaje: 0 });
  
  // Período Activo
  const [activeYear, setActiveYear] = useState(sharedYear || new Date().getFullYear().toString());
  const [activeMonth, setActiveMonth] = useState(sharedMonth || (new Date().getMonth() + 1).toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Resumen General table sort state
  const [resumenSortKey, setResumenSortKey] = useState<string | null>(null);
  const [resumenSortDir, setResumenSortDir] = useState<'asc' | 'desc'>('asc');

  // Lotes table sort state
  const [lotesSortKey, setLotesSortKey] = useState<string | null>(null);
  const [lotesSortDir, setLotesSortDir] = useState<'asc' | 'desc'>('asc');

  // WYSIWYG Editor para Liquidaciones
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [savingOverride, setSavingOverride] = useState(false);

  const expectedSnapshotName = `cierre_${activeYear}_${activeMonth.padStart(2, '0')}.json`;
  const isSnapshotAvailable = snapshots.includes(expectedSnapshotName);

  const fetchSnapshots = () => {
    return fetch(`${API_URL}/snapshots`)
      .then(res => res.json())
      .then(files => {
        setSnapshots(files);
      });
  };

  useEffect(() => {
    fetchSnapshots();
    fetch(`${API_URL}/roster`)
      .then(res => res.json())
      .then(data => setRosterData(data))
      .catch(console.error);
    fetch(`${API_URL}/cuentas`)
      .then(res => res.json())
      .then(data => setCuentasEspeciales(data))
      .catch(console.error);
    fetch(`${API_URL}/config-models/models`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAvailableModels(data.models || []);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isSnapshotAvailable) {
      fetch(`${API_URL}/snapshots/${expectedSnapshotName}`)
        .then(res => res.json())
        .then(jsonData => {
          setData(jsonData);
          const activeAgents = jsonData
            .map((d: any) => d.asociadoComercial)
            .sort();
          setAgents(activeAgents);
          if (isRestricted && activeAgents.includes(sharedAgent)) {
              setSelectedAgent(sharedAgent as string);
          } else if (activeAgents.length > 0 && !activeAgents.includes(selectedAgent)) {
            setSelectedAgent(activeAgents[0]);
          }
        });
    } else {
      setData([]);
    }
  }, [isSnapshotAvailable, expectedSnapshotName, isRestricted, sharedAgent, selectedAgent]);

  const refreshSnapshotData = () => {
    if (isSnapshotAvailable) {
      fetch(`${API_URL}/snapshots/${expectedSnapshotName}`)
        .then(res => res.json())
        .then(jsonData => {
          setData(jsonData);
        });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: parseInt(activeYear), month: parseInt(activeMonth) })
      });
      if (res.ok) {
        // We do not have state setters for these constants, they are derived.
        fetchSnapshots();
        alert("Cierre dinámico generado y guardado.");
      } else {
        const text = await res.text();
        alert("Error: " + text);
      }
    } catch (e) {
      alert("Error al generar cierre");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAgent)
      });
      if (res.ok) {
        setIsModalOpen(false);
        // Refresh roster
        fetch(`${API_URL}/roster`)
          .then(r => r.json())
          .then(data => setRosterData(data));
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch(err) {
      alert("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCuenta.razon_social && !newCuenta.cuit) return alert("Falta Razón Social o CUIT");
    
    const updatedCuentas = [...cuentasEspeciales, { ...newCuenta, id: Date.now().toString() }];
    try {
      await fetch(`${API_URL}/cuentas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCuentas)
      });
      setCuentasEspeciales(updatedCuentas);
      setNewCuenta({ agente: 'Lucila Frutos', tipo_cuenta: 'Mermas', razon_social: '', cuit: '', porcentaje: 0 });
    } catch(e) {
      alert("Error guardando cuenta");
    }
  };

  const handleDeleteCuenta = async (id: string) => {
    const updatedCuentas = cuentasEspeciales.filter(c => c.id !== id);
    try {
      await fetch(`${API_URL}/cuentas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCuentas)
      });
      setCuentasEspeciales(updatedCuentas);
    } catch(e) {
      alert("Error eliminando cuenta");
    }
  };

  const activeData = data.find(d => d.asociadoComercial === selectedAgent);

  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const fmtPct = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 2 });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedRosterData = [...rosterData].filter((agent) => 
    agent.nombre.toLowerCase().includes(rosterSearch.toLowerCase()) || 
    (agent.codigo || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (agent.oficina || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (agent.email || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (agent.idsUsuarios || '').toLowerCase().includes(rosterSearch.toLowerCase())
  ).sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = String(a[sortConfig.key] || '').toLowerCase();
    const bVal = String(b[sortConfig.key] || '').toLowerCase();
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredAgents = agents.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Resumen General sorting ---
  const handleResumenSort = (key: string) => {
    if (resumenSortKey === key) {
      setResumenSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setResumenSortKey(key);
      setResumenSortDir('asc');
    }
  };

  const sortedResumenData = useMemo(() => {
    const arr = [...data];
    if (!resumenSortKey) return arr.sort((a, b) => b.cierreReal - a.cierreReal);
    return arr.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (resumenSortKey === 'componenteP') {
        aVal = (a.fijo || 0) + (a.variable_personal || 0);
        bVal = (b.fijo || 0) + (b.variable_personal || 0);
      } else if (resumenSortKey === 'descuentos') {
        const deducA = (a.reintegroMovilidad > 0 ? a.gastosMkt : 0);
        aVal = deducA + (a.amortizacioneDcac || 0) - (a.reintegroMovilidad || 0) - (a.ajustes || 0);
        const deducB = (b.reintegroMovilidad > 0 ? b.gastosMkt : 0);
        bVal = deducB + (b.amortizacioneDcac || 0) - (b.reintegroMovilidad || 0) - (b.ajustes || 0);
      } else {
        aVal = a[resumenSortKey];
        bVal = b[resumenSortKey];
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      if (aVal < bVal) return resumenSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return resumenSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, resumenSortKey, resumenSortDir]);

  // --- Lotes sorting ---
  const handleLotesSort = (key: string) => {
    if (lotesSortKey === key) {
      setLotesSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLotesSortKey(key);
      setLotesSortDir('asc');
    }
  };

  const sortedLotesData = useMemo(() => {
    const arr = [...(activeData?.operacionesDetalle || [])];
    if (!lotesSortKey) {
      return arr.sort((a, b) => (b.fecha_operacion || '').localeCompare(a.fecha_operacion || ''));
    }
    return arr.sort((a, b) => {
      let aVal: any = a[lotesSortKey];
      let bVal: any = b[lotesSortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      if (aVal < bVal) return lotesSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return lotesSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeData?.operacionesDetalle, lotesSortKey, lotesSortDir]);

  const ResumenSortIcon = ({ col }: { col: string }) => resumenSortKey === col ? (resumenSortDir === 'asc' ? <ChevronUp size={10} className="inline text-blue-500" /> : <ChevronDown size={10} className="inline text-blue-500" />) : <ChevronsUpDown size={10} className="inline text-gray-300" />;
  const LotesSortIcon = ({ col }: { col: string }) => lotesSortKey === col ? (lotesSortDir === 'asc' ? <ChevronUp size={10} className="inline text-blue-500" /> : <ChevronDown size={10} className="inline text-blue-500" />) : <ChevronsUpDown size={10} className="inline text-gray-300" />;

  const uniqueResponsables = useMemo(() => {
    const reps = new Set<string>();
    rosterData.forEach(r => {
      if (r.responsableDC) reps.add(r.responsableDC.trim());
    });
    return Array.from(reps).sort();
  }, [rosterData]);

  const exportToCSV = () => {
    const headers = [
      "Comercial Asignado", "Id_lote", "Tipo", "Fecha_operacion", "Sociedad_vendedora", "Sociedad_compradora", 
      "Cantidad", "Categoria", "Importe Vendedor", "Importe Comprador", "Rendimiento", "Rend Topeado", 
      "Resultado Topeado Venta", "Ganancia Venta"
    ];

    let tsvContent = headers.join("\t") + "\n";

    data.forEach(agent => {
        agent.operacionesDetalle?.forEach((lote: any) => {
            const row = [
                agent.asociadoComercial,
                lote.id_lote,
                lote.tipo,
                lote.fecha_operacion,
                lote.sociedad_vendedora,
                lote.sociedad_compradora,
                lote.cantidad,
                lote.categoria || '',
                lote.importe_vendedor || 0,
                lote.importe_comprador || 0,
                lote.rendimiento_real || 0,
                lote.rendimiento_topeado || 0,
                lote.resultado_topeado_venta || 0,
                lote.ganancia_personal_venta || 0
            ];
            tsvContent += row.join("\t") + "\n";
        });
    });

    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cierre_${activeYear}_${activeMonth.padStart(2, '0')}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navigationTabs = [
    { id: 'hub', label: 'Hub Principal', icon: LayoutDashboard },
    { id: 'cierre', label: 'Liquidación', icon: FileText },
    { id: 'resumen', label: 'Consolidado', icon: BarChart3 },
    { id: 'variables', label: 'Variables', icon: Layers },
    { id: 'comparador', label: 'Validador', icon: RefreshCw },
    { id: 'cuentas', label: 'Cuentas', icon: Database },
    { id: 'simulador', label: 'Simulador', icon: Calculator },
    { id: 'manuales', label: 'Manuales', icon: BookOpen },
    { id: 'envios', label: 'Envíos', icon: Mail },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f4f4f7] text-[#1d1d1f] antialiased overflow-x-hidden">
      {/* Header Premium Glassmorphic */}
      {!isRestricted && (
      <header className="bg-white/75 backdrop-blur-xl border-b border-slate-200/40 sticky top-0 z-50 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
        <div className="max-w-[96%] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Marca */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('hub')}>
            <div className="bg-slate-950 text-white p-2 rounded-xl shadow-md border border-white/10 flex items-center justify-center transition-transform active:scale-95">
              <TrendingUp size={18} strokeWidth={2.5} className="text-[#ff3b30]" />
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="font-extrabold text-sm tracking-tight leading-none text-slate-900">deCampo aCampo</span>
              <span className="text-[9px] text-[#86868b] font-bold tracking-wider uppercase mt-1">Control de Gestión</span>
            </div>
          </div>
          
          {/* Barra de Pestañas Estilo Apple/Tesla Segmented Control */}
          <nav className="flex items-center gap-0.5 bg-slate-200/50 p-1 rounded-2xl border border-slate-200/20 relative z-10 overflow-x-auto scrollbar-hide max-w-full print:hidden">
            {navigationTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 shrink-0 z-10 whitespace-nowrap select-none ${
                    isActive ? 'text-slate-950 font-extrabold' : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  <TabIcon size={14} className={`transition-colors duration-300 ${isActive ? 'text-[#ff3b30]' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeHeaderTab"
                      className="absolute inset-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/60 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Acciones y Selectores */}
          <div className="flex gap-2.5 items-center p-1 bg-slate-200/40 rounded-2xl border border-slate-200/20 shrink-0 print:hidden">
            <div className="relative flex items-center bg-white border border-slate-200/60 shadow-sm rounded-xl px-2 py-1">
              <select 
                className="appearance-none bg-transparent pl-2 pr-6 py-0.5 text-xs font-extrabold text-slate-800 outline-none cursor-pointer select-none" 
                value={activeMonth} 
                onChange={e => setActiveMonth(e.target.value)}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i+1}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 text-slate-400 pointer-events-none" size={10} />
            </div>
            
            <div className="relative flex items-center bg-white border border-slate-200/60 shadow-sm rounded-xl px-2 py-1">
              <select 
                className="appearance-none bg-transparent pl-2 pr-6 py-0.5 text-xs font-extrabold text-slate-800 outline-none cursor-pointer select-none" 
                value={activeYear} 
                onChange={e => setActiveYear(e.target.value)}
              >
                <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
              </select>
              <ChevronDown className="absolute right-2 text-slate-400 pointer-events-none" size={10} />
            </div>
            
            {isSnapshotAvailable && activeTab === 'cierre' && (
              <button 
                onClick={exportToCSV}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-900 text-white hover:bg-black hover:shadow-md active:scale-95 border border-white/5 shadow-sm"
                title="Exportar TSV para pegar en Google Sheets"
              >
                <Download size={12} />
                <span className="hidden md:inline">Exportar</span>
              </button>
            )}

            {activeTab !== 'wizard' && (
              <button 
                onClick={() => setActiveTab('wizard')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-[#2997ff] hover:bg-[#147ddb] text-white hover:shadow-md active:scale-95 shadow-sm"
              >
                <Play size={12} />
                <span className="hidden md:inline">Asistente</span>
              </button>
            )}

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95 ${isSnapshotAvailable ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-[#ff3b30] hover:bg-[#e02b20] text-white'}`}
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : (isSnapshotAvailable ? <RefreshCw size={12}/> : null)}
              <span>{isSnapshotAvailable ? 'Actualizar' : 'Calcular'}</span>
            </button>
          </div>
        </div>
      </header>
      )}

      <main className={`max-w-[95%] mx-auto ${activeTab === 'roster' ? 'pt-2 pb-8' : 'py-8'}`}>
        
        {activeTab === 'wizard' && (
          <Wizard 
            API_URL={API_URL} 
            setActiveTab={setActiveTab} 
            activeMonth={activeMonth} 
            setActiveMonth={setActiveMonth} 
            activeYear={activeYear} 
            setActiveYear={setActiveYear} 
            handleGenerate={handleGenerate} 
            isGenerating={isGenerating} 
            cuentasEspeciales={cuentasEspeciales}
          />
        )}
        
        <div style={{ display: activeTab === 'simulador' ? 'block' : 'none' }}><Simulator activeMonth={activeMonth} activeYear={activeYear} /></div>
        {activeTab === 'comparador' && <Comparator API_URL={API_URL} activeData={activeData} activeMonth={activeMonth} activeYear={activeYear} selectedAgent={selectedAgent} />}
        {activeTab === 'hub' && <Hub API_URL={API_URL} setActiveTab={setActiveTab} activeYear={activeYear} activeMonth={activeMonth} />}
        {activeTab === 'variables' && <VariablesHub API_URL={API_URL} activeYear={activeYear} activeMonth={activeMonth} data={data} onRefresh={refreshSnapshotData} />}
        {activeTab === 'manuales' && <ModelsGuide setActiveTab={setActiveTab} API_URL={API_URL} />}
        {activeTab === 'envios' && <Envios API_URL={API_URL} activeYear={activeYear} activeMonth={activeMonth} data={data} onRefresh={refreshSnapshotData} />}
        {activeTab === 'config' && <ConfigPanel API_URL={API_URL} activeYear={activeYear} activeMonth={activeMonth} />}

        {activeTab === 'roster' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-full mt-2 relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="bg-gray-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div>
                 <h2 className="text-white font-bold text-lg">Red Comercial Activa (Roster)</h2>
                 <span className="text-gray-400 text-sm font-medium">{rosterData.filter((r: any) => r.activo).length} Agentes Activos</span>
               </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search size={14} className="text-gray-400" />
                   </div>
                   <input
                     type="text"
                     placeholder="Buscar comercial..."
                     value={rosterSearch}
                     onChange={(e) => setRosterSearch(e.target.value)}
                     className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-gray-500 transition-colors"
                   />
                 </div>
                 <button 
                   onClick={() => setShowFullGrid(!showFullGrid)}
                   className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap border border-gray-700"
                 >
                   <FileText size={16} /> {showFullGrid ? 'Vista Simple' : 'Grilla Completa'}
                 </button>
                 <button 
                   onClick={() => { setEditingAgent({ activo: true, mendel: false, auto: false }); setIsModalOpen(true); }}
                   className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                 >
                   <Plus size={16} /> Nuevo
                 </button>
               </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200">
                  <th className="py-3 px-4 font-bold cursor-pointer sticky left-0 bg-gray-100 border-r border-gray-200 shadow-[4px_0_10px_rgba(0,0,0,0.08)] z-30 hover:bg-gray-200" onClick={() => handleSort('nombre')}>Comercial {sortConfig?.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('codigo')}>Cod {sortConfig?.key === 'codigo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('provincia')}>Provincia {sortConfig?.key === 'provincia' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('partido')}>Partido {sortConfig?.key === 'partido' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('oficina')}>Oficina {sortConfig?.key === 'oficina' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tipo')}>Tipo {sortConfig?.key === 'tipo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('modalidad')}>Modalidad {sortConfig?.key === 'modalidad' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('escalas')}>Escalas {sortConfig?.key === 'escalas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('detalleEscalas')}>Detalle Escalas {sortConfig?.key === 'detalleEscalas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('activo')}>Estado {sortConfig?.key === 'activo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('link')}>Link {sortConfig?.key === 'link' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tier')}>Tier {sortConfig?.key === 'tier' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ingreso')}>Ingreso {sortConfig?.key === 'ingreso' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('auto')}>Auto {sortConfig?.key === 'auto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('mendel')}>Mendel {sortConfig?.key === 'mendel' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('responsableDC')}>Resp. DC {sortConfig?.key === 'responsableDC' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('operadorFaena')}>Op FAENA {sortConfig?.key === 'operadorFaena' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('operadorInv')}>Op INV {sortConfig?.key === 'operadorInv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('operadorInvNeo')}>Op INV NEO {sortConfig?.key === 'operadorInvNeo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('operadorCria')}>Op CRIA {sortConfig?.key === 'operadorCria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('beneficios')}>Beneficios {sortConfig?.key === 'beneficios' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  <th className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('categoria')}>Cat. {sortConfig?.key === 'categoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grupoFamiliar')}>Grupo Fam. {sortConfig?.key === 'grupoFamiliar' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('lat')}>Lat {sortConfig?.key === 'lat' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('long')}>Long {sortConfig?.key === 'long' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('nombreOriginal')}>Nombre Orig. {sortConfig?.key === 'nombreOriginal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('departamento')}>Depto {sortConfig?.key === 'departamento' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  {showFullGrid && <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('deptoId')}>Depto ID {sortConfig?.key === 'deptoId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>}
                  <th className="py-3 px-4 font-bold text-center sticky right-0 bg-gray-50 border-l border-gray-200 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-20">Acción</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {sortedRosterData.map((agent: any, i) => (
                  <tr key={i} className={`group border-b border-gray-100 transition-colors ${!agent.activo ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <td className={`py-2.5 px-4 font-bold text-gray-900 sticky left-0 z-10 border-r border-gray-200 shadow-[4px_0_10px_rgba(0,0,0,0.08)] ${!agent.activo ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'}`}>{agent.nombre}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-gray-500">{agent.codigo || '--'}</td>
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600">{agent.provincia || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600">{agent.partido || '--'}</td>}
                    <td className="py-2.5 px-4 font-medium text-gray-700">{agent.oficina || '--'}</td>
                    <td className="py-2.5 px-4 text-center">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${agent.tipo?.toLowerCase().includes('oficina') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{agent.tipo || '--'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 truncate max-w-[200px]" title={agent.modalidad}>{agent.modalidad || '--'}</td>
                    <td className="py-2.5 px-4 text-gray-600">{agent.escalas || '--'}</td>
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.detalleEscalas}>{agent.detalleEscalas || '--'}</td>}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${agent.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {agent.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.link}>
                       {agent.link ? <a href={agent.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link</a> : '--'}
                    </td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.tier}>{agent.tier || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-center text-gray-500">{agent.ingreso ? new Date(agent.ingreso).toLocaleDateString() : '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.email}>{agent.email || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${agent.auto === 'Si' || agent.auto === true ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                        {agent.auto === 'Si' || agent.auto === true ? 'SÍ' : 'NO'}
                      </span>
                    </td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${agent.mendel === 'Si' || agent.mendel === true ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                        {agent.mendel === 'Si' || agent.mendel === true ? 'SÍ' : 'NO'}
                      </span>
                    </td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.responsableDC}>{agent.responsableDC || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.operadorFaena}>{agent.operadorFaena || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.operadorInv}>{agent.operadorInv || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.operadorInvNeo}>{agent.operadorInvNeo || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.operadorCria}>{agent.operadorCria || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.beneficios}>{agent.beneficios || '--'}</td>}
                    <td className="py-2.5 px-4 text-center font-bold text-blue-700">{agent.categoria || '--'}</td>
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.grupoFamiliar}>{agent.grupoFamiliar || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.lat}>{agent.lat || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[100px]" title={agent.long}>{agent.long || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600 truncate max-w-[150px]" title={agent.nombreOriginal}>{agent.nombreOriginal || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600">{agent.departamento || '--'}</td>}
                    {showFullGrid && <td className="py-2.5 px-4 text-gray-600">{agent.deptoId || '--'}</td>}
                    <td className="py-2.5 px-4 text-center sticky right-0 bg-white border-l border-gray-100 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                      <button 
                        onClick={() => { setEditingAgent(agent); setIsModalOpen(true); }}
                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'cuentas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-full overflow-x-auto mt-2 p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex flex-col md:flex-row gap-8">
              
              <div className="w-full md:w-1/3">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Plus size={18} /> Nueva Cuenta
                  </h3>
                  <form onSubmit={handleSaveCuenta} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Comercial</label>
                      <select 
                        value={newCuenta.agente}
                        onChange={e => setNewCuenta({...newCuenta, agente: e.target.value})}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Lucila Frutos">Luli Frutos</option>
                        <option value="Agustin Acuna">Agustín Acuña</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Razón Social Exacta</label>
                      <input 
                        type="text"
                        value={newCuenta.razon_social}
                        onChange={e => setNewCuenta({...newCuenta, razon_social: e.target.value})}
                        placeholder="Ej: AGROPECUARIA S.A."
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">CUIT (Opcional)</label>
                      <input 
                        type="text"
                        value={newCuenta.cuit}
                        onChange={e => setNewCuenta({...newCuenta, cuit: e.target.value})}
                        placeholder="30-12345678-9"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1">AC de Metabase (Opcional)</label>
                      <input 
                        type="text"
                        value={newCuenta.ac_metabase}
                        onChange={e => setNewCuenta({...newCuenta, ac_metabase: e.target.value})}
                        placeholder="Ej: JUAN PEREZ"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {newCuenta.agente === 'Lucila Frutos' ? (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tipo de Cuenta (Luli)</label>
                        <select 
                          value={newCuenta.tipo_cuenta}
                          onChange={e => setNewCuenta({...newCuenta, tipo_cuenta: e.target.value})}
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Mermas">Mermas (15% Invernada / 20% Faena)</option>
                          <option value="Activacion CI">Activación CI (10% Compra)</option>
                          <option value="Grandes Cuentas">Grandes Cuentas (4% Venta / 2% Compra)</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Porcentaje Fijo (Acuña)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            step="0.01"
                            value={newCuenta.porcentaje}
                            onChange={e => setNewCuenta({...newCuenta, porcentaje: parseFloat(e.target.value) || 0})}
                            placeholder="Ej: 12"
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 font-bold">%</span>
                        </div>
                      </div>
                    )}

                    <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2 rounded-lg transition-colors mt-2">
                      Agregar Cuenta
                    </button>
                  </form>
                </div>
              </div>

              <div className="w-full md:w-2/3">
                 <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Listado de Cuentas Activas</h2>
                 {cuentasEspeciales.length === 0 ? (
                   <p className="text-gray-500 italic">No hay cuentas cargadas.</p>
                 ) : (
                   <div className="overflow-x-auto rounded-xl border border-gray-200">
                     <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                       <thead className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wider font-bold">
                         <tr>
                           <th className="py-2 px-3">Agente</th>
                           <th className="py-2 px-3">Razón Social</th>
                           <th className="py-2 px-3">CUIT</th>
                           <th className="py-2 px-3">AC Metabase</th>
                           <th className="py-2 px-3">Tipo / Config</th>
                           <th className="py-2 px-3 text-center">Operó en el mes</th>
                           <th className="py-2 px-3 text-center">Acciones</th>
                         </tr>
                       </thead>
                       <tbody>
                         {cuentasEspeciales.map((c, i) => {
                           const opero = data.some(agent => 
                              agent.operacionesDetalle && agent.operacionesDetalle.some((op: any) => 
                                (c.cuit && (op.cuit_comprador === c.cuit || op.cuit_vendedor === c.cuit)) || 
                                (c.razon_social && op.sociedad_compradora?.toLowerCase().includes(c.razon_social.toLowerCase())) ||
                                (c.razon_social && op.sociedad_vendedora?.toLowerCase().includes(c.razon_social.toLowerCase())) ||
                                (c.ac_metabase && (op.vendedor_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase()) || op.comprador_ac?.toLowerCase().includes(c.ac_metabase.toLowerCase()) || op.asociado_comercial?.toLowerCase().includes(c.ac_metabase.toLowerCase())))
                              )
                           );
                           return (
                           <tr key={c.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                             <td className="py-2.5 px-3 font-bold text-gray-900">{c.agente}</td>
                             <td className="py-2.5 px-3 font-semibold">{c.razon_social || '-'}</td>
                             <td className="py-2.5 px-3 text-gray-500">{c.cuit || '-'}</td>
                             <td className="py-2.5 px-3 text-gray-500">{c.ac_metabase || '-'}</td>
                             <td className="py-2.5 px-3">
                               {c.agente === 'Lucila Frutos' ? (
                                 <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-[10px] font-bold tracking-wide">{c.tipo_cuenta}</span>
                               ) : (
                                 <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-[10px] font-bold tracking-wide">{c.porcentaje}% Fijo</span>
                               )}
                             </td>
                             <td className="py-2.5 px-3 text-center font-bold">
                               {opero ? <span className="text-green-600">✅ Sí</span> : <span className="text-red-500">❌ No</span>}
                             </td>
                             <td className="py-2.5 px-3 text-center">
                               <button 
                                 onClick={() => handleDeleteCuenta(c.id)}
                                 className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                 title="Eliminar"
                               >
                                 <X size={14} />
                               </button>
                             </td>
                           </tr>
                         );
                         })}
                       </tbody>
                     </table>
                   </div>
                 )}
              </div>
              
            </div>
          </motion.div>
        )}

        {activeTab === 'resumen' && isSnapshotAvailable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden w-full overflow-x-auto mt-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
               <h2 className="text-white font-bold text-lg">Resumen General de Liquidaciones</h2>
               <span className="text-gray-400 text-sm font-medium">{MONTHS[Number(activeMonth)-1]} {activeYear}</span>
            </div>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200">
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleResumenSort('asociadoComercial')}>Comercial <ResumenSortIcon col="asociadoComercial" /></th>
                  <th className="py-3 px-4 font-bold cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleResumenSort('modalidad')}>Categoría <ResumenSortIcon col="modalidad" /></th>
                  <th className="py-3 px-3 font-bold text-center bg-gray-100/50 cursor-pointer hover:bg-gray-200/60 select-none" onClick={() => handleResumenSort('cabezasGeneral')}>Cab. Personales <ResumenSortIcon col="cabezasGeneral" /></th>
                  <th className="py-3 px-3 font-bold text-center bg-gray-100/50 cursor-pointer hover:bg-gray-200/60 select-none" onClick={() => handleResumenSort('minimo')}>Mínimo <ResumenSortIcon col="minimo" /></th>
                  <th className="py-3 px-3 font-bold text-right bg-green-50/50 text-green-800 cursor-pointer hover:bg-green-100/60 select-none" onClick={() => handleResumenSort('componenteP')}>C. Personal <ResumenSortIcon col="componenteP" /></th>
                  <th className="py-3 px-3 font-bold text-right bg-teal-50/50 text-teal-800 cursor-pointer hover:bg-teal-100/60 select-none" onClick={() => handleResumenSort('componenteR')}>C. Regional <ResumenSortIcon col="componenteR" /></th>
                  <th className="py-3 px-3 font-bold text-right bg-blue-50/50 text-blue-800 cursor-pointer hover:bg-blue-100/60 select-none" onClick={() => handleResumenSort('componenteO')}>C. Oficina <ResumenSortIcon col="componenteO" /></th>
                  <th className="py-3 px-4 font-bold text-right text-gray-900 border-l border-gray-200 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleResumenSort('resultado')}>Sueldo / Resultado <ResumenSortIcon col="resultado" /></th>
                  <th className="py-3 px-3 font-bold text-right text-red-600 cursor-pointer hover:bg-red-50/60 select-none" onClick={() => handleResumenSort('descuentos')}>Descuentos <ResumenSortIcon col="descuentos" /></th>
                  <th className="py-3 px-4 font-bold text-right text-green-700 border-l border-green-200 bg-green-50 cursor-pointer hover:bg-green-100/60 select-none" onClick={() => handleResumenSort('cierreReal')}>Neto a Facturar <ResumenSortIcon col="cierreReal" /></th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {sortedResumenData.map((agent, i) => {
                   const deduccionMendel = agent.reintegroMovilidad > 0 ? agent.gastosMkt : 0;
                   const descuentos = deduccionMendel + agent.amortizacioneDcac - agent.reintegroMovilidad - agent.ajustes;
                   return (
                     <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                       <td className="py-2.5 px-4 font-bold text-gray-900">{agent.asociadoComercial}</td>
                       <td className="py-2.5 px-4 text-gray-500 truncate max-w-[150px]" title={agent.modalidad || 'N/A'}>{agent.modalidad || '--'}</td>
                       <td className="py-2.5 px-3 text-center font-semibold bg-gray-50/50 text-gray-600">{Number(agent.cabezasGeneral).toLocaleString('es-AR')}</td>
                       <td className="py-2.5 px-3 text-center font-medium bg-gray-50/50 text-gray-500">{fmt.format(agent.minimo)}</td>
                       <td className="py-2.5 px-3 text-right font-bold bg-green-50/30 text-green-700">{fmt.format(agent.fijo + agent.variable_personal)}</td>
                       <td className="py-2.5 px-3 text-right font-bold bg-teal-50/30 text-teal-700">{fmt.format(agent.componenteR)}</td>
                       <td className="py-2.5 px-3 text-right font-bold bg-blue-50/30 text-blue-700">{fmt.format(agent.componenteO)}</td>
                       <td className="py-2.5 px-4 text-right font-black text-gray-800 border-l border-gray-100">{fmt.format(agent.resultado)}</td>
                       <td className="py-2.5 px-3 text-right font-bold text-red-500">{fmt.format(descuentos)}</td>
                       <td className="py-2.5 px-4 text-right font-black text-green-800 border-l border-green-100 bg-green-50/50">{fmt.format(agent.cierreReal)}</td>
                     </tr>
                   )
                })}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeTab === 'cierre' && (
          <>
            {!isSnapshotAvailable && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4"><Search className="text-gray-400" size={32}/></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay cierre calculado</h2>
                <p className="text-gray-500 mb-6">No se encontraron datos para {MONTHS[Number(activeMonth)-1]} {activeYear}. Hacé click en Calcular Mes para conectarse con Metabase y generar el cierre.</p>
                <button onClick={handleGenerate} className="bg-black text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-gray-800 transition hover:scale-105 active:scale-95">
                  Calcular {MONTHS[Number(activeMonth)-1]} {activeYear} ahora
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isSnapshotAvailable && activeData && (
                <motion.div
                  key={`${activeYear}-${activeMonth}-${selectedAgent}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Controles de Agente */}
                  <div className="flex flex-wrap gap-4 items-center mb-8 z-40 relative print:hidden">
                    {isRestricted ? (
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2">
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Comercial</span>
                        <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                        <span className="text-lg font-bold text-gray-900 min-w-[200px] text-left">{selectedAgent}</span>
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2 cursor-pointer hover:border-gray-300 transition-colors transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Comercial</span>
                          <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                          <span className="text-lg font-bold text-gray-900 min-w-[200px] text-left">{selectedAgent || 'Seleccionar...'}</span>
                          <ChevronDown className="text-gray-400" size={18} />
                        </div>
                        
                        {/* Dropdown flotante */}
                        <div className="absolute top-[110%] left-0 w-[350px] bg-white border border-gray-200 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] transform origin-top-left overflow-hidden">
                          <div className="p-3 border-b border-gray-100 bg-gray-50">
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                              <input 
                                type="text" 
                                placeholder="Buscar comercial..." 
                                className="w-full bg-gray-100/80 border-none rounded-xl pl-10 pr-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                onChange={(e) => setSearchTerm(e.target.value)}
                                value={searchTerm}
                              />
                            </div>
                          </div>
                          <div className="max-h-[50vh] overflow-y-auto p-2 scrollbar-hide">
                            {filteredAgents.length === 0 && (
                              <div className="p-4 text-center text-gray-500 text-sm">No se encontraron resultados</div>
                            )}
                            {filteredAgents.map(a => (
                              <div 
                                key={a} 
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${selectedAgent === a ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                onClick={() => {
                                  setSelectedAgent(a);
                                  setSearchTerm('');
                                  (document.activeElement as HTMLElement)?.blur();
                                }}
                              >
                                {a}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 bg-gray-50/80 border border-gray-200/50 rounded-lg px-5 py-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Categoría / Mod.</div>
                        <div className="text-sm font-semibold text-gray-800">{activeData?.categoria || '--'} / {activeData?.modalidad || '--'}</div>
                      </div>
                      <div className="h-6 w-[1px] bg-gray-200"></div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Oficina</div>
                        <div className="text-sm font-semibold text-gray-800">{activeData?.oficina || '--'}</div>
                      </div>
                      <div className="h-6 w-[1px] bg-gray-200"></div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Movilidad</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {activeData?.kms ? `${activeData.kms} kms` : '--'}
                          {activeData?.auto ? ` (${activeData.auto.charAt(0).toUpperCase() + activeData.auto.slice(1)})` : ''}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white shadow-sm border border-gray-200 rounded-lg px-6 py-4 mb-4 mt-4 w-full">
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Concreción</span>
                        <span className="text-xl font-black text-gray-900">{Number(activeData?.tropasGeneral || 0).toLocaleString('es-AR')} Tropas</span>
                      </div>
                      <div className="h-10 w-[1px] bg-gray-200"></div>
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cabezas Totales</span>
                        <span className="text-xl font-black text-gray-900">{Number(activeData?.cabezasGeneral || 0).toLocaleString('es-AR')}</span>
                      </div>
                      <div className="h-10 w-[1px] bg-gray-200"></div>
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Rend. Promedio</span>
                        <span className="text-xl font-black text-blue-600">{fmtPct.format((activeData?.rendimientoGen || 0)/100)}</span>
                      </div>
                      <div className="h-10 w-[1px] bg-gray-200"></div>
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ganancia Neta Empresa</span>
                        <span className="text-xl font-black text-[#2e5e22]">{fmt.format(activeData?.resultado_final_ajustado || 0)}</span>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center w-full justify-end">
                      <button 
                        onClick={async () => {
                          if (isGeneratingPdf) return;
                          setIsGeneratingPdf(true);
                          try {
                            const res = await fetch(`${API_URL}/dispatch/preview-pdf/${encodeURIComponent(selectedAgent)}?year=${activeYear}&month=${activeMonth}`);
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
                            setIsGeneratingPdf(false);
                          }
                        }}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors shadow-sm disabled:opacity-50 active:scale-95"
                      >
                        {isGeneratingPdf ? (
                          <>
                            <Loader2 className="animate-spin" size={14} /> Generando PDF...
                          </>
                        ) : (
                          <>
                            <Download size={14} /> Imprimir / PDF
                          </>
                        )}
                      </button>

                      <button
                        onClick={async () => {
                          if (!iframeRef.current || !iframeRef.current.contentWindow) return;
                          setSavingOverride(true);
                          try {
                            const htmlContent = iframeRef.current.contentWindow.document.documentElement.outerHTML;
                            const res = await fetch(`${API_URL}/dispatch/override/${encodeURIComponent(selectedAgent)}?year=${activeYear}&month=${activeMonth}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ html: htmlContent })
                            });
                            if (res.ok) {
                              alert("Cambios guardados correctamente. El próximo PDF o Mail usará esta versión.");
                            } else {
                              alert("Error al guardar los cambios.");
                            }
                          } catch(e) {
                            alert("Error de red al guardar.");
                          } finally {
                            setSavingOverride(false);
                          }
                        }}
                        disabled={savingOverride}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {savingOverride ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar Edición Manual
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full mt-2 transition-all duration-300">
                    <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                        <FileText size={16} className="text-blue-500" />
                        Editor de Liquidación de Cierre
                      </h3>
                      <span className="text-[10px] text-gray-500 font-bold hidden sm:inline">
                        Este documento es 100% editable. Hacé click en cualquier texto o número para cambiarlo.
                      </span>
                    </div>
                    <div className="p-4 bg-slate-100 flex justify-center items-center" style={{ minHeight: '600px' }}>
                      <iframe 
                        ref={iframeRef as any}
                        src={`${API_URL}/dispatch/preview-html/${encodeURIComponent(selectedAgent)}?year=${activeYear}&month=${activeMonth}`} 
                        className="w-full rounded-lg border border-gray-300 shadow-md bg-white"
                        style={{ height: '1100px', border: 'none', maxWidth: '900px' }}
                        title={`Editor PDF - ${selectedAgent}`}
                        onLoad={(e) => {
                          const doc = (e.target as HTMLIFrameElement).contentDocument;
                          if (doc) {
                            doc.designMode = "on";
                            doc.body.style.cursor = "text";
                            const style = doc.createElement("style");
                            style.textContent = `
                              *:hover { outline: 1px dashed rgba(59, 130, 246, 0.5); }
                              *:focus { outline: 2px solid #3b82f6 !important; background: rgba(59, 130, 246, 0.05); }
                            `;
                            doc.head.appendChild(style);
                          }
                        }}
                      />
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Roster Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-gray-900 px-6 py-4 flex justify-between items-center shrink-0">
                 <h2 className="text-white font-bold text-lg flex items-center gap-2">
                   <Users size={18} /> {editingAgent?.nombre ? `Editar Comercial: ${editingAgent.nombre}` : 'Nuevo Comercial'}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                   <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSaveAgent} className="flex-1 overflow-hidden flex flex-col">
                <div className="flex border-b border-gray-200 bg-gray-50 px-6 shrink-0">
                  <button type="button" onClick={() => setModalTab('personales')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'personales' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Datos Personales</button>
                  <button type="button" onClick={() => setModalTab('zonificacion')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'zonificacion' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Zonificación</button>
                  <button type="button" onClick={() => setModalTab('operativa')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'operativa' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Config. Operativa</button>
                  <button type="button" onClick={() => setModalTab('reglas')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'reglas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Reglas de Negocio</button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                  {modalTab === 'personales' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                        <input required disabled={!!rosterData.find(r => r.nombre === editingAgent?.nombre)} type="text" value={editingAgent?.nombre || ''} onChange={e => setEditingAgent({...editingAgent, nombre: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Ej: Juan Perez" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Email (Mail Sheet)</label>
                        <input type="email" value={editingAgent?.mail || ''} onChange={e => setEditingAgent({...editingAgent, mail: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: juan.perez@dcac.ar" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Email (App/Notif)</label>
                        <input type="email" value={editingAgent?.email || ''} onChange={e => setEditingAgent({...editingAgent, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: juan.perez@dcac.ar" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Grupo Familiar</label>
                        <input type="text" value={editingAgent?.grupoFamiliar || ''} onChange={e => setEditingAgent({...editingAgent, grupoFamiliar: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Fecha de Ingreso</label>
                        <input type="text" value={editingAgent?.ingreso || ''} onChange={e => setEditingAgent({...editingAgent, ingreso: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 01/01/2023" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Link / Observaciones</label>
                        <input type="text" value={editingAgent?.link || ''} onChange={e => setEditingAgent({...editingAgent, link: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="URL al perfil o documento" />
                      </div>
                    </div>
                  )}

                  {modalTab === 'zonificacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Provincia</label>
                        <input type="text" value={editingAgent?.provincia || ''} onChange={e => setEditingAgent({...editingAgent, provincia: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Partido</label>
                        <input type="text" value={editingAgent?.partido || ''} onChange={e => setEditingAgent({...editingAgent, partido: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Departamento</label>
                        <input type="text" value={editingAgent?.departamento || ''} onChange={e => setEditingAgent({...editingAgent, departamento: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Depto ID</label>
                        <input type="text" value={editingAgent?.deptoId || ''} onChange={e => setEditingAgent({...editingAgent, deptoId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Oficina Regional</label>
                        <input type="text" value={editingAgent?.oficina || ''} onChange={e => setEditingAgent({...editingAgent, oficina: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Tandil" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Responsable DC</label>
                        <datalist id="responsable-list">
                          {uniqueResponsables.map(r => <option key={r} value={r} />)}
                        </datalist>
                        <input list="responsable-list" type="text" value={editingAgent?.responsableDC || ''} onChange={e => setEditingAgent({...editingAgent, responsableDC: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Selecciona o escribe uno nuevo" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Latitud</label>
                        <input type="text" value={editingAgent?.lat || ''} onChange={e => setEditingAgent({...editingAgent, lat: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Longitud</label>
                        <input type="text" value={editingAgent?.long || ''} onChange={e => setEditingAgent({...editingAgent, long: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}

                  {modalTab === 'operativa' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Código</label>
                        <input type="text" value={editingAgent?.codigo || ''} onChange={e => setEditingAgent({...editingAgent, codigo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: A012" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                        <datalist id="tipo-list">
                          <option value="Regional" />
                          <option value="City Manager" />
                          <option value="Corporate" />
                          <option value="Representante" />
                        </datalist>
                        <input list="tipo-list" type="text" value={editingAgent?.tipo || ''} onChange={e => setEditingAgent({...editingAgent, tipo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Selecciona o escribe uno nuevo" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Modalidad (Contrato)</label>
                        <datalist id="modalidad-list">
                          {availableModels.map(m => (
                            <option key={m.id} value={m.nombre} />
                          ))}
                        </datalist>
                        <input list="modalidad-list" type="text" value={editingAgent?.modalidad || ''} onChange={e => setEditingAgent({...editingAgent, modalidad: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Selecciona o escribe una nueva" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Categoría Numérica</label>
                        <input type="number" value={editingAgent?.categoria || ''} onChange={e => setEditingAgent({...editingAgent, categoria: Number(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Tier</label>
                        <input type="text" value={editingAgent?.tier || ''} onChange={e => setEditingAgent({...editingAgent, tier: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Tier 1" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">CUIT</label>
                        <input type="text" value={editingAgent?.cuit || ''} onChange={e => setEditingAgent({...editingAgent, cuit: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 20-30123456-7" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">IDs de Usuario (separados por coma)</label>
                        <input type="text" value={editingAgent?.idsUsuarios || ''} onChange={e => setEditingAgent({...editingAgent, idsUsuarios: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: acuna_v, acuna_comp" />
                      </div>
                      
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                         <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between h-full">
                           <div className="mb-2">
                             <h3 className="font-bold text-gray-900 text-sm">Estado Operativo</h3>
                             <p className="text-[10px] text-gray-500 leading-tight mt-1">Si está inactivo, no se computará en cierres.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer mt-auto">
                              <input type="checkbox" className="sr-only peer" checked={editingAgent?.activo || false} onChange={e => setEditingAgent({...editingAgent, activo: e.target.checked})} />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                           </label>
                         </div>
                         <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between h-full">
                           <div className="mb-2">
                             <h3 className="font-bold text-gray-900 text-sm">Tarjeta Mendel</h3>
                             <p className="text-[10px] text-gray-500 leading-tight mt-1">Habilita lectura de gastos de Mendel.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer mt-auto">
                              <input type="checkbox" className="sr-only peer" checked={editingAgent?.mendel === 'Si' || editingAgent?.mendel === true} onChange={e => setEditingAgent({...editingAgent, mendel: e.target.checked})} />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                           </label>
                         </div>
                         <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between h-full">
                           <div className="mb-2">
                             <h3 className="font-bold text-gray-900 text-sm">Vehículo Empresa</h3>
                             <p className="text-[10px] text-gray-500 leading-tight mt-1">Cobro de amortización DCAC vs KMS propio.</p>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer mt-auto">
                              <input type="checkbox" className="sr-only peer" checked={editingAgent?.auto === 'Si' || editingAgent?.auto === true} onChange={e => setEditingAgent({...editingAgent, auto: e.target.checked})} />
                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                           </label>
                         </div>
                      </div>
                    </div>
                  )}

                  {modalTab === 'reglas' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Escalas Aplicadas</label>
                        <input type="text" value={editingAgent?.escalas || ''} onChange={e => setEditingAgent({...editingAgent, escalas: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: AC" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Detalle Escalas</label>
                        <input type="text" value={editingAgent?.detalleEscalas || ''} onChange={e => setEditingAgent({...editingAgent, detalleEscalas: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Gastos Extra (Monto)</label>
                        <input type="text" value={editingAgent?.excepcionGastos || ''} onChange={e => setEditingAgent({...editingAgent, excepcionGastos: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Monto a descontar o descripción" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Beneficios</label>
                        <input type="text" value={editingAgent?.beneficios || ''} onChange={e => setEditingAgent({...editingAgent, beneficios: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      
                      <div className="md:col-span-2 pt-4 border-t border-gray-100 mt-2">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Permisos Operador (IDs)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Operador FAENA</label>
                            <input type="text" value={editingAgent?.operadorFaena || ''} onChange={e => setEditingAgent({...editingAgent, operadorFaena: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Operador INV</label>
                            <input type="text" value={editingAgent?.operadorInv || ''} onChange={e => setEditingAgent({...editingAgent, operadorInv: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Operador INV NEO</label>
                            <input type="text" value={editingAgent?.operadorInvNeo || ''} onChange={e => setEditingAgent({...editingAgent, operadorInvNeo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Operador CRIA</label>
                            <input type="text" value={editingAgent?.operadorCria || ''} onChange={e => setEditingAgent({...editingAgent, operadorCria: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSaving} className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;
