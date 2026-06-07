import express from 'express';
import { createSheetIfNotExists } from './src/api/sheets';
import { config } from './src/config/env';

const app = express();
import apiRoutes from './src/api/routes';
import dispatchRouter from './src/api/dispatch';
import configRouter from './src/routes/config';
import configModelsRouter from './src/routes/config_models';

app.use('/api', dispatchRouter);
app.use('/api', apiRoutes);
app.use('/api/config', configRouter);
app.use('/api/config-models', configModelsRouter);

app.listen(4005, async () => {
    console.log("Listening 4005");
    try {
        await createSheetIfNotExists(config.HUB_CIERRES_ID, 'Bajada_Estatica');
        console.log(`[init] ✅ Hojas de cierres verificadas`);
    } catch (e: any) {
        console.warn(`[init] ⚠️ No se pudieron crear hojas: ${e.message}`);
    }
});
