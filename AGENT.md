# 🤖 AGENT.md — Guía para el Agente de IA

> **Propósito**: Instrucciones operativas para cualquier agente de IA (Antigravity, Claude, Cursor, Copilot) que trabaje en este proyecto.
> Leer **antes** de escribir código.

---

## 1. Identidad del Proyecto

- **Nombre**: `mi-tablero-ganadero` — Dashboard privado de **De Campo a Campo** (consignataria de hacienda, Río Cuarto, Argentina).
- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript strict + TailwindCSS 4 + Recharts.
- **Backend BI**: Metabase (2 instancias) → MariaDB (operativo) + ClickHouse (analítico).
- **Deploy**: Vercel (auto-deploy desde `main`).
- **Idioma de la UI**: Español argentino. Código y commits en inglés.

---

## 2. Arquitectura — Lo que TENÉS que saber

### Dos Metabase, dos bases de datos
| Instancia | Base de datos | Uso | Cards principales |
|-----------|--------------|-----|-------------------|
| **MB1** (METABASE_URL) | MariaDB | Datos operativos en tiempo real | Card 155 (Lotes/Publicaciones), Card 128 (Ofertas INV) |
| **MB2** (METABASE2_URL) | ClickHouse | Analítica pesada, historial | Card 95 (Q95 — Operaciones consolidadas) |

### Flujo de datos crítico
```
Browser → DashboardClient.tsx (Client Component)
       → /api/regional (Route Handler)
       → [MB1] Cards 155, 128 (MariaDB — Lotes + Ofertas)
       → [MB2] Q95 via /api/dataset (ClickHouse — Operaciones)
       → Normalización + Cruces en memoria (Node.js)
       → JSON al Client → Render
```

### Caché en memoria (Node.js)
- **DATA_TTL_MS = 15 min** para datos globales (lotes, ofertas, Q95).
- **SESSION_TTL_MS = 110 min** para tokens de sesión de Metabase.
- **Snapshots** (`lib/utils/snapshot.ts`): Datos históricos (> 90 días) consolidados en Vercel Blob. La Q95 solo pide los últimos 3 meses en vivo y merge con el snapshot.

### Seguridad de datos (RSL — Row-Level Security)
- Cada AC solo ve **sus propias operaciones** (filtrado por `id_ac_vend`, `id_rep_vend`, `id_ac_comp`, `id_rep_comp`).
- Admins (`ADMIN_EMAILS` en `lib/data/constants.ts`) ven todo.
- **NUNCA** expongas credenciales de Metabase en componentes del cliente.

---

## 3. Reglas de Código — NO romper

### TypeScript
- **strict: true** → No usar `any` sin justificación documentada.
- Interfaces explícitas para toda estructura de datos de Metabase/Sheets.

### Componentes React
- Todo en `components/` es `'use client'`.
- `app/page.tsx` y `app/layout.tsx` son Server Components → **NO** agregarles `'use client'`.
- Un componente = un archivo.

### Datos y estado
- El estado global vive en `DashboardClient.tsx` y baja como props.
- **NO** usar Zustand, Redux, Jotai, SWR ni React Query.
- Fetch nativo con `async/await`.

### Estilos
- **Solo TailwindCSS 4**. No CSS custom excepto en `globals.css`.
- Colores por AC: `constants.ts` (PALETTE). Colores por UN: `unColors.ts`.

### Metabase
- **NUNCA** llamar a Metabase desde un Client Component.
- Toda llamada pasa por Route Handlers (`/api/metabase`, `/api/regional`).
- Comentar siempre el Card ID: `// Metabase Card #95: Operaciones`.
- **⚠️ REGLA DE TESTING**: Los cambios a la Q95 van **siempre** a la Card **249** (testing) primero. La Card **95** (producción) solo se actualiza después de que el usuario apruebe los cambios en la 249. Al finalizar, ambas deben quedar idénticas.

