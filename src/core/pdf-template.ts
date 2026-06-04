import { CommercialResult, LoteChange, RetroactiveAdjustment } from './types';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('es-AR').format(n);
// Rendimiento viene de Metabase ya como % (ej: 2.17 = 2.17%), no multiplicar por 100
const fmtRendPct = (n: number) => n ? `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n)}%` : '0%';

// ── Brand Colors ──
const B = {
    primary: '#3179a7',   // azul marca dCaC
    dark: '#1a4d6e',      // azul oscuro para títulos
    darker: '#0e3550',    // azul más oscuro para hero
    light: '#9edbf4',     // celeste claro
    bg: '#f0f7fb',        // fondo celeste muy suave
    border: '#cce4f0',    // borde celeste
    text: '#1a4d6e',      // texto principal = azul oscuro
    textSec: '#5a8fa8',   // texto secundario
    textMuted: '#8bb8cc', // texto muted
    success: '#10b981',
    danger: '#ef4444',
    warn: '#f59e0b',
};

// Logo SVG oficial — tamaño ajustado con overflow visible para no cortarse
const LOGO_SVG = `<img src="data:image/png;base64,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" width="160" height="32" style="display:block;object-fit:contain;overflow:visible;" />`;

// Colores por Unidad de Negocio
const getUNColor = (tipo: string) => {
    const t = (tipo || '').toUpperCase().trim();
    if (t.includes('CRIA') || t.includes('CRÍA')) {
        return '#b45309'; // Amarillo / Ámbar oscuro legible
    }
    if (t === 'MAG') {
        return '#15803d'; // Verde
    }
    if (t === 'INVERNADA NEO' || t.includes('NEO')) {
        return '#dc2626'; // Rojo chillón brillante
    }
    if (t === 'INVERNADA' || t.includes('INVERNADA')) {
        return '#7f1d1d'; // Rojo oscuro
    }
    if (t === 'FAENA' || t.includes('FAENA')) {
        return '#0284c7'; // Azul celeste (light blue)
    }
    return '#64748b'; // Gris fallback
};

