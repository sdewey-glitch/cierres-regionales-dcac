import { readSheet } from '../api/sheets';
import { config } from '../config/env';

export interface GastoEntry {
    año: number;
    mes: number;
    comercial: string;
    concepto: string;
    monto: number;
}

export interface AjusteEntry {
    año: number;
    mes: number;
    comercial: string;
    motivo: string;
    monto: number;
}

export interface KmsEntry {
    año: number;
    mes: number;
    comercial: string;
    patente: string;
    tipoVehiculo: string;
    kmsEmpresa: number;
    kmsTotal: number;
}

export interface AmortEntry {
    comercial: string;
    provincia: string;
    añoModelo: number;
    modelo: string;
    amort2024: number;
    amort2025: number;
}

export interface MendelGasto {
    usuario: string;
    comercio: string;
    importe: number;
    categoria: string;
    periodo: string;
}

// Para leer los inputs usaremos las planillas divididas por dominio
const CONFIG_ID = config.HUB_CONFIGURACIONES_ID;
const GASTOS_ID = config.HUB_GASTOS_ID;
const CIERRES_ID = config.HUB_CIERRES_ID;
const TABLERO_ID = config.HUB_TABLERO_ID;
const HISTORIAL_ID = config.HUB_HISTORIAL_ID;

export async function fetchGastos(): Promise<GastoEntry[]> {
    try {
        const data = await readSheet(GASTOS_ID, "'BDGASTOS'!A2:E");
        return data.filter(row => row[0]).map(row => ({
            año: Number(row[0]),
            mes: Number(row[1]),
            comercial: String(row[2] || '').trim(),
            concepto: String(row[3] || '').trim(),
            monto: Number(row[4]) || 0
        }));
    } catch (e: any) {
        console.warn("No se pudo leer BDGASTOS.", e.message);
        return [];
    }
}

export async function fetchAjustesManuales(): Promise<AjusteEntry[]> {
    try {
        // Nuevo formato: Año(A) | Mes(B) | AñoMes(C) | Asociado_Comercial(D) | Motivo(E) | Monto(F)
        const data = await readSheet(CONFIG_ID, "'Ajustes'!A2:F");
        return data.filter(row => row[0] && row[3]).map(row => ({
            año: Number(row[0]),
            mes: Number(row[1]),
            comercial: String(row[3] || '').trim(),  // D: Asociado_Comercial
            motivo: String(row[4] || '').trim(),      // E: Motivo
            monto: Number(row[5]) || 0                // F: Monto
        }));
    } catch (e: any) {
        console.warn("No se pudo leer Ajustes.", e.message);
        return [];
    }
}

export async function fetchTajada(): Promise<any[]> {
    try {
        // [ 'Año', 'Mes', 'AñoMes', 'Oficina', 'Provincia', 'Modalidad', 'Comercial', 'Sociedades Operadas', 'Sociedades Oficina', '% Tajada' ]
        const data = await readSheet(CIERRES_ID, "'Config_Tajada'!A2:J");
        return data.filter(row => row[2]).map(row => {
            return {
                año: Number(row[0]),
                mes: Number(row[1]),
                añoMes: String(row[2]),
                oficina: String(row[3]),
                provincia: String(row[4]),
                modalidad: String(row[5]),
                comercial: String(row[6]).trim(),
                sociedades: Number(row[7]),
                totalOficina: Number(row[8]),
                porcentajeTajada: (typeof row[9] === 'string' && String(row[9]).includes('%')) 
                    ? Number(String(row[9]).replace('%','').replace(',','.')) / 100 
                    : (Number(row[9]) > 1 ? Number(row[9]) / 100 : Number(row[9])) || 0
            };
        });
    } catch (e: any) {
        console.warn("No se pudo leer Config_Tajada del Hub", e.message);
        return [];
    }
}

// === NUEVAS FUENTES DE GASTOS ===

