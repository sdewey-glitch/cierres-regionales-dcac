import React, { useState } from 'react';
import { Target, Users, Map, FileText, CheckCircle, Activity, ChevronRight, Calculator, RefreshCw, Layers, ArrowLeft, BarChart3, BookOpen, LayoutDashboard, Database, PlayCircle, ExternalLink, ArrowRight, Copy, Check, Share2, Heart, PieChart } from 'lucide-react';

export default function Estrategia({ setActiveTab }: { setActiveTab?: any }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    setActiveStep(0);
    
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step <= 3) {
        setActiveStep(step);
        setSimulationProgress((step / 3) * 100);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationProgress(100);
        setActiveStep(3);
      }
    }, 2000);
  };

  const steps = [
    {
      title: '1. Estrategia Inicial',
      short: 'Estrategia',
      description: 'Definición de objetivos, audiencia y creación de una estrategia de contenido clara.',
      color: 'from-[#9BB7D4] to-[#7A9BBF]',
      bgColor: 'bg-[#eef4f9]',
      borderColor: 'border-[#9BB7D4]',
      textColor: 'text-slate-700',
      icon: Target,
      details: {
        source: 'Brief de Marketing',
        freq: 'Revisión Trimestral',
        items: [
          { label: 'Definición de Audiencia', val: 'Identificación de buyer personas y segmentación del público objetivo.' },
          { label: 'Objetivos de Negocio', val: 'Establecimiento de KPIs claros (leads, engagement, ventas).' },
          { label: 'Pilares de Contenido', val: 'Temáticas principales que guiarán la creación visual.' }
        ]
      }
    },
    {
      title: '2. Creación y Distribución',
      short: 'Creación',
      description: 'Producción de contenido visual relevante y su distribución en las redes sociales.',
      color: 'from-[#D8C4E8] to-[#BFA1D9]',
      bgColor: 'bg-[#f7f2fb]',
      borderColor: 'border-[#D8C4E8]',
      textColor: 'text-slate-700',
      icon: Share2,
      details: {
        source: 'Equipo de Diseño',
        freq: 'Publicación Diaria',
        items: [
          { label: 'Diseño Visual', val: 'Creación de posts, reels y stories con alta retención.' },
          { label: 'Copywriting', val: 'Textos persuasivos y llamados a la acción (CTAs) efectivos.' },
          { label: 'Filtro de Redes Sociales', val: '¿El contenido es adecuado? Si NO, se ajusta y se vuelve a diseñar.' }
        ]
      }
    },
    {
      title: '3. Interacción y Fidelización',
      short: 'Interacción',
      description: 'Gestión de la comunidad, respuestas activas y conversión de seguidores a clientes fieles.',
      color: 'from-[#FADCD9] to-[#F5Beb7]',
      bgColor: 'bg-[#fef8f7]',
      borderColor: 'border-[#FADCD9]',
      textColor: 'text-slate-700',
      icon: Heart,
      details: {
        source: 'Community Management',
        freq: 'Interacción Continua',
        items: [
          { label: 'Respuestas Rápidas', val: 'Gestión de DMs y comentarios para aumentar la afinidad.' },
          { label: 'Construcción de Comunidad', val: 'Fomento del sentido de pertenencia y lealtad.' },
          { label: 'Validación de Fidelidad', val: '¿Son clientes fieles? Si NO, se intensifica la interacción activa.' }
        ]
      }
    },
    {
      title: '4. Análisis y Cierre',
      short: 'Análisis',
      description: 'Medición del rendimiento, evaluación de resultados y cierre del ciclo iterativo.',
      color: 'from-[#8DB4E2] to-[#6A9BCF]',
      bgColor: 'bg-[#f1f6fb]',
      borderColor: 'border-[#8DB4E2]',
      textColor: 'text-slate-700',
      icon: PieChart,
      details: {
        source: 'Herramientas de Analytics',
        freq: 'Reporte Mensual',
        items: [
          { label: 'Análisis de Rendimiento', val: 'Revisión de métricas de alcance, conversión y ROI.' },
          { label: 'Evaluación de Resultados', val: '¿Tienes buenos resultados? Si NO, se reinicia la estrategia.' },
          { label: 'Consolidación (FIN)', val: 'Si los resultados son positivos, el ciclo se consolida exitosamente.' }
        ]
      }
    }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24 mt-8 px-4">
      <div className="flex flex-col gap-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <LayoutDashboard size={24} className="text-[#9BB7D4]" />
            Flujo de Estrategia de Negocio
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Diagrama interactivo del proceso de marketing y fidelización de clientes, inspirado en la estructura interactiva del motor de Cierres Regionales.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Map size={14} /> MAPA DE CONEXIONES Y FLUJO GENERAL
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">El mapa se resalta automáticamente sincronizado con el PASO ACTIVO seleccionado arriba.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl shadow-sm border transition-all duration-300 ${
                  isSimulating 
                  ? 'bg-blue-50 text-blue-400 border-blue-100 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent hover:from-blue-700 hover:to-indigo-700 hover:shadow hover:-translate-y-0.5'
                }`}
              >
                <PlayCircle size={16} className={isSimulating ? 'animate-spin' : ''} />
                {isSimulating ? 'Simulando flujo...' : 'Simular Flujo Completo'}
              </button>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto overflow-y-hidden mb-8 rounded-[2rem] border border-slate-100 shadow-sm bg-white">
            <div className="min-w-[500px] h-[750px] relative bg-[#fcfcfc] mx-auto max-w-[600px]">
              
              <style>{`
                @keyframes flowDash {
                  from { stroke-dashoffset: 12; }
                  to { stroke-dashoffset: 0; }
                }
                .animate-flow {
                  animation: flowDash 0.8s linear infinite;
                }
                .node-bluePill { background-color: #9BB7D4; color: black; border: 2px solid white; font-weight: bold; border-radius: 9999px; }
                .node-purpleBox { background-color: #D8C4E8; color: black; border: 2px solid white; font-weight: bold; border-radius: 12px; }
                .node-pinkDiamond { background-color: #FADCD9; color: black; border: 2px solid white; font-weight: bold; transform: rotate(45deg); width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
                .node-pinkDiamond span { transform: rotate(-45deg); display: block; text-align: center; }
                .node-finNode { background-color: #8DB4E2; color: white; border: 2px solid white; font-weight: bold; border-radius: 9999px; border: 4px double white; box-shadow: 0 0 0 2px #8DB4E2; }
              `}</style>

              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" />
                  </marker>
                  <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#3b82f6" />
                  </marker>
                </defs>

                {/* INICIO -> Crea estrategia */}
                <path d="M 50% 8% L 50% 13%" fill="none" stroke={activeStep >= 0 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 0 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 0 || isSimulating ? 'arrow-active' : 'arrow'})`} />
                {/* Crea estrategia -> Creacion contenido */}
                <path d="M 50% 20% L 50% 25%" fill="none" stroke={activeStep >= 1 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 1 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 1 || isSimulating ? 'arrow-active' : 'arrow'})`} />
                {/* Creacion contenido -> Redes Sociales */}
                <path d="M 50% 33% L 50% 38%" fill="none" stroke={activeStep >= 1 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 1 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 1 || isSimulating ? 'arrow-active' : 'arrow'})`} />
                
                {/* Redes Sociales NO -> Creacion */}
                <path d="M 56% 43% L 75% 43% L 75% 29% L 65% 29%" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 1 || isSimulating ? "animate-flow" : ""} markerEnd="url(#arrow)" />
                
                {/* Redes Sociales SI -> Interaccion */}
                <path d="M 50% 48% L 50% 53%" fill="none" stroke={activeStep >= 2 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 2 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 2 || isSimulating ? 'arrow-active' : 'arrow'})`} />
                
                {/* Interaccion -> Clientes Fieles */}
                <path d="M 50% 61% L 50% 66%" fill="none" stroke={activeStep >= 2 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 2 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 2 || isSimulating ? 'arrow-active' : 'arrow'})`} />

                {/* Clientes Fieles NO -> Interaccion */}
                <path d="M 59% 70% L 75% 70% L 75% 57% L 65% 57%" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 2 || isSimulating ? "animate-flow" : ""} markerEnd="url(#arrow)" />
                
                {/* Clientes Fieles SI -> Analisis */}
                <path d="M 50% 74% L 50% 79%" fill="none" stroke={activeStep >= 3 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 3 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 3 || isSimulating ? 'arrow-active' : 'arrow'})`} />

                {/* Analisis -> Resultados? */}
                <path d="M 35% 83% L 26% 83%" fill="none" stroke={activeStep >= 3 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 3 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 3 || isSimulating ? 'arrow-active' : 'arrow'})`} />
                
                {/* Resultados? SI -> FIN */}
                <path d="M 21% 88% L 21% 94%" fill="none" stroke={activeStep >= 3 || isSimulating ? "#3b82f6" : "#64748b"} strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 3 || isSimulating ? "animate-flow" : ""} markerEnd={`url(#${activeStep >= 3 || isSimulating ? 'arrow-active' : 'arrow'})`} />

                {/* Resultados? NO -> INICIO */}
                <path d="M 16% 83% L 8% 83% L 8% 5% L 40% 5%" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5,5" className={activeStep >= 3 || isSimulating ? "animate-flow" : ""} markerEnd="url(#arrow)" />

              </svg>

              {/* NODES */}
              {/* A: INICIO */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(0); }}
                className={`absolute top-[5%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-2 cursor-pointer transition-all duration-300 shadow-md node-bluePill
                  ${activeStep === 0 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] uppercase">INICIO</span>
              </div>

              {/* B: Crea estrategia */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(0); }}
                className={`absolute top-[16.5%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-3 cursor-pointer transition-all duration-300 shadow-md node-purpleBox w-48 text-center
                  ${activeStep === 0 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] leading-tight">Crea una estrategia de<br/>contenido</span>
              </div>

              {/* C: Creacion contenido */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(1); }}
                className={`absolute top-[29%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-3 cursor-pointer transition-all duration-300 shadow-md node-purpleBox w-48 text-center
                  ${activeStep === 1 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] leading-tight">Creación de contenido<br/>visual y relevante</span>
              </div>

              {/* D: Redes Sociales (Diamond) */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(1); }}
                className={`absolute top-[43%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-300 shadow-md node-pinkDiamond
                  ${activeStep === 1 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[10px] leading-tight">Redes<br/>sociales</span>
              </div>
              <span className="absolute top-[41%] left-[57%] text-[10px] font-bold text-rose-500">NO</span>
              <span className="absolute top-[49%] left-[51%] text-[10px] font-bold text-green-500">SI</span>

              {/* E: Interaccion */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(2); }}
                className={`absolute top-[57%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-3 cursor-pointer transition-all duration-300 shadow-md node-bluePill w-48 text-center
                  ${activeStep === 2 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] leading-tight">Interacción activa con<br/>seguidores</span>
              </div>

              {/* F: Clientes fieles */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(2); }}
                className={`absolute top-[70%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-2 cursor-pointer transition-all duration-300 shadow-md node-bluePill
                  ${activeStep === 2 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] uppercase">Clientes fieles</span>
              </div>
              <span className="absolute top-[68.5%] left-[60%] text-[10px] font-bold text-rose-500">NO</span>
              <span className="absolute top-[75%] left-[51%] text-[10px] font-bold text-green-500">SI</span>

              {/* G: Analisis */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(3); }}
                className={`absolute top-[83%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center px-6 py-3 cursor-pointer transition-all duration-300 shadow-md node-purpleBox w-48 text-center
                  ${activeStep === 3 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] leading-tight">Análisis del rendimiento</span>
              </div>

              {/* H: Buenos Resultados (Diamond) */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(3); }}
                className={`absolute top-[83%] left-[21%] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all duration-300 shadow-md node-bluePill w-[90px] h-[90px] flex items-center justify-center rounded-full
                  ${activeStep === 3 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[10px] leading-tight text-center font-bold px-2">¿Tienes buenos<br/>resultados?</span>
              </div>
              <span className="absolute top-[81%] left-[10.5%] text-[10px] font-bold text-rose-500">NO</span>
              <span className="absolute top-[89.5%] left-[22%] text-[10px] font-bold text-green-500">SI</span>

              {/* I: FIN */}
              <div 
                onClick={() => { if (!isSimulating) setActiveStep(3); }}
                className={`absolute top-[96.5%] left-[21%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center justify-center w-14 h-14 cursor-pointer transition-all duration-300 shadow-md node-finNode
                  ${activeStep === 3 ? 'scale-110 shadow-lg border-[#3b82f6] border-2' : 'hover:scale-105'}`}
              >
                <span className="text-[12px] uppercase">FIN</span>
              </div>
              
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/40 rounded-2xl p-4 border border-slate-100">
            <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${steps[activeStep].color} text-white shadow-sm`}>
                    {React.createElement(steps[activeStep].icon, { size: 20 })}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PASO ACTIVO</span>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">{steps[activeStep].title}</h4>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {steps[activeStep].description}
                </p>

                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Responsable Principal</span>
                    <span className="text-slate-700 font-semibold">{steps[activeStep].details.source}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Frecuencia / Iteración</span>
                    <span className="text-slate-700 font-semibold">{steps[activeStep].details.freq}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                  disabled={activeStep === 0 || isSimulating}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setActiveStep(prev => Math.min(3, prev + 1))}
                  disabled={activeStep === 3 || isSimulating}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Variables e Inputs de esta fase</h5>
              
              <div className="space-y-3">
                {steps[activeStep].details.items.map((item, idx) => (
                  <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 hover:bg-slate-50 transition-colors">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {item.label}
                    </span>
                    <p className="text-[11px] text-slate-500 leading-normal mt-1 pl-3 font-medium">
                      {item.val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
