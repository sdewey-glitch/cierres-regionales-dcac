# 🧰 SKILLS.md — Recetas y Patrones del Proyecto

> **Propósito**: Guía rápida de "cómo se hace X" en este proyecto. Cada sección es un skill autocontenido que se puede copiar/pegar o referenciar.

---

## 1. Conectar con Metabase (Server-Side)

### Autenticación por sesión
Metabase usa tokens de sesión (no API keys). Se obtienen con POST a `/api/session`:

```typescript
// lib/api/q95.ts / app/api/regional/route.ts
const res = await fetch(`${METABASE_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: METABASE_USERNAME, password: METABASE_PASSWORD }),
});
const { id: token } = await res.json();
// Usar: headers: { 'X-Metabase-Session': token }
```

**Duración**: Cacheamos el token 110 minutos (`SESSION_TTL_MS`). Si expira, se renueva automáticamente.

### Consultar una Card (MariaDB — MB1)
```typescript
// Ejemplo: Card 155 (Lotes)
const res = await fetch(`${METABASE_URL}/api/card/155/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
    body: JSON.stringify({
        constraints: { 'max-results': 1_000_000 },
        // Opcional: pasar parámetro template-tag
        parameters: [{
            type: 'category',
            target: ['variable', ['template-tag', 'id_usuario']],
            value: '20128'
        }],
    }),
});
const raw = await res.json();
const data = formatMetabaseData(raw.data); // → array de objetos
```

### Ejecutar SQL directo en ClickHouse (MB2)
```typescript
// lib/api/q95.ts — cuando la Card usa formato `stages` y no expone template-tags
const res = await fetch(`${METABASE2_URL}/api/dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
    body: JSON.stringify({
        database: 2, // ID de ClickHouse en Metabase
        type: 'native',
        native: { query: sqlResuelto },
    }),
});
```

---

## 2. Convertir respuesta de Metabase a objetos

Metabase devuelve `{ cols: [...], rows: [[...], [...]] }`. Para convertirlo:

```typescript
// lib/api/metabase-server.ts
export function formatMetabaseData(sourceObj: any): any[] | null {
    const rows = sourceObj?.rows;
    const cols = sourceObj?.cols || sourceObj?.columns;
    if (rows && Array.isArray(rows) && cols && Array.isArray(cols)) {
        const colNames = cols.map((c: any) => c.name || c);
        return rows.map((row: any[]) => {
            const obj: any = {};
            row.forEach((v, i) => { obj[colNames[i]] = v; });
            return obj;
        });
    }
    return null;
}
```

---

## 3. Agregar un nuevo endpoint API

Patrón estándar en `app/api/`:

```typescript
// app/api/mi-endpoint/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const param = searchParams.get('param');

        // Lógica de negocio...
        const data = await fetchAlgo(param);

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[MiEndpoint]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
```

---

## 4. Filtrar datos por Asociado Comercial

El filtrado por AC es la pieza más delicada del sistema. El patrón es:

```typescript
// 1. Obtener los IDs vinculados del AC
import { LINKED_AC_IDS } from '@/lib/data/usuarios';
const linkedIds = LINKED_AC_IDS[acIdNum] || [acIdNum];

// 2. Filtrar operaciones por cualquiera de los 4 campos de ID
const misOps = operaciones.filter(r =>
    linkedIds.includes(Number(r.id_ac_vend))  ||
    linkedIds.includes(Number(r.id_ac_comp))  ||
    linkedIds.includes(Number(r.id_rep_vend)) ||
    linkedIds.includes(Number(r.id_rep_comp))
);

// 3. Calcular el resultado proporcional para el AC
const res = Number(r.resultado_final) || 0;
const hasVend = !!(r.AC_Vend?.trim() || r.repre_vendedor?.trim());
const hasComp = !!(r.AC_Comp?.trim() || r.repre_comprador?.trim());
const factorVend = hasVend ? (hasComp ? 2/3 : 1) : 0;
const factorComp = hasComp ? (hasVend ? 1/3 : 1) : 0;
```

---

## 5. Trabajar con Snapshots (datos históricos)

Los snapshots evitan que Q95 tenga que traer años de historial en cada request:

```typescript
import { readSnapshot, writeSnapshot, buildAgregaciones, getCutoffDate } from '@/lib/utils/snapshot';

