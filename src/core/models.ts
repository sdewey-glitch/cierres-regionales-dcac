import * as fs from 'fs';
import * as path from 'path';
import { getExactScale } from './calculator';
import { readSheet, writeSheet, appendSheet, createSheetIfNotExists } from '../api/sheets';
import { config } from '../config/env';

export interface ScaleTramo {
    cabezas: number;
    porcentaje: number; // 0.015 para 1.50%
}

export interface CustomScale {
    nombre: string;
    tramos: ScaleTramo[];
}

export interface ComponentConfig {
    activa: boolean;
    umbralCabezas?: number;
    escalaId?: string; // escalaPersonal, escalaAC, escalaProvincial, escalaOficina o id custom
    base?: 'resultado_propio' | 'resultado_regional' | 'resultado_oficina';
    pesoR?: number;
    pesoO?: number;
}

export interface CommissionModel {
    id: string;
    nombre: string;
    tieneMinimo: boolean;
    descripcion?: string;
    componenteP: ComponentConfig;
    componenteR: ComponentConfig;
    componenteO: ComponentConfig;
}

// Modelos estándar predefinidos (de compatibilidad con el Roster actual)
const PREDEFINED_MODELS: Record<string, CommissionModel> = {
    'completa': {
        id: 'completa',
        nombre: 'Completa (Estándar)',
        tieneMinimo: true,
        descripcion: 'Modelo estándar con Componente Personal (Escala AC), Regional (100% de tajada) y Oficina (100% de escala oficina si aplica).',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC', base: 'resultado_propio' },
        componenteR: { activa: true, pesoR: 1.0 },
        componenteO: { activa: true, pesoO: 1.0 }
    },
    'simple': {
        id: 'simple',
        nombre: 'Simple',
        tieneMinimo: true,
        descripcion: 'Modelo simple: sólo Componente Personal (Escala Personal). 0% Regional, 0% Oficina.',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaPersonal', base: 'resultado_propio' },
        componenteR: { activa: false, pesoR: 0 },
        componenteO: { activa: false, pesoO: 0 }
    },
    'hibrida': {
        id: 'hibrida',
        nombre: 'Híbrida / City Manager',
        tieneMinimo: true,
        descripcion: 'Modelo Híbrido: Componente Personal (Escala AC) + 50% de Componente Regional. 0% Oficina.',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC', base: 'resultado_propio' },
        componenteR: { activa: true, pesoR: 0.5 },
        componenteO: { activa: false, pesoO: 0 }
    },
    'sin minimo': {
        id: 'sin minimo',
        nombre: 'Sin Mínimo',
        tieneMinimo: false,
        descripcion: 'Componente Personal (Escala AC), pero sin sueldo mínimo garantizado (comisiona directo desde cero). 0% Regional, 0% Oficina.',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'escalaAC', base: 'resultado_propio' },
        componenteR: { activa: false, pesoR: 0 },
        componenteO: { activa: false, pesoO: 0 }
    },
    'operario': {
        id: 'operario',
        nombre: 'Operario',
        tieneMinimo: false,
        descripcion: 'Modelo Operario: 10% fijo de Componente Personal + 10% de Regional directo de su propia ganancia.',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'fijo_10', base: 'resultado_propio' },
        componenteR: { activa: true, pesoR: 0.10, base: 'resultado_propio' }, // Operario calcula R como 10% del resultado propio, no regional
        componenteO: { activa: false, pesoO: 0 }
    },
    'fijo': {
        id: 'fijo',
        nombre: 'Fijo',
        tieneMinimo: false,
        descripcion: 'Sueldo fijo sin variables adicionales en el cálculo básico de comisiones (10% personal fijo como valor técnico de escala).',
        componenteP: { activa: true, umbralCabezas: 0, escalaId: 'fijo_10', base: 'resultado_propio' },
        componenteR: { activa: false, pesoR: 0 },
        componenteO: { activa: false, pesoO: 0 }
    }
};

// Cargar escalas custom
export async function loadCustomScales(): Promise<Record<string, CustomScale>> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const row = rows.find(r => r[0] === 'scales');
        if (row && row[1]) {
            return JSON.parse(row[1]);
        }
    } catch (e) {
        console.error('Error cargando scales de Google Sheets', e);
    }
    return {};
}

// Guardar escalas custom
export async function saveCustomScales(scales: Record<string, CustomScale>) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const rowIndex = rows.findIndex(r => r[0] === 'scales');
        if (rowIndex >= 0) {
            const range = `Sys_Config!A${rowIndex + 1}:B${rowIndex + 1}`;
            await writeSheet(config.TARGET_SPREADSHEET_ID, range, [['scales', JSON.stringify(scales)]]);
        } else {
            await appendSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B', [['scales', JSON.stringify(scales)]]);
        }
    } catch (e) {
        console.error('Error guardando scales en Google Sheets', e);
    }
}

