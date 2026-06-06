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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const engine_1 = require("../src/core/engine");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function rebuildPastMonths() {
    console.log("Rebuilding closures from Jan 2026 to May 2026 to include all active roster members...");
    const year = 2026;
    for (let month = 1; month <= 5; month++) {
        console.log(`Building ${year}-${month.toString().padStart(2, '0')}...`);
        const results = await (0, engine_1.calculateDynamicMonth)(year, month);
        const dir = path.join(__dirname, '../src/core/snapshots');
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `cierre_${year}_${month.toString().padStart(2, '0')}.json`);
        fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf8');
        console.log(`Saved ${results.length} commercials to ${file}`);
    }
    console.log("Finished rebuilding closures!");
}
rebuildPastMonths().catch(console.error);