export async function fetchKms(): Promise<KmsEntry[]> {
    try {
        // KMS tab: AÑO | MES | MAIL | COMERCIAL | PATENTE | TIPO | KMS_EMPRESA | KMS_TOTAL | FECHA_ACTUALIZACION
        const data = await readSheet(GASTOS_ID, "'KMS'!A2:H");
        return data.filter(row => row[0]).map(row => ({
            año: Number(row[0]),
            mes: Number(row[1]),
            comercial: String(row[3] || '').trim(),
            patente: String(row[4] || '').trim(),
            tipoVehiculo: String(row[5] || '').trim().toLowerCase(),
            kmsEmpresa: Number(row[6]) || 0,
            kmsTotal: Number(row[7]) || 0,
        }));
    } catch (e: any) {
        console.warn("No se pudo leer KMS.", e.message);
        return [];
    }
}

export async function fetchPreciosKm(): Promise<Map<string, number>> {
    try {
        // Kms & $: Row 2+ = tipo vehiculo | blank | prices by month...
        // We use the latest price column (column J = index 9 for 202601)
        const data = await readSheet(GASTOS_ID, "'Kms & $'!A2:J10");
        const prices = new Map<string, number>();
        for (const row of data) {
            const tipo = String(row[0] || '').trim().toLowerCase();
            if (!tipo || tipo === 'comercial') break; // Stop at the second section
            // Get the latest price (last non-empty column)
            let precio = 0;
            for (let i = row.length - 1; i >= 2; i--) {
                if (Number(row[i]) > 0) { precio = Number(row[i]); break; }
            }
            prices.set(tipo, precio);
        }
        return prices;
    } catch (e: any) {
        console.warn("No se pudo leer Kms & $.", e.message);
        return new Map();
    }
}

export async function fetchVehicleMap(): Promise<Map<string, string>> {
    try {
        // The second section of 'Kms & $' (starting at row 6) maps Comercial → Vehículo
        const data = await readSheet(GASTOS_ID, "'Kms & $'!A6:B30");
        const map = new Map<string, string>();
        for (const row of data) {
            const comercial = String(row[0] || '').trim().toLowerCase();
            const vehiculo = String(row[1] || '').trim().toLowerCase();
            if (comercial && vehiculo && comercial !== 'comercial') {
                map.set(comercial, vehiculo);
            }
        }
        return map;
    } catch (e: any) {
        console.warn("No se pudo leer mapeo vehículos.", e.message);
        return new Map();
    }
}

export async function fetchAmortDcac(): Promise<AmortEntry[]> {
    try {
        // Amort_DCAC: Asociado Comercial | Provincia | Año | Modelo | 2024 | 2025
        const data = await readSheet(GASTOS_ID, "'Amort_DCAC'!A2:F");
        return data.filter(row => row[0]).map(row => ({
            comercial: String(row[0] || '').trim(),
            provincia: String(row[1] || '').trim(),
            añoModelo: Number(row[2]) || 0,
            modelo: String(row[3] || '').trim(),
            amort2024: Number(row[4]) || 0,
            amort2025: Number(row[5]) || 0,
        }));
    } catch (e: any) {
        console.warn("No se pudo leer Amort_DCAC.", e.message);
        return [];
    }
}

export async function fetchMendelGastos(): Promise<MendelGasto[]> {
    try {
        // Config_Mendel REAL headers (10 cols):
        // A:Año | B:Mes | C:AñoMes | D:ID Usuario | E:Comercial | F:Email | G:Provincia | H:Oficina | I:Categoría | J:Monto Agrupado
        const data = await readSheet(GASTOS_ID, "'Config_Mendel'!A2:J");
        return data.filter(row => row[2]).map(row => ({
            periodo: String(row[2]).trim(),        // C: AñoMes
            usuario: String(row[4] || '').trim(),   // E: Comercial
            categoria: String(row[8] || '').trim(), // I: Categoría
            importe: Number(row[9]) || 0,           // J: Monto Agrupado
            comercio: 'Varios'
        }));
    } catch (e: any) {
        console.warn("No se pudo leer MendelGastos.", e.message);
        return [];
    }
}
