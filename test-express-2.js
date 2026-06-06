"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sheets_1 = require("./src/api/sheets");
const env_1 = require("./src/config/env");
const app = (0, express_1.default)();
const routes_1 = __importDefault(require("./src/api/routes"));
const dispatch_1 = __importDefault(require("./src/api/dispatch"));
const config_1 = __importDefault(require("./src/routes/config"));
const config_models_1 = __importDefault(require("./src/routes/config_models"));
app.use('/api', dispatch_1.default);
app.use('/api', routes_1.default);
app.use('/api/config', config_1.default);
app.use('/api/config-models', config_models_1.default);
app.listen(4005, async () => {
    console.log("Listening 4005");
    try {
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Bajada_Estatica');
        console.log(`[init] ✅ Hojas de cierres verificadas`);
    }
    catch (e) {
        console.warn(`[init] ⚠️ No se pudieron crear hojas: ${e.message}`);
    }
});
