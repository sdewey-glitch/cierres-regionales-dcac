import { readSheet } from '../api/sheets';
import { config } from '../config/env';
import { getRoster } from './normalization';

export function cleanSheetsNumber(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    let str = String(val).trim();
    // Limpiar signo $, espacios
    str = str.replace('$', '').replace(/\s/g, '');
    
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    
    if (hasComma && hasDot) {
        // Formato español: 1.200.000,50 -> quitar puntos y cambiar coma a punto
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        // Solo coma decimal -> ej. 120000,50 -> cambiar coma a punto
        str = str.replace(',', '.');
    }
    
    const parsed = Number(str);
    return isNaN(parsed) ? 0 : parsed;
}

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
    provincia?: string;
    codigo?: string;
    fecha?: string;
}

export interface ViajeEntry {
    idViaje: string;
    fecha: string;       // YYYY-MM-DD
    desde: string;
    hasta: string;
    km: number;
    motivo: string;
    usuario: string;     // email
    comercial: string;   // nombre normalizado
}

export interface ViajesAgregados {
    comercial: string;
    año: number;
    mes: number;
    kmsTotales: number;
    cantViajes: number;
    viajes: ViajeEntry[];
}

// Para leer los inputs usaremos las planillas divididas por dominio
const CONFIG_ID = config.HUB_CONFIGURACIONES_ID;
const GASTOS_ID = config.HUB_GASTOS_ID;
const CIERRES_ID = config.HUB_CIERRES_ID;
const KMS_VIAJES_ID = config.KMS_VIAJES_ID;
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
            monto: cleanSheetsNumber(row[5])          // F: Monto
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

/** Normaliza nombres de tipo de vehículo entre distintas fuentes */
function normalizeTipoVehiculo(tipo: string): string {
    const t = tipo.trim().toLowerCase();
    if (t === 'camioneta') return 'chata';
    if (t === 'sedan') return 'auto';
    return t; // suv, chata, auto
}

export async function fetchPreciosKm(year?: number, month?: number): Promise<Map<string, number>> {
    const KMS_STOCK_ID = config.KMS_STOCK_ID;

    // ── Fuente nueva: Stock Autos - Kms → pestaña $xKMs ──
    // Formato: Año | Mes | $ x km | Tipo (suv/chata/auto)
    if (KMS_STOCK_ID && year && month) {
        try {
            const data = await readSheet(KMS_STOCK_ID, "'$xKMs'!A2:D");
            const prices = new Map<string, number>();

            // Buscar fila exacta para el año/mes pedido
            const exactRows = data.filter(row =>
                Number(row[0]) === year && Number(row[1]) === month && row[2] && row[3]
            );

            let rowsToUse = exactRows;

            // Si no hay datos exactos, usar el mes anterior más cercano disponible
            if (exactRows.length === 0) {
                const targetYM = year * 100 + month;
                const candidates = data.filter(row => {
                    const ym = Number(row[0]) * 100 + Number(row[1]);
                    return ym < targetYM && row[2] && row[3];
                });
                if (candidates.length > 0) {
                    const latestYM = Math.max(...candidates.map(r => Number(r[0]) * 100 + Number(r[1])));
                    const latestYear = Math.floor(latestYM / 100);
                    const latestMonth = latestYM % 100;
                    rowsToUse = candidates.filter(row =>
                        Number(row[0]) === latestYear && Number(row[1]) === latestMonth
                    );
                    console.log(`[fetchPreciosKm] Sin datos para ${year}-${month}, usando ${latestYear}-${latestMonth} como fallback`);
                }
            }

            for (const row of rowsToUse) {
                const precio = cleanSheetsNumber(row[2]);
                const tipo = normalizeTipoVehiculo(String(row[3] || ''));
                if (tipo && precio > 0) {
                    prices.set(tipo, precio);
                }
            }

            if (prices.size > 0) {
                console.log(`[fetchPreciosKm] ✅ Precios desde Stock Autos ${year}-${month}:`, Object.fromEntries(prices));
                return prices;
            }
        } catch (e: any) {
            console.warn('[fetchPreciosKm] No se pudo leer $xKMs de Stock Autos:', e.message);
        }
    }

    // ── Fallback: fuente vieja Kms & $ (formato horizontal por columna-mes) ──
    try {
        const data = await readSheet(GASTOS_ID, "'Kms & $'!A2:Z10");
        const prices = new Map<string, number>();
        for (const row of data) {
            const tipo = normalizeTipoVehiculo(String(row[0] || ''));
            if (!tipo || tipo === 'comercial') break;
            let precio = 0;
            for (let i = row.length - 1; i >= 2; i--) {
                if (Number(row[i]) > 0) { precio = Number(row[i]); break; }
            }
            if (tipo && precio > 0) prices.set(tipo, precio);
        }
        console.log('[fetchPreciosKm] ⚠️ Usando fuente fallback Kms & $:', Object.fromEntries(prices));
        return prices;
    } catch (e: any) {
        console.warn("No se pudo leer Kms & $.", e.message);
        return new Map();
    }
}


