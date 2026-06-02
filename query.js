const fs = require('fs');

async function run() {
    const METABASE_URL = "https://metabase.dcac.ar";
    const METABASE_USERNAME = "ptaffarel@decampoacampo.com";
    const METABASE_PASSWORD = "iA730_JcU0EnDQ";

    const resAuth = await fetch(METABASE_URL + '/api/session', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username: METABASE_USERNAME, password: METABASE_PASSWORD }) 
    }); 
    const auth = await resAuth.json(); 
    
    const resCard = await fetch(METABASE_URL + '/api/card/95', { 
        headers: { 'X-Metabase-Session': auth.id }
    }); 
    const card = await resCard.json(); 
    
    console.log(JSON.stringify({ 
        database_id: card.dataset_query.database, 
        query: card.dataset_query.native ? card.dataset_query.native.query : 'NO_NATIVE' 
    }, null, 2)); 
}
run().catch(console.error);
