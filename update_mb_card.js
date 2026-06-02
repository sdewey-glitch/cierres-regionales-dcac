const fs = require('fs');

async function run() {
    let sql = fs.readFileSync('q95_new.sql', 'utf8');

    // For Faena (First query block)
    // The existing code is:
    //       CASE
    //         WHEN toString(n.mag) = '1' THEN toDateOrNull(nullIf(toString(n.fecha_vendida), '0000-00-00'))
    //         ELSE coalesce(
    //           FechaFaenaReal.lo_fecha_faena_real,
    //           toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
    //         )
    //       END AS fecha_operacion,
    const faenaOld = `      CASE
        WHEN toString(n.mag) = '1' THEN toDateOrNull(nullIf(toString(n.fecha_vendida), '0000-00-00'))
        ELSE coalesce(
          FechaFaenaReal.lo_fecha_faena_real,
          toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
        )
      END AS fecha_operacion,`;

    const faenaNew = `      CASE
        WHEN toString(n.borrado) = '1' OR toString(n.no_concretado) = '1' THEN toDateOrNull(toString(nc.created_at))
        WHEN toString(n.tipo) IN ('0', '10', '11', '12') THEN toDateOrNull(nullIf(toString(n.fecha_publicacion), '0000-00-00'))
        WHEN toString(n.mag) = '1' THEN toDateOrNull(nullIf(toString(n.fecha_vendida), '0000-00-00'))
        ELSE coalesce(
          FechaFaenaReal.lo_fecha_faena_real,
          toDateOrNull(nullIf(toString(nl.fecha_faena), '0000-00-00'))
        )
      END AS fecha_operacion,`;
      
    sql = sql.replace(faenaOld, faenaNew);

    // For Invernada (Second query block)
    //       coalesce(
    //         toDateOrNull(
    //           nullIf(toString(dc.fecha_carga_final), '0000-00-00')
    //         ),
    //         toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
    //         addDays(
    //           toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')),
    //           7
    //         )
    //       ) AS fecha_operacion,
    const invernadaOld = `      coalesce(
        toDateOrNull(
          nullIf(toString(dc.fecha_carga_final), '0000-00-00')
        ),
        toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
        addDays(
          toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')),
          7
        )
      ) AS fecha_operacion,`;

    const invernadaNew = `      CASE
        WHEN toString(r.estado) = '5' OR toString(r.estado) = '7' THEN toDateOrNull(toString(nc.created_at))
        WHEN toString(r.estado) IN ('0', '3', '6', '11', '12') THEN toDateOrNull(nullIf(toString(r.fecha_publicacion), '0000-00-00'))
        ELSE coalesce(
          toDateOrNull(nullIf(toString(dc.fecha_carga_final), '0000-00-00')),
          toDateOrNull(nullIf(toString(dc.fecha_carga), '0000-00-00')),
          addDays(toDateOrNull(nullIf(toString(r.fecha_vendida), '0000-00-00')), 7)
        )
      END AS fecha_operacion,`;

    sql = sql.replace(invernadaOld, invernadaNew);

    fs.writeFileSync('q95_new.sql', sql);
    
    // Now update Card 298
    const METABASE_URL = "https://metabase.dcac.ar";
    const METABASE_USERNAME = "ptaffarel@decampoacampo.com";
    const METABASE_PASSWORD = "iA730_JcU0EnDQ";

    const resAuth = await fetch(METABASE_URL + '/api/session', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username: METABASE_USERNAME, password: METABASE_PASSWORD }) 
    }); 
    const auth = await resAuth.json(); 

    const cardDef = {
        dataset_query: {
            database: 2,
            type: "native",
            native: { query: sql }
        }
    };

    const resUpdate = await fetch(METABASE_URL + '/api/card/298', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Metabase-Session': auth.id
        },
        body: JSON.stringify(cardDef)
    });

    const updatedCard = await resUpdate.json();
    console.log('UPDATED CARD ID:', updatedCard.id);
}
run().catch(console.error);