---

## 4. Lógica de Negocio — Reglas que NO son obvias

### Asignación de resultado económico
Cuando una operación tiene **vendedor y comprador** con AC asignado:
- **Vendedor** → recibe 2/3 (66.7%) del `resultado_final`.
- **Comprador** → recibe 1/3 (33.3%) del `resultado_final`.
- Si solo hay un lado → ese lado recibe el 100%.
- Si no hay ninguno → operación "Directa", sin asignación regional.

### IDs vinculados (`LINKED_AC_IDS`)
Algunos comerciales operan bajo múltiples cuentas de Metabase. El mapeo está en `lib/data/usuarios.ts`. Ejemplo: Simon De Aduriz (48871) opera también como Gonzalo Aduriz (306). Al filtrar por AC, incluir **todos** los IDs vinculados.

### Canales de venta
Los canales son: `Regional`, `Representantes`, `Comisionista`, `Oficina`, `Directo`. La clasificación se hace en la Q95 (ClickHouse), no en el dashboard.

### Oficinas
Las oficinas (Rio 4to, Bavio, Entre Ríos, etc.) agrupan varios ACs. El filtrado se hace por `Oficina_Venta` / `Oficina_Compra`, no por nombre de AC individual.

### Unidades de Negocio (UN)
`Faena`, `Invernada`, `Cría`, `MAG`. Cada una tiene color asignado en `unColors.ts`.

---

## 5. Archivos Clave — Dónde buscar

| Archivo | Propósito |
|---------|-----------|
| `app/api/regional/route.ts` | **Endpoint principal**. Orquesta todo: caché, sesiones, fetch MB1+MB2, filtrado, merge. |
| `lib/api/q95.ts` | Ejecuta la Q95 contra ClickHouse (MB2). Resuelve template-tags del SQL. |
| `lib/api/metabase-server.ts` | Convierte formato crudo de Metabase `{cols, rows}` → array de objetos. |
| `lib/api/metabase.ts` | Cliente browser → proxy `/api/metabase`. |
| `lib/data/usuarios.ts` | Usuarios canónicos, IDs vinculados (`LINKED_AC_IDS`). |
| `lib/data/constants.ts` | AcDef, ADMIN_EMAILS, paleta de colores, UN_LIST, OFICINA_ID. |
| `lib/data/comerciales.ts` | Perfiles enriquecidos (código, provincia, oficina). |
| `lib/data/targets.ts` | Metas/objetivos por AC y período. |
| `lib/utils/snapshot.ts` | Lectura/escritura de snapshots históricos (Vercel Blob o filesystem). |
| `lib/utils/estados.ts` | Mapeo de estados de lotes/CIs. |
| `lib/utils/regional-data.ts` | Transformaciones pesadas de datos regionales. |
| `components/dashboard/DashboardClient.tsx` | Shell principal: tabs, filtros, contexto global. |
| `components/dashboard/EstadoTropas.tsx` | Vista de lotes/tropas y estado. |
| `components/dashboard/KPIsRegional.tsx` | KPIs con filtros de año/mes. |

---

## 6. Workflow del Agente

### Antes de codear
1. Leer `CONTEXT.md` (visión general) y este archivo.
2. Leer `docs/01_modelos_y_tablas.md` (entidades).
3. Leer `docs/02_flujos_y_queries.md` (flujos de datos).
4. Leer `docs/03_arquitectura_db.md` (MariaDB vs ClickHouse).

### Al codear
- Planificar antes de ejecutar cambios no triviales (3+ archivos).
- Verificar que el build compila antes de declarar "listo" (`npm run build`).
- No tocar archivos que no sean necesarios.
- Mantener comentarios y docstrings existentes.

### Al corregir bugs
- Buscar root cause, no parchar síntomas.
- Si el error es de tipos ClickHouse (`NO_COMMON_TYPE`), revisar los CASTs en la Q95.
- Si el dashboard muestra datos incorrectos, verificar primero el filtrado por AC/Oficina en `/api/regional`.

