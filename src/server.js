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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const origExit = process.exit;
process.exit = function (code) { console.trace('PROCESS EXIT CALLED WITH CODE', code); return origExit(code); };
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.static(path.join(__dirname, '../public')));
app.use('/docs', express_1.default.static(path.join(__dirname, '../docs')));
const SNAPSHOTS_DIR = path.join(__dirname, 'core/snapshots');
const routes_1 = __importDefault(require("./api/routes"));
const dispatch_1 = __importDefault(require("./api/dispatch"));
const config_1 = __importDefault(require("./routes/config"));
const config_models_1 = __importDefault(require("./routes/config_models"));
const sheets_1 = require("./api/sheets");
const env_1 = require("./config/env");
app.use(express_1.default.json({ limit: '50mb' }));
app.use('/api', dispatch_1.default);
app.use('/api', routes_1.default);
app.use('/api/config', config_1.default);
app.use('/api/config-models', config_models_1.default);
const PORT = 4001;
app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`Dashboard Regionales corriendo localmente`);
    console.log(`Abrir en el navegador: http://localhost:${PORT}`);
    console.log(`=========================================`);
    // Crear hojas necesarias en el sheet de Cierres
    try {
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Bajada_Estatica');
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Ajustes_Retro');
        await (0, sheets_1.createSheetIfNotExists)(env_1.config.HUB_CIERRES_ID, 'Detalle_Retro');
        console.log(`[init] ✅ Hojas de cierres verificadas`);
    }
    catch (e) {
        console.warn(`[init] ⚠️ No se pudieron crear hojas: ${e.message}`);
    }
});
