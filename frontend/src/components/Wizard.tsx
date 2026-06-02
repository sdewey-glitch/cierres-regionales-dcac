import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, AlertTriangle, Play, RefreshCw, FileSpreadsheet, Check, Download } from 'lucide-react';

interface WizardProps {
  API_URL: string;
  setActiveTab: (tab: any) => void;
  activeMonth: string;
  setActiveMonth: (m: string) => void;
  activeYear: string;
  setActiveYear: (y: string) => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  cuentasEspeciales: any[];
}

export default function Wizard({ API_URL, setActiveTab, activeMonth, setActiveMonth, activeYear, setActiveYear, handleGenerate, isGenerating, cuentasEspeciales }: WizardProps) {
  const [step, setStep] = useState(1);
  const [mendelStatus, setMendelStatus] = useState<string>('Pendiente de revisión');
  const [mendelCount, setMendelCount] = useState<number | null>(null);
  
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const checkMendel = async () => {
    setMendelStatus('Revisando...');
    try {
      const res = await fetch(`${API_URL}/mendel`);
      if (res.ok) {
        const data = await res.json();
        // Filtrar por el mes y año actual
        const targetPeriod = `${activeYear}${activeMonth.padStart(2, '0')}`;
        const expenses = data.filter((m: any) => m.periodo === targetPeriod);
        setMendelCount(expenses.length);
        setMendelStatus(`Hay ${expenses.length} gastos corporativos (Mendel) cargados para el período ${MONTHS[parseInt(activeMonth)-1]} ${activeYear}.`);
      } else {
        setMendelStatus('Error al conectar con Google Sheets (Mendel).');
      }
    } catch (e) {
      setMendelStatus('Error de conexión.');
    }
  };

  useEffect(() => {
    if (step === 1) checkMendel();
  }, [step, activeMonth, activeYear]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-4xl mx-auto">
      {/* Header Progreso */}
      <div className="bg-slate-900 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Asistente de Cierre Mensual</h2>
        <p className="text-slate-300 text-sm">Este asistente validará que todos los datos estén cargados correctamente antes de calcular las comisiones de la Red Comercial.</p>
        
        <div className="flex items-center mt-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -z-10 -translate-y-1/2 rounded"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-10 -translate-y-1/2 rounded transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="flex-1 flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                step > num ? 'bg-blue-500 text-white' : 
                step === num ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' : 
                'bg-slate-800 text-slate-400 border-2 border-slate-600'
              }`}>
                {step > num ? <Check size={16} /> : num}
              </div>
              <span className={`text-[11px] uppercase tracking-wider font-bold mt-2 ${step >= num ? 'text-blue-200' : 'text-slate-500'}`}>
                {num === 1 ? 'Mendel' : num === 2 ? 'Cuentas' : num === 3 ? 'Roster' : 'Cierre'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido de los pasos */}
      <div className="p-8">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="text-green-600" />
              1. Verificación de Tarjetas Corporativas (Mendel)
            </h3>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-sm text-blue-900">
              <p><strong>¿Qué es esto?</strong> El motor descontará del reintegro de movilidad los gastos que el comercial haya realizado con la tarjeta corporativa Mendel.</p>
              <p className="mt-2 text-xs">Asegurate de que el equipo haya actualizado el Google Sheet de "Base Mendel" y de que el período seleccionado aquí coincida.</p>
            </div>
            
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Período a verificar:</p>
                <div className="flex gap-2 mt-2">
                  <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={activeMonth} onChange={e => setActiveMonth(e.target.value)}>
                    {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                  <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white" value={activeYear} onChange={e => setActiveYear(e.target.value)}>
                    <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                  </select>
                </div>
              </div>
              <button onClick={checkMendel} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                <RefreshCw size={14} /> Verificar ahora
              </button>
            </div>
            
            {mendelCount !== null && (
              <div className="mt-4 flex items-start gap-3 bg-green-50 border border-green-200 p-4 rounded-lg">
                <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={18} />
                <p className="text-green-900 text-sm">{mendelStatus}</p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="text-yellow-500" />
              2. Revisión de Cuentas Especiales
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6 text-sm text-yellow-900">
              <p><strong>¿Qué es esto?</strong> Aquí se definen las excepciones (Grandes Cuentas, Mermas, o porcentajes fijos). Si no configurás el <strong>AC Metabase</strong> o el <strong>CUIT</strong> de la sociedad, el sistema no podrá asignar esas operaciones a la cuenta especial y se pagarán de forma estándar.</p>
            </div>
            
            <p className="text-sm text-gray-700 mb-4">Actualmente hay <strong>{cuentasEspeciales.length} cuentas especiales</strong> configuradas activas.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col gap-3 items-start">
              <p className="text-sm text-gray-600">Si necesitás agregar una nueva cuenta para este mes, podés ir al panel principal para hacerlo y luego volver aquí.</p>
              <button onClick={() => setActiveTab('hub')} className="text-blue-600 font-semibold text-sm hover:underline">
                → Ir al Hub a editar Cuentas Especiales
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
              <CheckCircle className="text-blue-600" />
              3. Validación de la Red Comercial (Roster)
            </h3>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-sm text-blue-900">
              <p><strong>¿Qué es esto?</strong> El cálculo cruzará las operaciones con el "Asistente de Ventas" de la grilla principal.</p>
              <p className="mt-2">¿Asignaste a alguien un vehículo de empresa nuevo este mes? ¿Alguien cambió de categoría? El motor usará la foto actual del Google Sheet para calcular las escalas y movilidad.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col gap-3 items-start">
              <p className="text-sm text-gray-600">Si necesitás corregir la categoría, el auto o algún dato de un comercial, hacelo ahora desde la grilla.</p>
              <button onClick={() => setActiveTab('roster')} className="text-blue-600 font-semibold text-sm hover:underline">
                → Ir al Roster para actualizar información
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Play className="text-green-600" />
              4. Ejecutar el Cierre Mensual
            </h3>
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6 text-sm text-green-900">
              <p><strong>¡Todo listo!</strong> Ya validamos los gastos, cuentas especiales y configuración del equipo.</p>
              <p className="mt-2">Al presionar "Calcular", el sistema consultará todas las operaciones de Metabase, cruzará con el Roster y generará la liquidación final para <strong>{MONTHS[parseInt(activeMonth)-1]} {activeYear}</strong>.</p>
            </div>

            <div className="flex justify-center my-8">
              <button 
                onClick={() => {
                  handleGenerate();
                  setTimeout(() => {
                    setActiveTab('cierre');
                  }, 2000);
                }}
                disabled={isGenerating}
                className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 px-8 py-4 rounded-2xl text-lg font-bold flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                {isGenerating ? <RefreshCw size={24} className="animate-spin" /> : <Play size={24} />}
                {isGenerating ? 'Calculando todo...' : 'Calcular Cierre de Comisiones'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer Botones */}
      <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center">
        {step > 1 ? (
          <button 
            onClick={() => setStep(step - 1)} 
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Atrás
          </button>
        ) : (
          <button 
            onClick={() => setActiveTab('hub')} 
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        )}
        
        {step < 4 && (
          <button 
            onClick={() => setStep(step + 1)} 
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-colors"
          >
            Siguiente Paso <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
