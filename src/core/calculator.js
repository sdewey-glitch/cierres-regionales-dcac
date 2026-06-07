"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolateLogScale = interpolateLogScale;
exports.loadConfig = loadConfig;
exports.getMinimumForCategory = getMinimumForCategory;
exports.getExactScale = getExactScale;
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
let minimosCache = null;
let escalasCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds
function interpolateLogScale(value, minBound, maxBound, minPct, maxPct) {
    if (value <= minBound)
        return maxPct / 100;
    if (value >= maxBound)
        return minPct / 100;
    const pct = maxPct + (minPct - maxPct) * (1 - (Math.log10(Math.max(value, minBound)) - Math.log10(minBound)) / (Math.log10(maxBound) - Math.log10(minBound)));
    return pct / 100;
}
async function loadConfig() {
    const now = Date.now();
    if (minimosCache && escalasCache && (now - lastFetchTime < CACHE_TTL_MS))
        return;
    try {
        const minimosData = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, 'Config_Minimos!A2:G');
        minimosCache = minimosData.filter(r => r[0]).map(row => ({
            idCategoria: Number(row[0]),
            nombreCategoria: String(row[1]),
            ano: Number(row[2]),
            mes: Number(row[3]),
            anoMes: Number(row[4]),
            sueldoMinimo: Number(row[5]) || 0,
            topeExtra: Number(row[6]) || 0
        }));
        const escalasData = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, 'Config_Escalas!A2:G');
        escalasCache = escalasData.filter(r => r[0]).map(row => ({
            tipoEscala: String(row[0]),
            ano: Number(row[1]),
            mes: Number(row[2]),
            anoMes: Number(row[3]),
            minimoPct: Number(row[4]) || 0,
            maximoPct: Number(row[5]) || 0,
            topeCabezas: Number(row[6]) || 0
        }));
        lastFetchTime = now;
    }
    catch (e) {
        console.error("Error loading config from Hub:", e);
        if (!minimosCache)
            minimosCache = [];
        if (!escalasCache)
            escalasCache = [];
    }
}
function getClosestPeriodConfig(cache, targetPeriodo) {
    if (!cache.length)
        return [];
    const periods = Array.from(new Set(cache.map(c => c.anoMes))).sort((a, b) => b - a);
    let bestPeriod = periods[0]; // defaults to newest
    for (const p of periods) {
        if (p <= targetPeriodo) {
            bestPeriod = p;
            break;
        }
    }
    return cache.filter(c => c.anoMes === bestPeriod);
}
async function getMinimumForCategory(category, year, month) {
    await loadConfig();
    const targetPeriodo = Number(`${year}${month.toString().padStart(2, '0')}`);
    const activeMinimos = getClosestPeriodConfig(minimosCache || [], targetPeriodo);
    const matched = activeMinimos.find(m => m.idCategoria === category);
    return matched ? matched.sueldoMinimo : 0;
}
async function getExactScale(cabezasRaw, type, year, month) {
    await loadConfig();
    const targetPeriodo = Number(`${year}${month.toString().padStart(2, '0')}`);
    const activeEscalas = getClosestPeriodConfig(escalasCache || [], targetPeriodo);
    const rule = activeEscalas.find(e => e.tipoEscala === type);
    const maxScale = rule ? rule.maximoPct : 20;
    const minScale = rule ? rule.minimoPct : 5;
    const maxCabezas = rule ? rule.topeCabezas : 2000;
    const cabezas = Math.floor(cabezasRaw / 250) * 250;
    if (cabezas === 0)
        return maxScale / 100;
    if (cabezas >= maxCabezas)
        return minScale / 100;
    const log100 = Math.log10(100);
    const logMax = Math.log10(maxCabezas);
    const logCabezas = Math.log10(Math.max(cabezas, 1));
    let resultPct = minScale + (maxScale - minScale) * (1 - (logCabezas - log100) / (logMax - log100));
    if (resultPct > maxScale)
        resultPct = maxScale;
    if (resultPct < minScale)
        resultPct = minScale;
    return resultPct / 100;
}