export function generateClosureHtml(data: CommercialResult): string {
    const mesNombre = MONTHS[data.mes - 1] || `Mes ${data.mes}`;
    const periodo = `${mesNombre} ${data.año}`;
    const now = new Date();
    const timestamp = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const isFrutos = data.asociadoComercial.toLowerCase() === 'lucila frutos' || (data.modalidad && data.modalidad.toLowerCase().includes('kam')) || (data.modalidad && data.modalidad.toLowerCase().includes('frutos'));
    const showRegional = (data.componenteR > 0 || data.modalidad === 'Completa') && !isFrutos;
    const showOficina = (data.componenteO > 0 || data.modalidad === 'Completa') && !isFrutos;
    const showMag = data.cabMag > 0;
    const showGastos = data.gastosDetalle && data.gastosDetalle.length > 0;
    const totalComponentes = (data.componenteP || 0) + (data.componenteR || 0) + (data.componenteO || 0);
    const minimoActivo = (totalComponentes + data.ajustes) < data.minimo && data.minimo > 0;
    const hasAjustesToShow = (data.ajustes !== 0) || (data.ajustesManuales !== undefined && data.ajustesManuales !== 0) || (data.retroactivosDetalle && data.retroactivosDetalle.length > 0);
    // Auto propio = tiene reintegro de movilidad (se le pagan KMs)
    const tieneAutoPropio = (data.reintegroMovilidad || 0) > 0;
    // Tiene vehículo DCAC (empresa) = tiene amortización DCAC o auto asignado y no es propio
    const tieneAutoDcac = (data.amortizacioneDcac || 0) > 0 || (!!(data.auto && data.auto.trim() !== '' && data.auto !== '-' && data.auto !== 'N/A') && !tieneAutoPropio);

    // Total rendiciones: si tiene auto propio, restamos gastosMendelMovilidad, restando amortización
    const totalRendiciones = tieneAutoPropio
        ? (data.reintegroMovilidad || 0) - (data.gastosMendelMovilidad || 0) - (data.amortizacioneDcac || 0)
        : (data.reintegroMovilidad || 0) - (data.amortizacioneDcac || 0);

    // Operaciones (ordenadas por fecha descendente por defecto)
    const operaciones = [...(data.operacionesDetalle || [])].sort((a, b) => 
        (b.fecha_operacion || '').localeCompare(a.fecha_operacion || '')
    );
    const hasOps = operaciones.length > 0;
    const totalPages = 1 + (hasOps ? 1 : 0);
    const bolsa = data.bolsaRegion || 0;

    const totalResAj = operaciones.reduce((s, o) => s + (o.resultado_topeado_venta || 0) + (o.resultado_topeado_compra || 0), 0);
    const totalVarV = operaciones.reduce((s, o) => s + (o.ganancia_personal_venta || 0), 0);
    const totalVarC = operaciones.reduce((s, o) => s + (o.ganancia_personal_compra || 0), 0);

    const isFrutos = (data.modalidad || '').toLowerCase().includes('frutos') || (data.modalidad || '').toLowerCase().includes('kam') || (data.asociadoComercial || '').toLowerCase().includes('frutos');
    const isAcuna = (data.modalidad || '').toLowerCase().includes('acuña') || (data.asociadoComercial || '').toLowerCase().includes('acuna');
    const isPorCuenta = isFrutos || isAcuna;

    const opsRows = operaciones.map(op => {
        const color = getUNColor(op.tipo);
        const resAj = (op.resultado_topeado_venta || 0) + (op.resultado_topeado_compra || 0);
        const varV = op.ganancia_personal_venta || 0;
        const varC = op.ganancia_personal_compra || 0;
        const s = `padding:3px 4px;border-bottom:1px solid ${B.border};font-size:6.5px;font-variant-numeric:tabular-nums;white-space:nowrap`;
        return `
        <tr>
            <td style="${s};font-weight:bold;color:${B.dark}">${op.id_lote}</td>
            <td style="${s};font-weight:700;color:${color}"><span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:${color};margin-right:2px;vertical-align:middle"></span>${op.tipo}</td>
            <td style="${s};color:${B.textSec}">${op.fecha_operacion || '—'}</td>
            <td style="${s};color:${B.text};max-width:80px;overflow:hidden;text-overflow:ellipsis" title="${op.sociedad_vendedora}">${op.sociedad_vendedora || '—'}</td>
            <td style="${s};color:${B.text};max-width:80px;overflow:hidden;text-overflow:ellipsis" title="${op.sociedad_compradora}">${op.sociedad_compradora || '—'}</td>
            <td style="${s};text-align:right;font-weight:600;color:${B.dark}">${fmtNum(op.cantidad)}</td>
            <td style="${s};color:${B.textSec}">${op.categoria || '—'}</td>
            <td style="${s};text-align:right;color:${B.text}">${fmt(op.importe_vendedor)}</td>
            <td style="${s};color:${B.textSec};max-width:60px;overflow:hidden;text-overflow:ellipsis" title="${op.comercial_venta || ''}">${op.comercial_venta || '—'}</td>
            <td style="${s};color:${B.textSec};max-width:60px;overflow:hidden;text-overflow:ellipsis" title="${op.comercial_compra || ''}">${op.comercial_compra || '—'}</td>
            <td style="${s};text-align:right;color:${B.textSec}">${fmtRendPct(op.rendimiento_topeado)}</td>
            <td style="${s};text-align:right;color:${B.dark};font-weight:700">${op.escala_aplicada ? fmtPct(op.escala_aplicada) : '—'}</td>
            <td style="${s};text-align:right;color:${resAj < 0 ? B.danger : B.dark};font-weight:600">${fmt(resAj)}</td>
            <td style="${s};text-align:right;color:${varV < 0 ? B.danger : (varV ? B.primary : B.textMuted)};font-weight:600">${varV ? fmt(varV) : '—'}</td>
            <td style="${s};text-align:right;color:${varC < 0 ? B.danger : (varC ? B.primary : B.textMuted)};font-weight:600">${varC ? fmt(varC) : '—'}</td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
        font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
        color: ${B.text};
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page { width: 210mm; min-height: 297mm; padding: 0; position: relative; }
    .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════ -->
<!-- PÁGINA 1: LIQUIDACIÓN                  -->
<!-- ═══════════════════════════════════════ -->
<div class="page" style="padding:28px 32px 60px">

    <!-- ── HEADER ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid ${B.border}">
        <div style="display:flex;align-items:center;gap:16px">
            ${LOGO_SVG}
        </div>
        <div style="text-align:right">
            <div style="font-size:9px;color:${B.textMuted};font-weight:600;text-transform:uppercase;letter-spacing:2px">Liquidación de Cierre</div>
            <div style="font-size:24px;font-weight:800;color:${B.dark};letter-spacing:-1px">${mesNombre} ${data.año}</div>
        </div>
    </div>

    <!-- ── AGENT INFO BAR ── -->
    <div style="background:${B.bg};border-radius:12px;padding:14px 18px;display:flex;gap:28px;flex-wrap:wrap;margin-bottom:20px;border:1px solid ${B.border}">
        <div>
            <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px">Asociado Comercial</div>
            <div style="font-size:13px;font-weight:800;color:${B.dark}">${data.asociadoComercial}</div>
        </div>
        <div>
            <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px">Provincia</div>
            <div style="font-size:12px;font-weight:600;color:${B.text}">${data.provincia}</div>
        </div>
        <div>
            <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px">Oficina</div>
            <div style="font-size:12px;font-weight:600;color:${B.text}">${data.oficina}</div>
        </div>

        <div>
            <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px">Código</div>
            <div style="font-size:12px;font-weight:600;color:${B.text}">${data.codigo || '—'}</div>
        </div>
    </div>

    <!-- ── TOTAL HERO ── -->
    <div style="background:linear-gradient(135deg,${B.darker} 0%,${B.dark} 50%,${B.primary} 100%);border-radius:16px;padding:22px 24px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between">
        <div>
            <div style="font-size:9px;font-weight:700;color:${B.light};text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">Total a Facturar</div>
            <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-1.5px;line-height:1">${fmt(data.cierreReal)}</div>
        </div>
        <div style="text-align:right">
            <div style="display:flex;gap:16px;align-items:center">
                <div>
                    <div style="font-size:8px;font-weight:600;color:${B.light};text-transform:uppercase;letter-spacing:1px;opacity:0.8">Cabezas</div>
                    <div style="font-size:18px;font-weight:800;color:#fff">${fmtNum(data.cabezasGeneral)}</div>
                </div>
                <div style="width:1px;height:30px;background:rgba(255,255,255,0.2)"></div>
                <div>
                    <div style="font-size:8px;font-weight:600;color:${B.light};text-transform:uppercase;letter-spacing:1px;opacity:0.8">Tropas</div>
                    <div style="font-size:18px;font-weight:800;color:#fff">${fmtNum(data.tropasGeneral)}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- ── TWO COLUMN LAYOUT ── -->
    <div style="display:flex;gap:20px">
        
        <!-- LEFT: Componentes Operativos -->
        <div style="flex:1">
                  <table style="width:100%;border-collapse:collapse">
                <!-- Componente Personal -->
                <tr style="background:${B.bg}">
                    <td style="padding:6px 10px;font-size:9.5px;font-weight:700;color:${B.dark}">Componente Personal</td>
                    <td style="padding:6px 10px;font-size:9px;color:${B.textSec};text-align:right"></td>
                    <td style="padding:6px 10px;font-size:10.5px;font-weight:800;color:${data.componenteP < 0 ? B.danger : B.dark};text-align:right">${fmt(data.componenteP)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding:4px 10px 6px 20px;font-size:8px;color:${B.textSec};line-height:1.6;border-bottom:1px dashed ${B.border}">
                        <div style="display:flex;justify-content:space-between"><span>Tropas</span> <strong>${data.tropasGeneral}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Cabezas</span> <strong>${fmtNum(data.cabezasGeneral)}</strong></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Resultado</span> <strong>${fmt(data.resultado_final_ajustado)}</strong></div>
                        
                        ${data.cabInv > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada (${fmtNum(data.cabInv)} cab)</span> <span style="color:${data.resInv < 0 ? B.danger : B.textMuted}">${fmt(data.resInv)}</span></div>` : ''}
                        ${data.cabInvNeo > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada Neo (${fmtNum(data.cabInvNeo)} cab)</span> <span style="color:${data.resInvNeo < 0 ? B.danger : B.textMuted}">${fmt(data.resInvNeo)}</span></div>` : ''}
                        ${data.cabFaena > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Faena (${fmtNum(data.cabFaena)} cab)</span> <span style="color:${data.resFaena < 0 ? B.danger : B.textMuted}">${fmt(data.resFaena)}</span></div>` : ''}
                        ${data.cabCria > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Cría (${fmtNum(data.cabCria)} cab)</span> <span style="color:${data.resCria < 0 ? B.danger : B.textMuted}">${fmt(data.resCria)}</span></div>` : ''}
                        ${showMag ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ MAG (${fmtNum(data.cabMag)} cab)</span> <span style="color:${data.resMag < 0 ? B.danger : B.textMuted}">${fmt(data.resMag)}</span></div>` : ''}

                        <div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px dashed ${B.border};padding-top:4px"><span>Escala</span> <strong>${isPorCuenta ? 'Por Cuenta (Ver Detalle)' : fmtPct(data.escalaGen)}</strong></div>
                    </td>
                </tr>

                <!-- Componente Regional -->
                ${showRegional ? `
                <tr style="background:${B.bg};border-top:1px solid ${B.border}">
                    <td style="padding:6px 10px;font-size:9.5px;font-weight:700;color:${B.dark}">Componente Regional</td>
                    <td style="padding:6px 10px;font-size:9px;color:${B.textSec};text-align:right"></td>
                    <td style="padding:6px 10px;font-size:10.5px;font-weight:800;color:${data.componenteR < 0 ? B.danger : B.dark};text-align:right">${fmt(data.componenteR)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding:4px 10px 6px 20px;font-size:8px;color:${B.textSec};line-height:1.6;border-bottom:1px dashed ${B.border}">
                        <div style="display:flex;justify-content:space-between"><span>Tropas</span> <strong>${data.tropasRegional}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Cabezas</span> <strong>${fmtNum(data.cabezasRegional)}</strong></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Resultado</span> <strong>${fmt(data.resultadoReg)}</strong></div>

                        ${data.cabInvReg > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada (${fmtNum(data.cabInvReg)} cab)</span> <span style="color:${data.resInvReg < 0 ? B.danger : B.textMuted}">${fmt(data.resInvReg)}</span></div>` : ''}
                        ${data.cabInvNeoReg > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada Neo (${fmtNum(data.cabInvNeoReg)} cab)</span> <span style="color:${data.resInvNeoReg < 0 ? B.danger : B.textMuted}">${fmt(data.resInvNeoReg)}</span></div>` : ''}
                        ${data.cabFaenaReg > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Faena (${fmtNum(data.cabFaenaReg)} cab)</span> <span style="color:${data.resFaenaReg < 0 ? B.danger : B.textMuted}">${fmt(data.resFaenaReg)}</span></div>` : ''}
                        ${data.cabCriaReg > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Cría (${fmtNum(data.cabCriaReg)} cab)</span> <span style="color:${data.resCriaReg < 0 ? B.danger : B.textMuted}">${fmt(data.resCriaReg)}</span></div>` : ''}
                        ${data.cabMagReg > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ MAG (${fmtNum(data.cabMagReg)} cab)</span> <span style="color:${data.resMagReg < 0 ? B.danger : B.textMuted}">${fmt(data.resMagReg)}</span></div>` : ''}

                        <div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px dashed ${B.border};padding-top:4px"><span>Escala Regional</span> <strong>${fmtPct(data.bolsaRegion)}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Tajada sobre Escala</span> <strong>${fmtPct(data.tajadaRegion)}</strong></div>
                    </td>
                </tr>` : ''}

                <!-- Componente Oficina -->
                ${showOficina ? `
                <tr style="background:${B.bg};border-top:1px solid ${B.border}">
                    <td style="padding:6px 10px;font-size:9.5px;font-weight:700;color:${B.dark}">Componente Oficina</td>
                    <td style="padding:6px 10px;font-size:9px;color:${B.textSec};text-align:right"></td>
                    <td style="padding:6px 10px;font-size:10.5px;font-weight:800;color:${data.componenteO < 0 ? B.danger : B.dark};text-align:right">${fmt(data.componenteO)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding:4px 10px 6px 20px;font-size:8px;color:${B.textSec};line-height:1.6">
                        <div style="display:flex;justify-content:space-between"><span>Tropas</span> <strong>${data.tropasOficina}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Cabezas</span> <strong>${fmtNum(data.cabezasOfi)}</strong></div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Resultado</span> <strong>${fmt(data.resultadoOfi)}</strong></div>

                        ${data.cabInvOfi > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada (${fmtNum(data.cabInvOfi)} cab)</span> <span style="color:${data.resInvOfi < 0 ? B.danger : B.textMuted}">${fmt(data.resInvOfi)}</span></div>` : ''}
                        ${data.cabInvNeoOfi > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Invernada Neo (${fmtNum(data.cabInvNeoOfi)} cab)</span> <span style="color:${data.resInvNeoOfi < 0 ? B.danger : B.textMuted}">${fmt(data.resInvNeoOfi)}</span></div>` : ''}
                        ${data.cabFaenaOfi > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Faena (${fmtNum(data.cabFaenaOfi)} cab)</span> <span style="color:${data.resFaenaOfi < 0 ? B.danger : B.textMuted}">${fmt(data.resFaenaOfi)}</span></div>` : ''}
                        ${data.cabCriaOfi > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ Cría (${fmtNum(data.cabCriaOfi)} cab)</span> <span style="color:${data.resCriaOfi < 0 ? B.danger : B.textMuted}">${fmt(data.resCriaOfi)}</span></div>` : ''}
                        ${data.cabMagOfi > 0 ? `<div style="display:flex;justify-content:space-between;color:${B.textMuted};padding-left:8px;font-size:7.5px"><span>↳ MAG (${fmtNum(data.cabMagOfi)} cab)</span> <span style="color:${data.resMagOfi < 0 ? B.danger : B.textMuted}">${fmt(data.resMagOfi)}</span></div>` : ''}

                        <div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px dashed ${B.border};padding-top:4px"><span>Escala Oficina</span> <strong>${fmtPct(data.escalaOficina)}</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>Participación Oficina</span> <strong>${fmtPct(data.opOficina)}</strong></div>
                    </td>
                </tr>` : ''}
            </table>

            ${minimoActivo ? `
            <div style="margin-top:12px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;align-items:flex-start;gap:8px">
                <div style="font-size:12px;margin-top:-1px">⚠️</div>
                <div>
                    <div style="font-size:9px;font-weight:700;color:#991b1b;line-height:1.2">Se aplicó el mínimo garantizado</div>
                    <div style="font-size:8px;color:#b91c1c;margin-top:2px;line-height:1.2">
                        ${(totalComponentes + data.ajustes) < data.minimo
                            ? `El total de componentes con ajustes (${fmt(totalComponentes + data.ajustes)}) es inferior al mínimo asegurado (${fmt(data.minimo)})`
                            : `El componente personal (${fmt(data.componenteP)}) es inferior al mínimo asegurado (${fmt(data.minimo)})`
                        }
                    </div>
                </div>
            </div>` : ''}

            ${showGastos ? `
            <div style="margin-top:14px">
                <div style="font-size:9px;font-weight:700;color:${B.textSec};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Gastos por Categoría</div>
                <table style="width:100%;border-collapse:collapse">
                    ${data.gastosDetalle.map(g => `
                    <tr>
                        <td style="padding:4px 10px;font-size:9px;color:${B.textSec}">${g.categoria}</td>
                        <td style="padding:4px 10px;font-size:9px;color:${B.textSec};text-align:right;font-weight:600">${fmt(g.importe)}</td>
                    </tr>`).join('')}
                    <tr style="border-top:1px solid ${B.border};background:${B.bg}">
                        <td style="padding:6px 10px;font-size:9.5px;font-weight:700;color:${B.dark}">Total Gastos</td>
                        <td style="padding:6px 10px;font-size:9.5px;font-weight:800;color:${B.dark};text-align:right">${fmt(data.gastosMkt)}</td>
                    </tr>
                </table>
            </div>` : ''}
            
            <!-- Rendiciones y Movilidad -->
            <div style="margin-top:20px;padding-top:16px;border-top:2px solid ${B.primary}">
                <div style="font-size:10px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Movilidad y Rendiciones</div>

                ${tieneAutoPropio ? `
                <!-- Info Vehículo Propio -->
                <div style="background:${B.bg};border-radius:8px;padding:8px 10px;margin-bottom:8px;border:1px solid ${B.border}">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid ${B.border};padding-bottom:4px">
                        <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1px">Vehículo Propio</div>
                        <div style="font-size:9px;font-weight:700;color:${B.dark}">${data.auto || '—'}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <div style="font-size:8px;color:${B.textMuted}">Reintegro (${fmtNum(data.kms || 0)} km x ${fmt(data.precioPorKm || 0)})</div>
                        <div style="font-size:9px;font-weight:600;color:${B.success}">+${fmt(data.reintegroMovilidad || 0)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <div style="font-size:8px;color:${B.textMuted}">Gastos Tarjeta Mendel (Combustible/Peajes)</div>
                        <div style="font-size:9px;font-weight:600;color:${B.danger}">-${fmt(data.gastosMendelMovilidad || 0)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:4px;border-top:1px dashed ${B.border}">
                        <div style="font-size:8.5px;font-weight:800;color:${B.dark}">Rendición Neta</div>
                        <div style="font-size:9.5px;font-weight:800;color:${((data.reintegroMovilidad || 0) - (data.gastosMendelMovilidad || 0)) >= 0 ? B.success : B.danger}">${((data.reintegroMovilidad || 0) - (data.gastosMendelMovilidad || 0)) >= 0 ? '+' : ''}${fmt((data.reintegroMovilidad || 0) - (data.gastosMendelMovilidad || 0))}</div>
                    </div>
                </div>` : ''}

                ${tieneAutoDcac ? `
                <!-- Info Vehículo de la Empresa -->
                <div style="background:${B.bg};border-radius:8px;padding:8px 10px;margin-bottom:8px;border:1px solid ${B.border}">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid ${B.border};padding-bottom:4px">
                        <div style="font-size:8px;font-weight:700;color:${B.textMuted};text-transform:uppercase;letter-spacing:1px">Vehículo de la Empresa</div>
                        <div style="display:flex;gap:6px;align-items:center">
                            <span style="font-size:8px;font-weight:600;color:${B.textSec};background:${B.border};padding:2px 4px;border-radius:4px">${fmtNum(data.kms || 0)} km</span>
                            <span style="font-size:9px;font-weight:700;color:${B.dark}">${data.auto || 'Asignado'}</span>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <div style="font-size:8px;color:${B.textMuted}">Amortización Vehículo DCAC</div>
                        <div style="font-size:9px;font-weight:600;color:${B.danger}">-${fmt(data.amortizacioneDcac || 0)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:4px;border-top:1px dashed ${B.border}">
                        <div style="font-size:8.5px;font-weight:800;color:${B.dark}">Descuento Neto</div>
                        <div style="font-size:9.5px;font-weight:800;color:${B.danger}">-${fmt(data.amortizacioneDcac || 0)}</div>
                    </div>
                </div>` : ''}
            </div>
        </div>

        <!-- RIGHT: Conceptos Contractuales -->
        <div style="flex:1">
            <div style="font-size:10px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${B.primary}">Conceptos Contractuales</div>

            <table style="width:100%;border-collapse:collapse">
                <tr>
                    <td style="padding:8px 10px;font-size:10px;color:${B.textSec}">Mínimo Garantizado</td>
                    <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${B.textSec};text-align:right">
                        ${fmt(data.minimo)}
                        ${!minimoActivo ? `<span style="color:${B.success};margin-left:4px;font-size:12px">✓</span>` : ''}
                    </td>
                </tr>
                <tr style="background:${B.bg}">
                    <td style="padding:8px 10px;font-size:10px;font-weight:600;color:${B.dark}">Variable Personal</td>
                    <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${data.variable_personal < 0 ? B.danger : B.dark};text-align:right">${fmt(data.variable_personal)}</td>
                </tr>
                ${showRegional ? `
                <tr>
                    <td style="padding:8px 10px;font-size:10px;color:${B.text}">Variable Regional</td>
                    <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${data.componenteR < 0 ? B.danger : B.text};text-align:right">${fmt(data.componenteR)}</td>
                </tr>` : ''}
                ${showOficina ? `
                <tr>
                    <td style="padding:8px 10px;font-size:10px;color:${B.text}">Variable Oficina</td>
                    <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${data.componenteO < 0 ? B.danger : B.text};text-align:right">${fmt(data.componenteO)}</td>
                </tr>` : ''}
            </table>

            ${hasAjustesToShow ? `
            <!-- Ajustes Retroactivos y Manuales -->
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid ${B.border}">
                <table style="width:100%;border-collapse:collapse">
                    <tr>
                        <td style="padding:8px 10px;font-size:10px;font-weight:700;color:${B.dark}">Ajustes (Retroactivos / Novedades)</td>
                        <td style="padding:8px 10px;font-size:10px;font-weight:800;color:${data.ajustes >= 0 ? B.success : B.danger};text-align:right">${data.ajustes >= 0 ? '+' : ''}${fmt(data.ajustes)}</td>
                    </tr>
                </table>
            </div>` : ''}

            <!-- SUMA TOTAL A FACTURAR -->
            <div style="margin-top:24px;border-top:2px solid ${B.dark};background:${B.bg};border-radius:8px;padding:12px 14px;border:1px solid ${B.border}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div style="font-size:10px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:1px">Suma Total a Facturar</div>
                    <div style="font-size:16px;font-weight:900;color:${B.dark}">${fmt(data.cierreReal)}</div>
                </div>
            </div>
        </div>
    </div>



    <!-- ── FOOTER ── -->
    <div style="position:absolute;bottom:20px;left:32px;right:32px;padding-top:12px;border-top:1px solid ${B.border};display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:7px;color:${B.textMuted};font-weight:500">Generado el ${timestamp} · deCampo aCampo — Sistema de Cierres</div>
        <div style="font-size:7px;color:${B.textMuted};font-weight:600">1/${hasOps ? '2' : '1'}</div>
    </div>
</div>

${hasOps ? `
<!-- ═══════════════════════════════════════ -->
<!-- PÁGINA 2: DETALLE DE OPERACIONES       -->
<!-- ═══════════════════════════════════════ -->
<div class="page page-break" style="padding:28px 32px 60px">
    
    <!-- Header mini -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid ${B.border}">
        <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:13px;font-weight:800;color:${B.dark}">Detalle de Operaciones</div>
            <div style="font-size:9px;color:${B.textMuted};font-weight:600">— ${data.asociadoComercial} · ${periodo}</div>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
            <div style="background:${B.bg};border-radius:8px;padding:6px 10px;border:1px solid ${B.border};display:flex;align-items:center;gap:4px">
                <span style="font-size:8px;color:${B.textSec};font-weight:600">Operaciones</span>
                <span style="font-size:12px;font-weight:800;color:${B.dark}">${operaciones.length}</span>
            </div>
            <div style="background:${B.bg};border-radius:8px;padding:6px 10px;border:1px solid ${B.border};display:flex;align-items:center;gap:4px">
                <span style="font-size:8px;color:${B.textSec};font-weight:600">Cabezas</span>
                <span style="font-size:12px;font-weight:800;color:${B.dark}">${fmtNum(operaciones.reduce((s, o) => s + o.cantidad, 0))}</span>
            </div>
        </div>
    </div>

    <!-- Tabla de operaciones -->
    <table style="width:100%;border-collapse:collapse">
        <thead>
            <tr style="border-bottom:2px solid ${B.dark}">
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">Lote</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">UN</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">Fecha</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">Rs Vendedora</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">Rs Compradora</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Cant.</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">Cat</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Importe</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">AC Venta</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:left">AC Compra</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Rend(%)</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Esc(%)</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Res. Ajustado</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Var (V)</th>
                <th style="padding:3px 4px;font-size:6px;font-weight:800;color:${B.dark};text-transform:uppercase;letter-spacing:0.3px;text-align:right">Var (C)</th>
            </tr>
        </thead>
        <tbody>
            ${opsRows}
        </tbody>
        <tfoot>
            <tr style="border-top:2px solid ${B.dark};background:${B.bg}">
                <td colspan="5" style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${B.dark}">TOTAL</td>
                <td style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${B.dark};text-align:right">${fmtNum(operaciones.reduce((s, o) => s + o.cantidad, 0))}</td>
                <td style="padding:4px 4px"></td>
                <td style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${B.text};text-align:right">${fmt(operaciones.reduce((s, o) => s + o.importe_vendedor, 0))}</td>
                <td colspan="2" style="padding:4px 4px"></td>
                <td style="padding:4px 4px"></td>
                <td style="padding:4px 4px"></td>
                <td style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${totalResAj < 0 ? B.danger : B.dark};text-align:right">${fmt(totalResAj)}</td>
                <td style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${totalVarV < 0 ? B.danger : B.primary};text-align:right">${totalVarV ? fmt(totalVarV) : '—'}</td>
                <td style="padding:4px 4px;font-size:6.5px;font-weight:800;color:${totalVarC < 0 ? B.danger : B.primary};text-align:right">${totalVarC ? fmt(totalVarC) : '—'}</td>
            </tr>
        </tfoot>
    </table>



    <!-- Footer -->
    <div style="position:absolute;bottom:20px;left:32px;right:32px;padding-top:12px;border-top:1px solid ${B.border};display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:7px;color:${B.textMuted};font-weight:500">Generado el ${timestamp} · deCampo aCampo — Sistema de Cierres</div>
        <div style="font-size:7px;color:${B.textMuted};font-weight:600">${hasOps ? '2' : '1'} de ${totalPages}</div>
    </div>
</div>
` : ''}



</body>
</html>`;
}
