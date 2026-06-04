const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'src/server.ts');
let serverCode = fs.readFileSync(serverFile, 'utf8');

// The logic starts right after "const SNAPSHOTS_DIR = ...;"
const splitStart = serverCode.indexOf('// API para listar meses disponibles');
const splitEnd = serverCode.indexOf("app.use('/api/config', configRouter);");

if (splitStart === -1 || splitEnd === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

// Extract routes block
let routesBlock = serverCode.substring(splitStart, splitEnd);

// Separate the routes block from the middlewares and routers defined inside it
const toKeepInServer = [
    "import dispatchRouter from './api/dispatch';",
    "import configRouter from './routes/config';",
    "import configModelsRouter from './routes/config_models';",
    "app.use(express.json({ limit: '50mb' }));",
    "app.use('/api', dispatchRouter);"
];

// Clean routes block from what we keep in server
toKeepInServer.forEach(keep => {
    routesBlock = routesBlock.replace(keep, '');
});

// Update app. to router.
routesBlock = routesBlock.replace(/app\.get\(/g, 'router.get(')
                         .replace(/app\.post\(/g, 'router.post(')
                         .replace(/app\.put\(/g, 'router.put(')
                         .replace(/app\.delete\(/g, 'router.delete(');

// Remove the /api prefix because we'll mount the router at /api
routesBlock = routesBlock.replace(/router\.get\('\/api\//g, "router.get('/")
                         .replace(/router\.post\('\/api\//g, "router.post('/")
                         .replace(/router\.put\('\/api\//g, "router.put('/")
                         .replace(/router\.delete\('\/api\//g, "router.delete('/");

// Update relative paths
routesBlock = routesBlock.replace(/'\.\/core\//g, "'../core/")
                         .replace(/'\.\/config\//g, "'../config/")
                         .replace(/'\.\/api\//g, "'./")
                         .replace(/__dirname, 'core\//g, "__dirname, '../core/");

// Build routes.ts content
const routesContent = `import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

const router = express.Router();

const SNAPSHOTS_DIR = path.join(__dirname, '../core/snapshots');

` + routesBlock + `
export default router;
`;

fs.writeFileSync(path.join(__dirname, 'src/api/routes.ts'), routesContent, 'utf8');

// Now build the new server.ts
const newServerContent = serverCode.substring(0, splitStart) + `
import apiRoutes from './api/routes';
import dispatchRouter from './api/dispatch';
import configRouter from './routes/config';
import configModelsRouter from './routes/config_models';
import { createSheetIfNotExists } from './api/sheets';
import { config } from './config/env';

app.use(express.json({ limit: '50mb' }));
app.use('/api', dispatchRouter);
app.use('/api', apiRoutes);
` + serverCode.substring(splitEnd);

fs.writeFileSync(serverFile, newServerContent, 'utf8');
console.log("Refactoring complete");
