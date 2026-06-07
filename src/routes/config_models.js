"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../core/models");
const regression_1 = require("../core/regression");
const snapshot_1 = require("../core/snapshot");
const configModelsRouter = (0, express_1.Router)();
// 1. Obtener toda la configuración de modelos y escalas
configModelsRouter.get('/models', async (req, res) => {
    try {
        const models = await (0, models_1.getAllModels)();
        const customScales = await (0, models_1.loadCustomScales)();
        // Retornar las escalas estándar disponibles para selección en UI
        const standardScales = [
            { id: 'escalaAC', nombre: 'Escala AC (Estándar)' },
            { id: 'escalaPersonal', nombre: 'Escala Personal (Estándar)' },
            { id: 'escalaProvincial', nombre: 'Escala Provincial (Regional)' },
            { id: 'escalaOficina', nombre: 'Escala Oficina (Estándar)' }
        ];
        res.json({
            success: true,
            models,
            customModels: await (0, models_1.loadCustomModels)(),
            customScales,
            standardScales
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 2. Guardar o actualizar una escala custom
configModelsRouter.post('/scales', async (req, res) => {
    try {
        const { id, nombre, tramos } = req.body;
        if (!id || !nombre || !Array.isArray(tramos)) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id, nombre, tramos).' });
        }
        const scales = await (0, models_1.loadCustomScales)();
        scales[id] = {
            nombre,
            tramos: tramos.map((t) => ({
                cabezas: Number(t.cabezas),
                porcentaje: Number(t.porcentaje)
            })).sort((a, b) => a.cabezas - b.cabezas) // Ordenar ascendente por cabezas
        };
        await (0, models_1.saveCustomScales)(scales);
        res.json({ success: true, scales });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 3. Eliminar una escala custom
configModelsRouter.delete('/scales/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        const scales = await (0, models_1.loadCustomScales)();
        if (!scales[id]) {
            return res.status(404).json({ success: false, error: 'La escala no existe.' });
        }
        delete scales[id];
        await (0, models_1.saveCustomScales)(scales);
        res.json({ success: true, scales });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 4. Guardar o actualizar un modelo custom
configModelsRouter.post('/models', async (req, res) => {
    try {
        const id = String(req.body.id);
        const { nombre, tieneMinimo, descripcion, componenteP, componenteR, componenteO } = req.body;
        if (!id || !nombre || !componenteP) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id, nombre, componenteP).' });
        }
        const models = await (0, models_1.loadCustomModels)();
        models[id] = {
            id,
            nombre,
            tieneMinimo: !!tieneMinimo,
            descripcion: descripcion || '',
            componenteP: {
                activa: !!componenteP.activa,
                umbralCabezas: Number(componenteP.umbralCabezas || 0),
                escalaId: componenteP.escalaId || 'escalaAC',
                base: componenteP.base || 'resultado_propio'
            },
            componenteR: {
                activa: !!componenteR?.activa,
                pesoR: Number(componenteR?.pesoR ?? 0),
                base: componenteR?.base || 'resultado_regional'
            },
            componenteO: {
                activa: !!componenteO?.activa,
                pesoO: Number(componenteO?.pesoO ?? 0),
                base: componenteO?.base || 'resultado_oficina'
            }
        };
        await (0, models_1.saveCustomModels)(models);
        res.json({ success: true, models });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 5. Eliminar un modelo custom
configModelsRouter.delete('/models/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        const models = await (0, models_1.loadCustomModels)();
        if (!models[id]) {
            return res.status(404).json({ success: false, error: 'El modelo no existe.' });
        }
        delete models[id];
        await (0, models_1.saveCustomModels)(models);
        res.json({ success: true, models });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// 6. Calibrar por regresión lineal OLS sobre datos históricos
configModelsRouter.post('/regression/calibrate', async (req, res) => {
    try {
        const { year, month, targetField } = req.body; // targetField: 'sueldoBruto' | 'sueldoNeto'
        if (!year || !month) {
            return res.status(400).json({ success: false, error: 'Se requiere especificar año (year) y mes (month).' });
        }
        const field = targetField || 'sueldoBruto';
        const snapshotData = await (0, snapshot_1.loadMonthSnapshot)(Number(year), Number(month));
        if (!snapshotData) {
            return res.status(404).json({
                success: false,
                error: `No hay snapshot de liquidación disponible para el periodo ${month}/${year}. Para calibrar, primero debés generar el cierre de ese periodo.`
            });
        }
        // Mapear agentes de snapshot para regresión
        const regressionData = [];
        for (const agent of snapshotData) {
            // Filtrar pseudo-agentes, comisionistas inactivos o registros sin sueldo
            if (agent.isPseudo || agent.asociadoComercial?.toLowerCase().includes('oficina') || !agent.sueldoBruto) {
                continue;
            }
            // Explicativas: P, R, O calculated by current engine
            // Explicada: El sueldo final bruto/neto pagado real en el snapshot
            regressionData.push({
                p: Number(agent.componenteP || 0),
                r: Number(agent.componenteR || 0),
                o: Number(agent.componenteO || 0),
                target: Number(agent[field] || 0)
            });
        }
        if (regressionData.length < 4) {
            return res.status(400).json({
                success: false,
                error: `No hay suficientes agentes válidos (${regressionData.length}) en el periodo para calibrar el modelo (se requieren al menos 4).`
            });
        }
        const result = (0, regression_1.runRegression)(regressionData);
        res.json({
            success: true,
            periodo: `${month}/${year}`,
            cantidadAgentes: regressionData.length,
            targetField: field,
            result
        });
    }
    catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
exports.default = configModelsRouter;
