const origExit = process.exit; process.exit = function(code?: number) { console.trace('PROCESS EXIT CALLED WITH CODE', code); return origExit(code); } as any;

// ── Prevent silent crashes from unhandled promise rejections ──
process.on('uncaughtException', (err) => {
    console.error('[CRASH] uncaughtException — el servidor NO se reinicia solo:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[CRASH] unhandledRejection — promesa rechazada sin catch:', reason);
});

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';


const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/docs', express.static(path.join(__dirname, '../docs')));

const SNAPSHOTS_DIR = path.join(__dirname, 'core/snapshots');


import apiRoutes from './api/routes';
import dispatchRouter from './api/dispatch';
import configRouter from './routes/config';
import configModelsRouter from './routes/config_models';
import bajadaRouter from './api/bajada';
import { createSheetIfNotExists } from './api/sheets';
import { config } from './config/env';

app.use(express.json({ limit: '50mb' }));
app.use('/api', bajadaRouter);
app.use('/api', dispatchRouter);
app.use('/api', apiRoutes);
app.use('/api/config', configRouter);
app.use('/api/config-models', configModelsRouter);

const PORT = 4001;
app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`Dashboard Regionales corriendo localmente`);
    console.log(`Abrir en el navegador: http://localhost:${PORT}`);
    console.log(`=========================================`);
    
    // Crear hojas necesarias en el sheet de Cierres
    try {
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Bajada_Estatica');
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Ajustes_Retro');
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Detalle_Retro');
        console.log(`[init] ✅ Hojas de cierres verificadas`);
    } catch (e: any) {
        console.warn(`[init] ⚠️ No se pudieron crear hojas: ${e.message}`);
    }
});