// Leer (tiene caché en memoria de 1h + Vercel Blob en producción)
const snap = await readSnapshot();
if (snap) {
    const rowsDesdeSnapshot = snap.rows.filter(r => r.fecha_operacion >= '2025-01-01');
    // Merge con datos recientes de Q95...
}

// Escribir (se usa desde /api/cron/snapshot)
const nuevoSnap = {
    generado_at: new Date().toISOString(),
    cutoff_date: getCutoffDate(), // hoy - 90 días
    rows: rowsHistoricos,
    ...buildAgregaciones(rowsHistoricos),
};
await writeSnapshot(nuevoSnap);
```

---

## 6. Gestión de usuarios y permisos

### Verificar si un usuario es admin
```typescript
import { isAdmin, ADMIN_EMAILS } from '@/lib/data/constants';

if (isAdmin(session.user.email)) {
    // Ve todos los datos, sin filtro por AC
}
```

### Obtener perfil de un AC por email
```typescript
import { getAcByEmail } from '@/lib/data/constants';
const ac = getAcByEmail('vtorriglia@decampoacampo.com');
// → { nombre: 'Valentin Torriglia', id: 56283, iniciales: 'VT', ... }
```

### Buscar usuario canónico por nombre
```typescript
import { findUsuarioCanon } from '@/lib/data/usuarios';
const user = findUsuarioCanon('Valentin Torriglia');
// → { perfil: 1, usuarioId: 56283, correo: '...', canal: 'Regional' }
```

---

## 7. Colores y estilos del dominio

### Color por Unidad de Negocio
```typescript
import { getUNColor } from '@/lib/utils/unColors';
const color = getUNColor('Faena');    // → 'bg-blue-500'
const color = getUNColor('Invernada'); // → 'bg-red-500'
```

### Color por AC
Los colores se asignan dinámicamente desde la PALETTE en `constants.ts`. Cada `AcDef` tiene:
- `colorGrad`: Para fondos con gradiente (`bg-gradient-to-br from-blue-500 to-blue-700`).
- `colorSolid`: Para fondos sólidos (`bg-blue-600`).
- `colorBar`: Para barras de progreso.
- `colorBadge`: Para badges/pills.
- `colorAvatar`: Para avatares.

---

## 8. Patrón de componente con fetch

```tsx
'use client';
import { useState, useEffect } from 'react';

