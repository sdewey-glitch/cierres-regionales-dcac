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
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
exports.config = {
    METABASE_URL: process.env.METABASE_URL || '',
    METABASE_USERNAME: process.env.METABASE_USERNAME || '',
    METABASE_PASSWORD: process.env.METABASE_PASSWORD || '',
    GOOGLE_KEY: (process.env.Google_key || process.env.GOOGLE_KEY || '').replace(/\\n/g, '\n'),
    GOOGLE_MAIL: process.env.Google_mail || process.env.GOOGLE_MAIL || '',
    TARGET_SPREADSHEET_ID: process.env.TARGET_SPREADSHEET_ID || '',
    SOURCE_SPREADSHEET_ID: process.env.SOURCE_SPREADSHEET_ID || '',
    HUB_SPREADSHEET_ID: process.env.HUB_SPREADSHEET_ID || '',
    HUB_CONFIGURACIONES_ID: process.env.HUB_CONFIGURACIONES_ID || '',
    HUB_GASTOS_ID: process.env.HUB_GASTOS_ID || '',
    HUB_CIERRES_ID: process.env.HUB_CIERRES_ID || '',
    HUB_TABLERO_ID: process.env.HUB_TABLERO_ID || '',
    HUB_HISTORIAL_ID: process.env.HUB_HISTORIAL_ID || '',
    MASTER_ROSTER_ID: process.env.MASTER_ROSTER_ID || '',
    MENDEL_SPREADSHEET_ID: process.env.MENDEL_SPREADSHEET_ID || '',
    CIERRES_ROOT_FOLDER_ID: process.env.CIERRES_ROOT_FOLDER_ID || '',
    KMS_VIAJES_ID: process.env.KMS_VIAJES_ID || '',
    KMS_STOCK_ID: process.env.KMS_STOCK_ID || '',
};
const OPTIONAL_KEYS = ['KMS_VIAJES_ID', 'KMS_STOCK_ID'];
const missing = Object.entries(exports.config).filter(([k, v]) => !v && !OPTIONAL_KEYS.includes(k)).map(([k]) => k);
if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
}