export async function fetchVehicleMap(): Promise<Map<string, string>> {
    const KMS_STOCK_ID = config.KMS_STOCK_ID;
    const map = new Map<string, string>();
    const normalizeKey = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // ── Fuente primaria: solapa 'Comerciales' del sheet Stock Autos - Kms ──
    // Columnas: A=Mail | B=Comercial | C=Tipo (dcac/propio) | D=Patente | E=Vehículo (suv/chata/auto) | F=CC
    if (KMS_STOCK_ID) {
        try {
            const data = await readSheet(KMS_STOCK_ID, "'Comerciales'!A2:F");
            for (const row of data) {
                const comercialRaw = String(row[1] || '').trim();
                const vehiculo = normalizeTipoVehiculo(String(row[4] || '').trim());
                if (comercialRaw && vehiculo) {
                    map.set(comercialRaw.toLowerCase(), vehiculo);
                    map.set(normalizeKey(comercialRaw), vehiculo); // sin acentos
                }
            }
            if (map.size > 0) {
                console.log(`[fetchVehicleMap] ✅ ${Math.round(map.size / 2)} vehículos desde Stock Autos Comerciales`);
                return map;
            }
        } catch (e: any) {
            console.warn('[fetchVehicleMap] No se pudo leer Comerciales de Stock Autos:', e.message);
        }
    }

    // ── Fallback: solapa vieja 'Kms & $' del HUB_GASTOS_ID ──
    try {
        const data = await readSheet(GASTOS_ID, "'Kms & $'!A6:B30");
        for (const row of data) {
            const comercialRaw = String(row[0] || '').trim();
            const vehiculo = normalizeTipoVehiculo(String(row[1] || '').trim());
            if (comercialRaw && vehiculo && comercialRaw.toLowerCase() !== 'comercial') {
                map.set(comercialRaw.toLowerCase(), vehiculo);
                map.set(normalizeKey(comercialRaw), vehiculo);
            }
        }
        console.log(`[fetchVehicleMap] ⚠️ Usando fallback Kms & $: ${Math.round(map.size / 2)} entradas`);
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
        const spreadsheetId = config.MENDEL_SPREADSHEET_ID;
        
        // 1. Read Base Mendel
        const rawMendel = await readSheet(spreadsheetId, "'Base Mendel'!A2:BC");
        
        // 2. Read Copia de Correlaciones usuarios Mendel
        const rawCorr = await readSheet(spreadsheetId, "'Correlaciones usuarios Mendel'!A2:B");
        
        // 3. Get Roster
        const roster = await getRoster();

        const cleanKey = (s: string) => {
            if (!s) return '';
            return String(s)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase();
        };

        const corrMap: Record<string, string> = {};
        for (const row of rawCorr) {
            const mendelUser = String(row[0] || '').trim();
            const histUser = String(row[1] || '').trim();
            if (mendelUser && histUser) {
                corrMap[cleanKey(mendelUser)] = cleanKey(histUser);
            }
        }

        const rosterCleanMap = new Map<string, { nombre: string; provincia: string; codigo: string; email: string }>();
        for (const [key, r] of roster.entries()) {
            const cKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '');
            rosterCleanMap.set(cKey, {
                nombre: r.nombre,
                provincia: r.provincia,
                codigo: r.codigo,
                email: r.mail || r.email
            });
        }

        const list: MendelGasto[] = [];

        const parseNum = (val: any): number => {
            if (val === null || val === undefined || val === '') return 0;
            if (typeof val === 'number') return val;
            let str = String(val).trim();
            if (str.startsWith('#')) return 0;
            str = str.replace(/[^\d.,-]/g, '');
            if (str.includes(',') && str.includes('.')) {
                if (str.indexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
                else str = str.replace(/,/g, '');
            } else if (str.includes(',')) {
                if (/,\d{1,2}$/.test(str)) str = str.replace(',', '.');
                else str = str.replace(/,/g, '');
            }
            let parsed = parseFloat(str);
            return isNaN(parsed) ? 0 : parsed;
        };

        const parseSheetDate = (val: any): string => {
            if (!val) return '-';
            if (typeof val === 'number') {
                const date = new Date((val - 25569) * 86400 * 1000);
                const d = date.getUTCDate();
                const m = date.getUTCMonth() + 1;
                const y = date.getUTCFullYear();
                return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
            }
            return String(val).split('T')[0];
        };

        for (const row of rawMendel) {
            if (row.length < 16) continue;
            
            const estado = String(row[15] || '').trim().toUpperCase();
            if (estado !== 'CONFIRMADA' && estado !== 'CONFIRMADO') continue;

            const periodo = String(row[54] || '').trim();
            if (!periodo) continue;

            const rawUser = String(row[3] || '').trim();
            let normUser = String(row[52] || '').trim();
            if (!normUser) {
                normUser = rawUser;
            }

            const key = cleanKey(normUser);
            const mappedKey = corrMap[cleanKey(rawUser)] || corrMap[key] || key;
            const rosterInfo = rosterCleanMap.get(mappedKey) || rosterCleanMap.get(key) || { nombre: normUser || rawUser, provincia: 'Sin Región', codigo: '' };

            list.push({
                periodo: periodo,
                usuario: rosterInfo.nombre,
                categoria: String(row[53] || '').trim() || 'Otros',
                importe: parseNum(row[5]),
                comercio: String(row[4] || '').trim() || 'Varios',
                provincia: rosterInfo.provincia,
                codigo: rosterInfo.codigo,
                fecha: parseSheetDate(row[1])
            });
        }

        return list;
    } catch (e: any) {
        console.warn("No se pudo leer MendelGastos dinámicamente.", e.message);
        return [];
    }
}

