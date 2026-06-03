import { readSheet } from '../api/sheets';
import { config } from '../config/env';
import * as path from 'path';
import * as fs from 'fs';

export interface RosterEntry {
    nombre: string;         // 0
    codigo: string;         // 1
    provincia: string;      // 2
    partido: string;        // 3
    oficina: string;        // 4
    tipo: string;           // 5
    modalidad: string;      // 6
    escalas: string;        // 7
    detalleEscalas: string; // 8
    activo: boolean;        // 9
    link: string;           // 10
    tier: string;           // 11
    ingreso: string;        // 12
    mail: string;           // 13
    auto: string;           // 14 — raw value: 'Propio', 'DCAC', 'Empresa', etc.
    mendel: boolean;        // 15
    responsableDC: string;  // 16
    operadorFaena: string;  // 17
    operadorInv: string;    // 18
    operadorInvNeo: string; // 19
    operadorCria: string;   // 20
    beneficios: string;     // 21
    categoria: number;      // 22
    grupoFamiliar: string;  // 23
    lat: string;            // 24
    long: string;           // 25
    nombreOriginal: string; // 26
    departamento: string;   // 27
    deptoId: string;        // 28
    email: string;          // Alias para compatibilidad con código existente
    idsUsuarios: string;    // Campo virtual (no viene directo de cols base pero lo mantenemos por compatibilidad o se mapea)
    cuit: string;           // Campo virtual/compatibilidad
    excepcionGastos: string;// Campo virtual/compatibilidad
    pctMinimo: number;      // Porcentaje del mínimo de su categoría (1.0 = 100%, 0.7 = 70%). Default: 1.0
}

let rosterCache: Map<string, RosterEntry> | null = null;

export function invalidateRosterCache() {
    rosterCache = null;
}
// Mapea nombres alternativos o con errores de tipeo comunes al nombre canónico
const ALIAS_MAP: Record<string, string> = {};

export async function getRoster(): Promise<Map<string, RosterEntry>> {
    if (rosterCache) return rosterCache;

    const MASTER_ROSTER_ID = config.MASTER_ROSTER_ID;
    // Headers confirmados de 'Asociados Comerciales':
    // 0:Nombre Apellido | 1:Codigo | 2:Provincia | 3:Partido | 4:Oficina | 5:Tipo | 6:Modalidad
    // 7:Escalas | 8:Detalle Escalas | 9:Activo | 10:Link | 11:Tier | 12:Ingreso | 13:Mail | 14:Auto
    // 15:Mendel | 16:Responsable DC | 17:Op Faena | 18:Op Inv | 19:Op Inv Neo | 20:Op Cria
    // 21:Beneficios | 22:Categoria | 23:Grupo Familiar | 24:Lat | 25:Long
    // 26:Nombre Original | 27:Departamento | 28:Depto ID
    let data: any[];
    try {
        data = await readSheet(MASTER_ROSTER_ID, "'Asociados Comerciales'!A2:AD");
    } catch (e: any) {
        console.warn(`[Roster] Sin conexión: ${e.message}. Buscando cache offline...`);
        const cachePath = path.join(__dirname, 'cache/roster_ac.json');
        if (fs.existsSync(cachePath)) {
            data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            console.log(`[Roster] Cargado desde cache offline (${data.length} filas)`);
        } else {
            throw new Error('Sin conexión y sin cache offline del roster');
        }
    }
    rosterCache = new Map();

    for (const row of data) {
        if (!row[0]) continue;
        const nombre = String(row[0]).trim();
        const activoRaw = String(row[9] || '').trim().toLowerCase();
        const isActivo = activoRaw === 'si' || activoRaw === 'sí' || activoRaw === 'true' || activoRaw === '1';

        rosterCache.set(nombre.toLowerCase(), {
            nombre,
            codigo: String(row[1] || '').trim(),
            provincia: String(row[2] || '').trim(),
            partido: String(row[3] || '').trim(),
            oficina: String(row[4] || '').trim(),
            tipo: String(row[5] || '').trim(),
            modalidad: String(row[6] || '').trim(),
            escalas: String(row[7] || '').trim(),
            detalleEscalas: String(row[8] || '').trim(),
            activo: isActivo,
            link: String(row[10] || '').trim(),
            tier: String(row[11] || '').trim(),
            ingreso: String(row[12] || '').trim(),
            mail: String(row[13] || '').trim(),
            auto: String(row[14] || '').trim(),
            mendel: String(row[15] || '').trim().toLowerCase() === 'si',
            responsableDC: String(row[16] || '').trim(),
            operadorFaena: String(row[17] || '').trim(),
            operadorInv: String(row[18] || '').trim(),
            operadorInvNeo: String(row[19] || '').trim(),
            operadorCria: String(row[20] || '').trim(),
            beneficios: String(row[21] || '').trim(),
            categoria: Number(row[22]) || 0,
            grupoFamiliar: String(row[23] || '').trim(),
            lat: String(row[24] || '').trim(),
            long: String(row[25] || '').trim(),
            nombreOriginal: String(row[26] || nombre).trim(),
            departamento: String(row[27] || '').trim(),
            deptoId: String(row[28] || '').trim(),
            email: String(row[13] || '').trim(),
            idsUsuarios: String(row[1] || '').trim(),
            cuit: '',
            excepcionGastos: '',
            pctMinimo: Number(row[29]) > 0 ? Number(row[29]) : 1.0  // Col AD: % del mínimo (0.7 = 70%). Default 100%
        });
    }

    console.log(`[Roster] Cargado: ${rosterCache.size} entradas desde 'Asociados Comerciales'`);
    const tipos = new Set([...rosterCache.values()].map(r => r.tipo));
    const activos = [...rosterCache.values()].filter(r => r.activo).length;
    console.log(`[Roster] ${activos} activos. Tipos: ${[...tipos].join(', ')}`);

    return rosterCache;
}


export async function normalizeName(rawName: string | null | undefined): Promise<string | null> {
    if (!rawName) return null;
    let name = rawName.trim();
    if (!name) return null;

    if (ALIAS_MAP[name]) {
        name = ALIAS_MAP[name];
    }

    const roster = await getRoster();
    const match = roster.get(name.toLowerCase());
    
    const AC_TIPOS = ['Regional', 'City Manager', 'Corporate', 'Representante', 'Oficina'];
    if (match && AC_TIPOS.includes(match.tipo)) {
        return match.nombre;
    }

    // Si no está en el roster activo, devolver el nombre raw para preservar
    // datos históricos (ex-ACs que ya no están pero operaron en meses anteriores)
    return name;
}