// Cargar modelos custom
export async function loadCustomModels(): Promise<Record<string, CommissionModel>> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const row = rows.find(r => r[0] === 'models');
        if (row && row[1]) {
            return JSON.parse(row[1]);
        }
    } catch (e) {
        console.error('Error cargando models de Google Sheets', e);
    }
    return {};
}

// Guardar modelos custom
export async function saveCustomModels(models: Record<string, CommissionModel>) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const rowIndex = rows.findIndex(r => r[0] === 'models');
        if (rowIndex >= 0) {
            const range = `Sys_Config!A${rowIndex + 1}:B${rowIndex + 1}`;
            await writeSheet(config.TARGET_SPREADSHEET_ID, range, [['models', JSON.stringify(models)]]);
        } else {
            await appendSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B', [['models', JSON.stringify(models)]]);
        }
    } catch (e) {
        console.error('Error guardando models en Google Sheets', e);
    }
}

// Obtener modelo por modalidad (soporta predefinidos y custom)
export async function getModelByModalidad(modalidad: string): Promise<CommissionModel> {
    const modNormalized = (modalidad || '').trim().toLowerCase();
    
    // 1. Buscar en modelos predefinidos
    if (PREDEFINED_MODELS[modNormalized]) {
        return PREDEFINED_MODELS[modNormalized];
    }

    // Compatibilidad adicional con términos sueltos
    if (modNormalized.includes('hibrid') || modNormalized.includes('city manager')) {
        return PREDEFINED_MODELS['hibrida'];
    }
    if (modNormalized.includes('sin minimo')) {
        return PREDEFINED_MODELS['sin minimo'];
    }
    if (modNormalized.includes('simple') || modNormalized.includes('part-time') || modNormalized.includes('part time')) {
        return PREDEFINED_MODELS['simple'];
    }
    if (modNormalized.includes('operario')) {
        return PREDEFINED_MODELS['operario'];
    }
    if (modNormalized.includes('fijo')) {
        return PREDEFINED_MODELS['fijo'];
    }

    // 2. Buscar en modelos custom por ID o nombre
    const customModels = await loadCustomModels();
    
    // Intenta buscar coincidencia exacta de ID
    if (customModels[modalidad]) {
        return customModels[modalidad];
    }
    // Intenta buscar coincidencia de ID normalizado
    const customIdMatch = Object.keys(customModels).find(key => key.toLowerCase() === modNormalized);
    if (customIdMatch) {
        return customModels[customIdMatch];
    }
    // Intenta buscar coincidencia por el campo "nombre"
    const customNameMatch = Object.values(customModels).find(m => m.nombre.toLowerCase() === modNormalized);
    if (customNameMatch) {
        return customNameMatch;
    }

    // 3. Fallback a completa
    return PREDEFINED_MODELS['completa'];
}

// Obtener el valor de escala dinámicamente
export async function resolveScalePct(
    cabezas: number, 
    escalaId: string, 
    year: number, 
    month: number
): Promise<number> {
    // 1. Escalas fijas de compatibilidad
    if (escalaId === 'fijo_10') {
        return 0.10;
    }

    // 2. Escalas estándar cargadas de Google Sheets
    const STANDARD_SCALES = ['escalaPersonal', 'escalaAC', 'escalaProvincial', 'escalaOficina'];
    if (STANDARD_SCALES.includes(escalaId)) {
        try {
            return await getExactScale(cabezas, escalaId as any, Number(year), Number(month));
        } catch (e) {
            console.error(`Error resolviendo escala estándar ${escalaId}`, e);
            return 0;
        }
    }

    // 3. Escalas custom basadas en tramos definidos por el usuario
    const customScales = await loadCustomScales();
    const customScale = customScales[escalaId];
    if (customScale && customScale.tramos && customScale.tramos.length > 0) {
        // Ordenar tramos por cabezas ascendente para buscar
        const sortedTramos = [...customScale.tramos].sort((a, b) => a.cabezas - b.cabezas);
        
        let applicablePct = 0;
        for (const tramo of sortedTramos) {
            if (cabezas >= tramo.cabezas) {
                applicablePct = tramo.porcentaje;
            } else {
                break; // Paramos cuando las cabezas requeridas superen la cantidad actual
            }
        }
        return applicablePct;
    }

    return 0;
}

// Retorna todos los modelos disponibles para la interfaz de usuario
export async function getAllModels(): Promise<{ id: string; nombre: string; tieneMinimo: boolean; descripcion: string; isCustom: boolean }[]> {
    const list: any[] = [];
    
    // Agregar predefinidos
    for (const [id, m] of Object.entries(PREDEFINED_MODELS)) {
        list.push({
            id,
            nombre: m.nombre,
            tieneMinimo: m.tieneMinimo,
            descripcion: m.descripcion || '',
            isCustom: false
        });
    }

    // Agregar custom
    const custom = await loadCustomModels();
    for (const [id, m] of Object.entries(custom)) {
        list.push({
            id,
            nombre: m.nombre,
            tieneMinimo: m.tieneMinimo,
            descripcion: m.descripcion || '',
            isCustom: true
        });
    }

    return list;
}