/** 
 * Lee viajes individuales del CRM (Viajes CRM - AutosPropios) y los agrega por comercial+mes.
 * Regla: viajes de los primeros 5 días del mes se cuentan para el mes anterior.
 */
export async function fetchViajesPropios(): Promise<ViajesAgregados[]> {
    try {
        if (!KMS_VIAJES_ID) {
            console.warn("KMS_VIAJES_ID no configurado, saltando viajes propios.");
            return [];
        }
        const roster = await getRoster();
        
        // Leer Viajes CRM - AutosPropios
        // Headers: ID Viaje | Fecha | Desde | Hasta | KM | Motivo de viaje | Usuario (email) | Actualizado | Comercial | Año
        const raw = await readSheet(KMS_VIAJES_ID, "'Viajes CRM - AutosPropios'!A2:J");
        
        // Mapear emails del roster para resolver usuarios
        const emailToName = new Map<string, string>();
        for (const [name, r] of roster.entries()) {
            const email = (r.mail || r.email || '').toLowerCase();
            if (email) emailToName.set(email, name);
        }
        
        const serialToDate = (serial: number): Date => {
            return new Date((serial - 25569) * 86400000);
        };
        
        // Cutoff: los primeros 5 días del mes van al mes anterior
        const CUTOFF_DAYS = 5;
        
        const getEffectiveMonth = (date: Date): { año: number; mes: number } => {
            let year = date.getUTCFullYear();
            let month = date.getUTCMonth() + 1; // 1-indexed
            const day = date.getUTCDate();
            
            if (day <= CUTOFF_DAYS) {
                // Primeros 5 días → mes anterior
                month--;
                if (month === 0) { month = 12; year--; }
            }
            return { año: year, mes: month };
        };
        
        // Parse viajes
        const viajes: ViajeEntry[] = [];
        for (const row of raw) {
            const fechaSerial = Number(row[1]);
            const km = Number(row[4]) || 0;
            const email = String(row[6] || '').trim().toLowerCase();
            const comercialDirect = String(row[8] || '').trim();
            
            if (!fechaSerial || fechaSerial < 45000 || km <= 0 || km > 50000) continue;
            
            const date = serialToDate(fechaSerial);
            const dateStr = date.toISOString().split('T')[0];
            
            // Resolver nombre del comercial
            let comercial = comercialDirect;
            if (!comercial && email) {
                comercial = emailToName.get(email) || email.split('@')[0];
            }
            
            viajes.push({
                idViaje: String(row[0] || ''),
                fecha: dateStr,
                desde: String(row[2] || ''),
                hasta: String(row[3] || ''),
                km,
                motivo: String(row[5] || ''),
                usuario: email,
                comercial,
            });
        }
        
        // Agregar por comercial + mes efectivo
        const agrupado = new Map<string, ViajesAgregados>();
        
        for (const v of viajes) {
            const date = new Date(v.fecha);
            const { año, mes } = getEffectiveMonth(date);
            const key = `${v.comercial.toLowerCase()}_${año}_${mes}`;
            
            if (!agrupado.has(key)) {
                agrupado.set(key, {
                    comercial: v.comercial,
                    año,
                    mes,
                    kmsTotales: 0,
                    cantViajes: 0,
                    viajes: [],
                });
            }
            const ag = agrupado.get(key)!;
            ag.kmsTotales += v.km;
            ag.cantViajes++;
            ag.viajes.push(v);
        }
        
        const result = [...agrupado.values()];
        console.log(`[ViajesPropios] ${viajes.length} viajes → ${result.length} registros agregados`);
        return result;
    } catch (e: any) {
        console.warn("No se pudo leer Viajes CRM - AutosPropios.", e.message);
        return [];
    }
}