export default function MiComponente({ acId }: { acId?: string }) {
    const [data, setData] = useState<MiTipo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        (async () => {
            try {
                const res = await fetch(`/api/mi-endpoint?acId=${acId}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json);
                setError(null);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    const message = err instanceof Error ? err.message : 'Error desconocido';
                    setError(message);
                    console.error('[MiComponente]', err);
                }
            } finally {
                setIsLoading(false);
                clearTimeout(timeout);
            }
        })();

        return () => { controller.abort(); clearTimeout(timeout); };
    }, [acId]);

    if (isLoading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
    if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm">
            {/* Render data */}
        </div>
    );
}
```

---

## 9. Actualizar una Card de Metabase por API

Script de utilidad para pushear SQL a una Card existente:

```javascript
// scripts/push_card.js (ejecutar con: node scripts/push_card.js)
const METABASE_URL = 'https://tu-metabase.com';
const CARD_ID = 95;

async function getSession() {
    const res = await fetch(`${METABASE_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'user', password: 'pass' }),
    });
    return (await res.json()).id;
}

async function pushSQL(token, sql) {
    const card = await fetch(`${METABASE_URL}/api/card/${CARD_ID}`, {
        headers: { 'X-Metabase-Session': token },
    }).then(r => r.json());

    card.dataset_query.native.query = sql;

    const res = await fetch(`${METABASE_URL}/api/card/${CARD_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
        body: JSON.stringify({ dataset_query: card.dataset_query }),
    });
    console.log('Resultado:', res.status);
}
```

---

## 10. Google Sheets — Leer/Escribir datos

La conexión a Google Sheets usa una Service Account:

```typescript
import { google } from 'googleapis';

function getSheets() {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
    const auth = new google.auth.GoogleAuth({
        credentials: creds,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

// Leer
const sheets = getSheets();
const res = await sheets.spreadsheets.values.get({
    spreadsheetId: 'TU_SPREADSHEET_ID',
    range: 'Hoja1!A:Z',
});
const rows = res.data.values; // string[][]

// Escribir
await sheets.spreadsheets.values.append({
    spreadsheetId: 'TU_SPREADSHEET_ID',
    range: 'Hoja1!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['col1', 'col2', 'col3']] },
});
```

---

## 11. Deploy y Variables de Entorno

### Variables requeridas
```env
# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-dominio.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Metabase 1 (MariaDB)
METABASE_URL=https://metabase1.ejemplo.com
METABASE_USERNAME=...
METABASE_PASSWORD=...

# Metabase 2 (ClickHouse)
METABASE2_URL=https://metabase2.ejemplo.com
METABASE2_USERNAME=...
METABASE2_PASSWORD=...

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Vercel Blob (snapshots)
BLOB_READ_WRITE_TOKEN=...
```

### Comandos frecuentes
```bash
npm run dev          # Servidor local (hot reload)
npm run build        # Build de producción (verificar errores)
git push origin main # Deploy automático en Vercel
```

---

## 12. Conectar MCP Servers (para agentes de IA)

MCP (Model Context Protocol) permite que agentes de IA (Claude, Cursor, Copilot) se conecten directamente a las fuentes de datos del proyecto sin pasar por el código de la app.

### A. Metabase MCP (Nativo — recomendado)
Metabase tiene un servidor MCP integrado. Permite listar cards, dashboards, ejecutar queries y explorar esquemas.

**Claude Code:**
```bash
/mcp add metabase https://metabase.dcac.ar/api/mcp --transport streamable-http
```

**Cursor / Claude Desktop** (agregar a `mcp.json` o `claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "metabase": {
      "url": "https://metabase.dcac.ar/api/mcp",
      "transport": "streamable-http"
    }
  }
}
```

**Tools disponibles una vez conectado:**
- `list_dashboards` / `list_cards` / `list_collections` — explorar contenido.
- `execute_card` — correr una Card existente (ej: Card 95, Card 155).
- `run_query` — ejecutar SQL ad-hoc contra MariaDB o ClickHouse.
- `get_database_schema` — inspeccionar tablas y columnas.

### B. ClickHouse MCP (Directo)
Para acceso analítico directo sin pasar por Metabase:

```json
{
  "mcpServers": {
    "clickhouse": {
      "command": "npx",
      "args": ["-y", "@clickhouse/mcp-server"],
      "env": {
        "CLICKHOUSE_HOST": "URL_DEL_HOST_CLICKHOUSE",
        "CLICKHOUSE_USER": "usuario",
        "CLICKHOUSE_PASSWORD": "contraseña"
      }
    }
  }
}
```

> ⚠️ Las credenciales de ClickHouse las administra Metabase internamente (Datasource ID 2). Pedir host/usuario al admin de infra si se necesita conexión directa.

**Tools disponibles:**
- `query` — ejecutar SELECT contra ClickHouse.
- `list_databases` / `list_tables` — explorar esquemas.
- `describe_table` — ver columnas y tipos.

### C. Google Sheets MCP
Para leer/escribir las planillas del sistema:

```json
{
  "mcpServers": {
    "google_sheets": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-google-sheets"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "C:/ruta/a/service-account.json"
      }
    }
  }
}
```

**Service Account:** `mi-tablero-ganadero@focused-premise-435119-c0.iam.gserviceaccount.com`
(la key privada está en `.env.local`, campo `Google_key`).

**Tools disponibles:**
- `read_spreadsheet` — leer rangos de celdas.
- `write_spreadsheet` — escribir datos.
- `list_sheets` — ver las hojas de un spreadsheet.

**Planillas clave del proyecto:**

| Planilla | Spreadsheet ID | Hoja / GID |
|----------|---------------|------------|
| Usuarios del sistema | `1FpgyFCw2hibi3w_jArtohKUxPhvfUpnF9SDDI3YI-aI` | Usuarios / GID 1192272172 |

---

## 13. API REST de Metabase — Referencia Rápida

Para operaciones programáticas (scripts, patches, migraciones) sin MCP:

### Autenticación
```javascript
// Opción 1: Sesión (dura ~2 horas)
const token = await fetch('https://metabase.dcac.ar/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user@dcac.com', password: '...' }),
}).then(r => r.json()).then(d => d.id);
// → Header: { 'X-Metabase-Session': token }

// Opción 2: API Key (permanente, más simple)
// → Header: { 'X-Api-Key': process.env.METABASE_API_KEY }
```

### Endpoints más usados

| Acción | Método | Endpoint | Body |
|--------|--------|----------|------|
| **Listar databases** | `GET` | `/api/database` | — |
| **Esquema de una DB** | `GET` | `/api/database/{id}/metadata` | — |
| **Leer definición de card** | `GET` | `/api/card/{id}` | — |
| **Ejecutar card** | `POST` | `/api/card/{id}/query` | `{ parameters: [...] }` |
| **SQL ad-hoc** | `POST` | `/api/dataset` | `{ database: 2, type: 'native', native: { query: '...' } }` |
| **Actualizar SQL de card** | `PUT` | `/api/card/{id}` | `{ dataset_query: {...} }` |
| **Listar colecciones** | `GET` | `/api/collection` | — |
| **Listar dashboards** | `GET` | `/api/dashboard` | — |

### IDs importantes en Metabase

| Recurso | ID | Descripción |
|---------|-----|-------------|
| Database MariaDB | `1` | Base operativa (lotes, ofertas, CIs) |
| Database ClickHouse | `2` | Base analítica (operaciones consolidadas) |
| Card Q95 (PROD) | `95` | Operaciones consolidadas — **PRODUCCIÓN** (no modificar sin aprobar en testing) |
| Card Q95 (TEST) | `249` | Copia de testing de la Q95 — **los cambios van acá primero** |
| Card 155 | `155` | Publicaciones / Lotes activos |
| Card 128 | `128` | Ofertas de Invernada |
| Card 145 | `145` | Métricas comerciales |
| Card 85 | `85` | Hub Monitor Operadores (referencia para campo Operador) |

### ⚠️ Regla de Testing para Queries de Metabase

**REGLA OBLIGATORIA**: Los cambios a queries críticas (Q95, etc.) NUNCA se aplican directamente a la card de producción.

1. **Card 249** = Testing/Staging → Aplicar el cambio aquí primero.
2. **Verificar** que la query ejecuta correctamente y los datos son coherentes.
3. **Pedir aprobación** del usuario antes de promover a producción.
4. **Card 95** = Producción → Solo se actualiza **después** de aprobar en Card 249.
5. **Ambas cards deben quedar idénticas** al finalizar el ciclo de cambios.

```
Flujo de cambios:
  Desarrollo → Card 249 (Test) → Validación → Card 95 (Prod)
                                    ↑
                              Requiere OK del usuario
```

### Ejemplo completo: Leer y actualizar el SQL de la Q95 (Testing)
```javascript
const MB_URL = 'https://metabase.dcac.ar';
const TESTING_CARD = 249; // ← SIEMPRE pushear a testing primero
const PROD_CARD = 95;     // ← Solo después de aprobar

// 1. Obtener sesión
const token = await fetch(`${MB_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '...', password: '...' }),
}).then(r => r.json()).then(d => d.id);

// 2. Leer la card actual
const card = await fetch(`${MB_URL}/api/card/${TESTING_CARD}`, {
    headers: { 'X-Metabase-Session': token },
}).then(r => r.json());

// 3. Extraer el SQL actual
const currentSQL = card.dataset_query?.stages?.[0]?.native
                || card.dataset_query?.native?.query;
console.log('SQL actual:', currentSQL.substring(0, 200));

// 4. Pushear SQL modificado a TESTING
card.dataset_query.native.query = nuevoSQL;
const res = await fetch(`${MB_URL}/api/card/${TESTING_CARD}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
    body: JSON.stringify({ dataset_query: card.dataset_query }),
});
console.log('Update testing:', res.status);

// 5. Después de aprobar → copiar a PROD
// const resProd = await fetch(`${MB_URL}/api/card/${PROD_CARD}`, { ... });
```

---

## 14. Campo Operador en las Queries

El **Operador** de un negocio (la persona que gestiona la operación) viene de campos diferentes según la unidad de negocio:

| Unidad | Tabla | Campo fuente | JOIN |
|--------|-------|-------------|------|
| **Invernada** | `dcac.revisaciones` | `r.adm_solicitud` | `dcac.usuarios AS us_op ON r.adm_solicitud = us_op.usuario` |
| **Faena** | `dcac.negocios` | `n.operador` | `dcac.usuarios AS us_op ON n.operador = us_op.usuario` |

> ⚠️ **No confundir** con `generado_por` (quién creó el registro) ni con `usuario` (usuario dueño del lote). El Operador es un rol específico de gestión.

Referencia: [Card 85](https://metabase.dcac.ar/question/85-hub-monitor-operadores-query-principal) tiene el diccionario de iniciales de operadores.

