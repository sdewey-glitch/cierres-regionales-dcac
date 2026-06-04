const fs = require('fs');

let content = fs.readFileSync('src/api/routes.ts', 'utf8');

// Ensure Sys_Snapshots reading replaces local FS logic
const sysSnapshotsReadCode = `
        let snapshotRows: any[][] = [];
        try {
            await createSheetIfNotExists(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots');
            snapshotRows = await readSheet(config.TARGET_SPREADSHEET_ID, 'Sys_Snapshots!A:B');
        } catch (e) {
            console.warn('Could not read Sys_Snapshots', e);
        }
`;

// Replace in Agent History
content = content.replace(
    /const snapshotDir = path\.join\(__dirname, '\.\.\/core\/snapshots'\);\s+const snapshotFiles = fs\.existsSync\(snapshotDir\)\s*\?\s*fs\.readdirSync\(snapshotDir\)\.filter\(f => f\.startsWith\('cierre_'\) && f\.endsWith\('\.json'\)\)\s*:\s*\[\];\s+for \(const file of snapshotFiles\) \{\s+try \{\s+const parts = file\.replace\('\.json', ''\)\.split\('_'\);\s+const year = parseInt\(parts\[1\], 10\);\s+const month = parseInt\(parts\[2\], 10\);\s+const am = year \* 100 \+ month;\s+const filePath = path\.join\(snapshotDir, file\);\s+const snapshotData: any\[\] = JSON\.parse\(fs\.readFileSync\(filePath, 'utf8'\)\);/g,
    `
        ${sysSnapshotsReadCode}
        for (const row of snapshotRows) {
            if (!row[0] || !row[1] || row[0] === 'Periodo') continue;
            try {
                const parts = row[0].split('_');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const am = year * 100 + month;
                const snapshotData: any[] = JSON.parse(row[1]);
`
);

// Replace in /metricas-red
content = content.replace(
    /const snapshotCosts = new Map<string, \{ costoRed: number; agentes: number; acDetail: any\[\] \}>\(\);\s+if \(fs\.existsSync\(snapshotDir\)\) \{\s+const files = fs\.readdirSync\(snapshotDir\)\.filter\(f => f\.startsWith\('cierre_'\) && f\.endsWith\('\.json'\)\);\s+for \(const file of files\) \{\s+const match = file\.match\(\/cierre_\(\\d\{4\}\)_\(\\d\{2\}\)\\\.json\/\);\s+if \(!match\) continue;\s+const key = \`\$\{match\[1\]\}_\$\{match\[2\]\}\`;\s+const periodo = \`\$\{match\[1\]\}\$\{match\[2\]\}\`; \/\/ e\.g\. "202605"\s+const raw = JSON\.parse\(fs\.readFileSync\(path\.join\(snapshotDir, file\), 'utf8'\)\);/g,
    `
        const snapshotCosts = new Map<string, { costoRed: number; agentes: number; acDetail: any[] }>();
        ${sysSnapshotsReadCode}
        for (const row of snapshotRows) {
            if (!row[0] || !row[1] || row[0] === 'Periodo') continue;
            const match = row[0].match(/(\\d{4})_(\\d{2})/);
            if (!match) continue;
            const key = \`\${match[1]}_\${match[2]}\`;
            const periodo = \`\${match[1]}\${match[2]}\`;
            const raw = JSON.parse(row[1]);
`
);

// Replace in /minimos-red
// We have to change `router.get('/minimos-red', (req, res) => {` to `router.get('/minimos-red', async (req, res) => {`
content = content.replace(
    /router\.get\('\/minimos-red', \(req, res\) => \{/g,
    "router.get('/minimos-red', async (req, res) => {"
);

content = content.replace(
    /if \(!fs\.existsSync\(SNAPSHOTS_DIR\)\) \{\s+return res\.json\(\{ months: \[\] \}\);\s+\}\s+const MONTHS_ES = \[.*?\];\s+const files = fs\.readdirSync\(SNAPSHOTS_DIR\)\.filter\(f => f\.startsWith\('cierre_'\) && f\.endsWith\('\.json'\)\);\s+const months: any\[\] = \[\];\s+for \(const file of files\) \{\s+try \{\s+const parts = file\.replace\('\.json', ''\)\.split\('_'\);\s+const year = parseInt\(parts\[1\], 10\);\s+const month = parseInt\(parts\[2\], 10\);\s+const filePath = path\.join\(SNAPSHOTS_DIR, file\);\s+const agents: any\[\] = JSON\.parse\(fs\.readFileSync\(filePath, 'utf8'\)\);/g,
    `
        const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const months: any[] = [];
        ${sysSnapshotsReadCode}
        for (const row of snapshotRows) {
            if (!row[0] || !row[1] || row[0] === 'Periodo') continue;
            try {
                const parts = row[0].split('_');
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const agents: any[] = JSON.parse(row[1]);
`
);

// Also remove `const snapshotDir = path.join(__dirname, '../core/snapshots');` from inside /metricas-red to avoid unused warnings
content = content.replace(/const snapshotDir = path\.join\(__dirname, '\.\.\/core\/snapshots'\);\s+const MONTHS_ES/g, "const MONTHS_ES");

fs.writeFileSync('src/api/routes.ts', content, 'utf8');
console.log('Done!');
