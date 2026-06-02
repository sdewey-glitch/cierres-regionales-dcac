import { getMetabaseSession } from '../src/api/metabase';
import { config } from '../src/config/env';

async function main() {
    const token = await getMetabaseSession();
    const baseUrl = config.METABASE_URL.replace(/\/$/, '');
    const query = `
      SELECT
        ST.cuit AS cuit,
        max(LM.timestamp) AS fecha_asignacion
      FROM
        dcac.log_modificaciones AS LM
        INNER JOIN dcac.sociedades_tags AS ST ON LM.registro = ST.id
      WHERE
        LM.tabla = 'sociedades_tags'
        AND LM.campo = 'asociado_comercial'
        AND ST.cuit != ''
      GROUP BY
        ST.cuit
      LIMIT 10
    `;
    console.log("Querying mapping from cuit to latest assignment date...");
    const res = await fetch(`${baseUrl}/api/dataset`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Metabase-Session': token
        },
        body: JSON.stringify({
            database: 2,
            type: "native",
            native: { query }
        })
    });
    if (!res.ok) {
        console.error("HTTP Error:", res.status, await res.text());
        return;
    }
    const data = await res.json();
    console.log("Schema:", data.data.rows);
}
main().catch(console.error);
