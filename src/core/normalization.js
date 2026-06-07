"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateRosterCache = invalidateRosterCache;
exports.getRoster = getRoster;
exports.normalizeName = normalizeName;
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let rosterCache = null;
function invalidateRosterCache() {
    rosterCache = null;
}
// Mapea nombres alternativos o con errores de tipeo comunes al nombre canónico
const ALIAS_MAP = {};
async function getRoster() {
    if (rosterCache)
        return rosterCache;
    const MASTER_ROSTER_ID = env_1.config.MASTER_ROSTER_ID;
    // Headers confirmados de 'Asociados Comerciales':
    // 0:Nombre Apellido | 1:Codigo | 2:Provincia | 3:Partido | 4:Oficina | 5:Tipo | 6:Modalidad
    // 7:Escalas | 8:Detalle Escalas | 9:Activo | 10:Link | 11:Tier | 12:Ingreso | 13:Mail | 14:Auto
    // 15:Mendel | 16:Responsable DC | 17:Op Faena | 18:Op Inv | 19:Op Inv Neo | 20:Op Cria
    // 21:Beneficios | 22:Categoria | 23:Grupo Familiar | 24:Lat | 25:Long
    // 26:Nombre Original | 27:Departamento | 28:Depto ID
    let data;
    try {
        data = await (0, sheets_1.readSheet)(MASTER_ROSTER_ID, "'Asociados Comerciales'!A2:AD");
    }
    catch (e) {
        console.warn(`[Roster] Sin conexión: ${e.message}. Buscando cache offline...`);
        const cachePath = path.join(__dirname, 'cache/roster_ac.json');
        if (fs.existsSync(cachePath)) {
            data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            console.log(`[Roster] Cargado desde cache offline (${data.length} filas)`);
        }
        else {
            throw new Error('Sin conexión y sin cache offline del roster');
        }
    }
    rosterCache = new Map();
    for (const row of data) {
        if (!row[0])
            continue;
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
            pctMinimo: Number(row[29]) > 0 ? Number(row[29]) : 1.0 // Col AD: % del mínimo (0.7 = 70%). Default 100%
        });
    }
    console.log(`[Roster] Cargado: ${rosterCache.size} entradas desde 'Asociados Comerciales'`);
    const tipos = new Set([...rosterCache.values()].map(r => r.tipo));
    const activos = [...rosterCache.values()].filter(r => r.activo).length;
    console.log(`[Roster] ${activos} activos. Tipos: ${[...tipos].join(', ')}`);
    return rosterCache;
}
async function normalizeName(rawName) {
    if (!rawName)
        return null;
    let name = rawName.trim();
    if (!name)
        return null;
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
