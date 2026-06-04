import re

with open('src/core/models.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace(
    "import { getExactScale } from './calculator';",
    "import { getExactScale } from './calculator';\nimport { readSheet, writeSheet, appendSheet, createSheetIfNotExists } from '../api/sheets';\nimport { config } from '../config/env';"
)

# Remove fs/path imports and constants
content = re.sub(r"import \* as fs from 'fs';\nimport \* as path from 'path';\n", "", content)
content = re.sub(r"const SCALES_PATH = path\.resolve\(__dirname, 'data/custom_scales\.json'\);\nconst MODELS_PATH = path\.resolve\(__dirname, 'data/custom_models\.json'\);\n", "", content)

# Rewrite loadCustomScales
load_custom_scales_new = """// Cargar escalas custom
export async function loadCustomScales(): Promise<Record<string, CustomScale>> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const row = rows.find((r: any) => r[0] === 'scales');
        if (row && row[1]) {
            return JSON.parse(row[1]);
        }
    } catch (e) {
        console.error('Error cargando scales de Google Sheets', e);
    }
    return {};
}"""
content = re.sub(r"// Cargar escalas custom.*?return \{\};\n\}", load_custom_scales_new, content, flags=re.DOTALL)

# Rewrite saveCustomScales
save_custom_scales_new = """// Guardar escalas custom
export async function saveCustomScales(scales: Record<string, CustomScale>) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const rowIndex = rows.findIndex((r: any) => r[0] === 'scales');
        if (rowIndex >= 0) {
            const range = `Sys_Config!A${rowIndex + 1}:B${rowIndex + 1}`;
            await writeSheet(config.TARGET_SPREADSHEET_ID, range, [['scales', JSON.stringify(scales)]]);
        } else {
            await appendSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B', [['scales', JSON.stringify(scales)]]);
        }
    } catch (e) {
        console.error('Error guardando scales en Google Sheets', e);
    }
}"""
content = re.sub(r"// Guardar escalas custom.*?\}\n", save_custom_scales_new + '\n', content, flags=re.DOTALL)


# Rewrite loadCustomModels
load_custom_models_new = """// Cargar modelos custom
export async function loadCustomModels(): Promise<Record<string, CommissionModel>> {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const row = rows.find((r: any) => r[0] === 'models');
        if (row && row[1]) {
            return JSON.parse(row[1]);
        }
    } catch (e) {
        console.error('Error cargando models de Google Sheets', e);
    }
    return {};
}"""
content = re.sub(r"// Cargar modelos custom.*?return \{\};\n\}", load_custom_models_new, content, flags=re.DOTALL)

# Rewrite saveCustomModels
save_custom_models_new = """// Guardar modelos custom
export async function saveCustomModels(models: Record<string, CommissionModel>) {
    try {
        await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Config');
        const rows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B');
        const rowIndex = rows.findIndex((r: any) => r[0] === 'models');
        if (rowIndex >= 0) {
            const range = `Sys_Config!A${rowIndex + 1}:B${rowIndex + 1}`;
            await writeSheet(config.TARGET_SPREADSHEET_ID, range, [['models', JSON.stringify(models)]]);
        } else {
            await appendSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Config!A:B', [['models', JSON.stringify(models)]]);
        }
    } catch (e) {
        console.error('Error guardando models en Google Sheets', e);
    }
}"""
content = re.sub(r"// Guardar modelos custom.*?\}\n", save_custom_models_new + '\n', content, flags=re.DOTALL)

content = content.replace("export function getModelByModalidad(modalidad: string): CommissionModel {", "export async function getModelByModalidad(modalidad: string): Promise<CommissionModel> {")
content = content.replace("const customModels = loadCustomModels();", "const customModels = await loadCustomModels();")

content = content.replace("const customScales = loadCustomScales();", "const customScales = await loadCustomScales();")

content = content.replace("export function getAllModels(): { id: string; nombre: string; tieneMinimo: boolean; descripcion: string; isCustom: boolean }[] {", "export async function getAllModels(): Promise<{ id: string; nombre: string; tieneMinimo: boolean; descripcion: string; isCustom: boolean }[]> {")
content = content.replace("const custom = loadCustomModels();", "const custom = await loadCustomModels();")


with open('src/core/models.ts', 'w', encoding='utf-8') as f:
    f.write(content)
