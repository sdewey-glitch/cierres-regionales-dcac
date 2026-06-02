const fs = require('fs');

async function run() {
    let sql = fs.readFileSync('q95.sql', 'utf8');

    // Replace cuit_vend with cuit_vendedor
    sql = sql.replace(/AS cuit_vend,/g, 'AS cuit_vendedor,');
    sql = sql.replace(/AS cuit_comp,/g, 'AS cuit_comprador,');

    // Insert new aliases before the FROM clause of the main outer query
    // Actually, there are multiple parts because it's a UNION.
    // So we'll find `AS AC_Vend,` and add our new fields right after it.
    
    // Replace 1 (First SELECT in UNION)
    sql = sql.replace(
        /concat\(acv\.nombre, ' ', acv\.apellido\) AS AC_Vend,/g,
        `concat(acv.nombre, ' ', acv.apellido) AS AC_Vend,
      concat(acv.nombre, ' ', acv.apellido) AS asociado_comercial_id_vend,
      Vendedoras.asoc_com_vend AS asociado_comercial_soc_vend,`
    );

    sql = sql.replace(
        /concat\(acc\.nombre, ' ', acc\.apellido\) AS AC_Comp,/g,
        `concat(acc.nombre, ' ', acc.apellido) AS AC_Comp,
      concat(acc.nombre, ' ', acc.apellido) AS asociado_comercial_id_comp,
      Compradoras.asoc_com_compra AS asociado_comercial_soc_comp,`
    );

    // Save modified sql
    fs.writeFileSync('q95_new.sql', sql);

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
        name: "Q95_Engine_Ready",
        dataset_query: {
            database: 2,
            type: "native",
            native: { query: sql }
        },
        display: "table",
        visualization_settings: {}
    };

    const resCreate = await fetch(METABASE_URL + '/api/card', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Metabase-Session': auth.id
        },
        body: JSON.stringify(cardDef)
    });

    const newCard = await resCreate.json();
    console.log('NEW CARD ID:', newCard.id);
}
run().catch(console.error);