### Después de cada corrección del usuario
- Documentar el patrón en `tasks/lessons.md` para no repetir el error.

---

## 7. MCP y Conexiones Directas a APIs

### ¿Qué es MCP?
**Model Context Protocol** es un estándar abierto que permite a agentes de IA (Claude, Cursor, etc.) conectarse directamente a servicios externos (bases de datos, APIs) sin pasar por el código de la app. Esto es útil para explorar datos, depurar queries, o inspeccionar esquemas sin tocar el dashboard.

### MCP de Metabase (Nativo)
Metabase incluye un servidor MCP nativo en `/api/mcp`:

```
URL:       https://metabase.dcac.ar/api/mcp
Transporte: streamable-http
Auth:       OAuth 2.0 (redirige a login de Metabase)
```

**Configuración en Claude Code:**
```bash
/mcp add metabase https://metabase.dcac.ar/api/mcp --transport streamable-http
```

**Configuración en Claude Desktop / Cursor** (`mcp.json` o `claude_desktop_config.json`):
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

**Capacidades:** Listar dashboards, cards, colecciones, ejecutar queries (Cards) existentes, y correr SQL ad-hoc contra las bases conectadas (MariaDB y ClickHouse).

### MCP para ClickHouse (Directo)
Si se necesita acceso directo a ClickHouse sin pasar por Metabase:

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

> ⚠️ Las credenciales de ClickHouse están en la configuración interna de Metabase (Datasource 2). Si se necesita acceso directo, solicitar host/usuario al administrador de infra.

### MCP para Google Sheets
Para leer/escribir las planillas del sistema (usuarios, SAC, targets):

```json
{
  "mcpServers": {
    "google_sheets": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-google-sheets"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "ruta/a/service-account.json"
      }
    }
  }
}
```

**Service Account del proyecto:** `mi-tablero-ganadero@focused-premise-435119-c0.iam.gserviceaccount.com` — la key privada está en `.env.local` (campo `Google_key`).

### API REST de Metabase (sin MCP)
Cuando el agente necesita operar programáticamente (crear cards, leer datos, pushear SQL), usa la API REST directa:

| Acción | Método | Endpoint | Auth Header |
|--------|--------|----------|-------------|
| Obtener sesión | `POST` | `/api/session` | — (body: `{username, password}`) |
| Leer card | `GET` | `/api/card/{id}` | `X-Metabase-Session: {token}` |
| Ejecutar card | `POST` | `/api/card/{id}/query` | `X-Metabase-Session: {token}` |
| SQL ad-hoc | `POST` | `/api/dataset` | `X-Metabase-Session: {token}` |
| Actualizar card | `PUT` | `/api/card/{id}` | `X-Metabase-Session: {token}` |
| Listar databases | `GET` | `/api/database` | `X-Metabase-Session: {token}` |

**URL base:** `https://metabase.dcac.ar`  
**Credenciales MB1 (MariaDB):** `METABASE_USERNAME` / `METABASE_PASSWORD` en `.env.local`  
**Credenciales MB2 (ClickHouse):** `METABASE2_USERNAME` / `METABASE2_PASSWORD` en `.env.local`  
**API Key alternativa:** `METABASE_API_KEY` en `.env.local` (header `X-Api-Key` en vez de sesión)

### Planillas de Google Sheets Clave

| Planilla | Spreadsheet ID | Uso |
|----------|---------------|-----|
| Usuarios | `1FpgyFCw2hibi3w_jArtohKUxPhvfUpnF9SDDI3YI-aI` | Lista de usuarios del sistema (GID 1192272172) |

> Para acceder a las planillas con la Service Account, el sheet debe tener compartido el email `mi-tablero-ganadero@focused-premise-435119-c0.iam.gserviceaccount.com` como Editor.
