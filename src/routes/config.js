"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_1 = require("../api/sheets");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
// ═══════════════════════════════════════════════════════════════
// Config Minimos  (HUB_SPREADSHEET_ID → Config_Minimos!A2:G)
// Columns: idCategoria, nombreCategoria, año, mes, añoMes, sueldoMinimo, topeExtra
// ═══════════════════════════════════════════════════════════════
router.get('/minimos', async (req, res) => {
    try {
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Minimos!A2:G");
        const data = [];
        raw.forEach((row, idx) => {
            data.push({
                id: idx,
                idCategoria: String(row[0] || ''),
                nombreCategoria: String(row[1] || ''),
                año: Number(row[2]) || 0,
                mes: Number(row[3]) || 0,
                añoMes: String(row[4] || ''),
                sueldoMinimo: Number(row[5]) || 0,
                topeExtra: Number(row[6]) || 0
            });
        });
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/minimos', async (req, res) => {
    try {
        const { idCategoria, nombreCategoria, año, mes, sueldoMinimo, topeExtra } = req.body;
        if (!idCategoria || !nombreCategoria || !año || !mes || isNaN(Number(sueldoMinimo))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [
            String(idCategoria),
            String(nombreCategoria),
            Number(año),
            Number(mes),
            añoMes,
            Number(sueldoMinimo),
            Number(topeExtra) || 0
        ];
        await (0, sheets_1.appendSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Minimos!A:G", [row]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Bulk create (for cloning periods)
router.post('/minimos/bulk', async (req, res) => {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de filas' });
        }
        const sheetRows = rows.map((r) => {
            const añoMes = `${r.año}${String(r.mes).padStart(2, '0')}`;
            return [
                String(r.idCategoria),
                String(r.nombreCategoria),
                Number(r.año),
                Number(r.mes),
                añoMes,
                Number(r.sueldoMinimo),
                Number(r.topeExtra) || 0
            ];
        });
        await (0, sheets_1.appendSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Minimos!A:G", sheetRows);
        res.json({ success: true, count: sheetRows.length });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.put('/minimos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const { idCategoria, nombreCategoria, año, mes, sueldoMinimo, topeExtra } = req.body;
        if (!idCategoria || !nombreCategoria || !año || !mes || isNaN(Number(sueldoMinimo))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [
            String(idCategoria),
            String(nombreCategoria),
            Number(año),
            Number(mes),
            añoMes,
            Number(sueldoMinimo),
            Number(topeExtra) || 0
        ];
        const sheetRow = id + 2;
        const range = `Config_Minimos!A${sheetRow}:G${sheetRow}`;
        await (0, sheets_1.writeSheet)(env_1.config.HUB_SPREADSHEET_ID, range, [row]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.delete('/minimos/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Minimos!A2:G");
        if (id >= raw.length) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        raw.splice(id, 1);
        await (0, sheets_1.clearSheetRange)(env_1.config.HUB_SPREADSHEET_ID, "Config_Minimos!A2:G2000");
        if (raw.length > 0) {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_SPREADSHEET_ID, `Config_Minimos!A2:G${raw.length + 1}`, raw);
        }
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ═══════════════════════════════════════════════════════════════
// Config Escalas  (HUB_SPREADSHEET_ID → Config_Escalas!A2:G)
// Columns: tipoEscala, año, mes, añoMes, minimoPct, maximoPct, topeCabezas
// ═══════════════════════════════════════════════════════════════
router.get('/escalas', async (req, res) => {
    try {
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Escalas!A2:G");
        const data = [];
        raw.forEach((row, idx) => {
            data.push({
                id: idx,
                tipoEscala: String(row[0] || ''),
                año: Number(row[1]) || 0,
                mes: Number(row[2]) || 0,
                añoMes: String(row[3] || ''),
                minimoPct: Number(row[4]) || 0,
                maximoPct: Number(row[5]) || 0,
                topeCabezas: Number(row[6]) || 0
            });
        });
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/escalas', async (req, res) => {
    try {
        const { tipoEscala, año, mes, minimoPct, maximoPct, topeCabezas } = req.body;
        if (!tipoEscala || !año || !mes || isNaN(Number(minimoPct)) || isNaN(Number(maximoPct))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [
            String(tipoEscala),
            Number(año),
            Number(mes),
            añoMes,
            Number(minimoPct),
            Number(maximoPct),
            Number(topeCabezas) || 0
        ];
        await (0, sheets_1.appendSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Escalas!A:G", [row]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.put('/escalas/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const { tipoEscala, año, mes, minimoPct, maximoPct, topeCabezas } = req.body;
        if (!tipoEscala || !año || !mes || isNaN(Number(minimoPct)) || isNaN(Number(maximoPct))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [
            String(tipoEscala),
            Number(año),
            Number(mes),
            añoMes,
            Number(minimoPct),
            Number(maximoPct),
            Number(topeCabezas) || 0
        ];
        const sheetRow = id + 2;
        const range = `Config_Escalas!A${sheetRow}:G${sheetRow}`;
        await (0, sheets_1.writeSheet)(env_1.config.HUB_SPREADSHEET_ID, range, [row]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.delete('/escalas/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_SPREADSHEET_ID, "Config_Escalas!A2:G");
        if (id >= raw.length) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        raw.splice(id, 1);
        await (0, sheets_1.clearSheetRange)(env_1.config.HUB_SPREADSHEET_ID, "Config_Escalas!A2:G2000");
        if (raw.length > 0) {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_SPREADSHEET_ID, `Config_Escalas!A2:G${raw.length + 1}`, raw);
        }
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ═══════════════════════════════════════════════════════════════
// Config Tajada  (HUB_CIERRES_ID → 'Config_Tajada'!A2:J)
// Columns: Año, Mes, AñoMes, Oficina, Provincia, Modalidad,
//          Comercial, Sociedades_Operadas, Sociedades_Oficina, %Tajada
// ═══════════════════════════════════════════════════════════════
router.get('/tajada', async (req, res) => {
    try {
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, "'Config_Tajada'!A2:J");
        const data = [];
        raw.forEach((row, idx) => {
            data.push({
                id: idx,
                año: Number(row[0]) || 0,
                mes: Number(row[1]) || 0,
                añoMes: String(row[2] || ''),
                oficina: String(row[3] || ''),
                provincia: String(row[4] || ''),
                modalidad: String(row[5] || ''),
                comercial: String(row[6] || ''),
                sociedadesOperadas: String(row[7] || ''),
                sociedadesOficina: String(row[8] || ''),
                pctTajada: Number(row[9]) || 0
            });
        });
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/tajada', async (req, res) => {
    try {
        const { año, mes, oficina, provincia, modalidad, comercial, sociedadesOperadas, sociedadesOficina, pctTajada } = req.body;
        if (!año || !mes || !oficina || !comercial || isNaN(Number(pctTajada))) {
            return res.status(400).json({ error: 'Datos incompletos o inválidos' });
        }
        const añoMes = `${año}${String(mes).padStart(2, '0')}`;
        const row = [
            Number(año),
            Number(mes),
            añoMes,
            String(oficina),
            String(provincia || ''),
            String(modalidad || ''),
            String(comercial),
            String(sociedadesOperadas || ''),
            String(sociedadesOficina || ''),
            Number(pctTajada)
        ];
        await (0, sheets_1.appendSheet)(env_1.config.HUB_CIERRES_ID, "'Config_Tajada'!A:J", [row]);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.delete('/tajada/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id < 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const raw = await (0, sheets_1.readSheet)(env_1.config.HUB_CIERRES_ID, "'Config_Tajada'!A2:J");
        if (id >= raw.length) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        raw.splice(id, 1);
        await (0, sheets_1.clearSheetRange)(env_1.config.HUB_CIERRES_ID, "'Config_Tajada'!A2:J2000");
        if (raw.length > 0) {
            await (0, sheets_1.writeSheet)(env_1.config.HUB_CIERRES_ID, `'Config_Tajada'!A2:J${raw.length + 1}`, raw);
        }
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
