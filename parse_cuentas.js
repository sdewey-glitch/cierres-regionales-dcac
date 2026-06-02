const fs = require('fs');

const raw = `CMD AGRO S.R.L.	30712119841	Lucila Frutos			 01 / 11 / 24
BIOFARMA AGROPECUARIA S.A. S. A.	30717125394	Santiago Julian	Merma		 01 / 11 / 24
BIOFARMA AGROPECUARIA S.A. S. A.	30708484926	Sebastian Saparrat	Merma		 01 / 11 / 24
MAREUBA S A	30591025801	Santiago Julian	Merma		 01 / 11 / 24
Bustos y Beltran SA	30564189657		ACT CI		 01 / 11 / 24
Esidle SA	33714200629	Juan José Loza	Merma		 01 / 11 / 24
Deltagro Sa	30692272737	Sebastian Saparrat	Merma		 01 / 11 / 24
Grazia S A	30561394713	Jose Olmedo			 01 / 11 / 24
Nestor Tomasello SRL	30715529234	Jose Olmedo	Merma		 01 / 11 / 24
Ángeles Del Quequen	30666403122	Sebastian Saparrat	Merma		 01 / 11 / 24
Logros S. A.	30708051191		Merma		 01 / 11 / 24
Carfa S.R.L	30711582939	Jose Olmedo	Merma		 01 / 11 / 24
4 Reinas S.A	30711165904	Sebastian Saparrat	Merma		 01 / 11 / 24
LOSABU S.A.	30710513852	Sebastian Saparrat	Merma		 01 / 11 / 24
Alila Sa	30688748905	Juan José Loza	Merma		 01 / 11 / 24
Las Viboras S A Agricola Ganad	33507162709	Juan José Loza	Merma		 01 / 11 / 24
Elava Srl	30707652531	Juan José Loza	Merma		 01 / 11 / 24
Ladislao Popelka Y Cia. S. A.	33513774619	Juan José Loza	Merma		 01 / 11 / 24
La Noria S C A	30511847288	Juan José Loza	Merma		 01 / 11 / 24
Frig. Gorina SAIC	30537869158	Sebastian Saparrat	ACT CI	FAENA	 01 / 02 / 25
Frig. Gorina SAIC	30537869158	Sebastian Saparrat	ACT CI		 01 / 02 / 25
Swift Argentina SA	30560378056		ACT CI	FAENA	 01 / 02 / 25
Mat. y Frig. El Mercedino	30663416975	Jose Olmedo	ACT CI	FAENA	 01 / 02 / 25
Frigorifico Forres - Belt	30710014287		ACT CI	INVERNADA	 01 / 02 / 25
El Zamorano	30709864250		ACT CI		 01 / 02 / 25
CONALLISON	30707321721		ACT CI		 01 / 02 / 25
TEHA AGROPECUARIA S R L	30691206404	Agustin Acuña			 01 / 02 / 25
Frig. General Belgrano SA	33709619409		ACT CI		 01 / 02 / 25
Luda S.R.L.	30712278699	Jose Olmedo	ACT CI		 01 / 02 / 25
Rafaela Alimentos SA	3492602477		ACT CI		 01 / 02 / 25
Sicemi SCA	3425509423	Luli Frutos			 01 / 02 / 25
Agroganados San Nicolas	30716254077		ACT CI		 01 / 06 / 25
Agropecuaria San Elias	30717189309		ACT CI		 01 / 06 / 25
Nagli Marcelo Elías	20146242430		ACT CI		 01 / 06 / 25
Grupo Tresnal S.R.L	30710915969		ACT CI		 01 / 06 / 25
Agropecuaria Tresnal	33708830599		ACT CI		 01 / 06 / 25
REPETTO RAFAEL ROQUE	20206542587	Menghi	ACT CI		 01 / 11 / 25
SAN MARAGUSTO	30711074267		ACT CI		 01 / 11 / 25
SyD Lafuente S.A	30716554925		Merma		 01 / 11 / 25
ESTANCIA FLUGEL	30510931706	Repre, Santiago Correa	Merma		 01 / 11 / 25
Frigorifico Regional San Antonio de Areco (TL)	30516241612		ACT CI		 01 / 11 / 25
Pampa Compania De Carnes S.A.S	30716263645		ACT CI		 01 / 11 / 25
Orzali SRL	30717314189		ACT CI		 01 / 11 / 25
Abuelo Julio S.A.	30716667738		ACT CI		 01 / 11 / 25
Agropecuaria Las Helenas Sa	30716676583		ACT CI		 01 / 11 / 25
ASOCIACION DE COOPERATIVAS ARG	30500120882		ACT CI		 01 / 11 / 25
Acevedo Arturo Tomas	23083196319	Emiliano Sanchez	Merma		 08 / 12 / 25
Estancias Llorens SA	30635775897		Merma		 01 / 11 / 25
Enrique R Zeni Y Cia Saciafei	30512823099		Merma		 15 / 04 / 26
Agrop. Los Pinos Ham Srl	30716553384		Merma		 15 / 04 / 26`;

const lines = raw.split('\n').filter(l => l.trim() !== '');
const results = lines.map(line => {
    const parts = line.split('\t');
    const razon_social = parts[0]?.trim();
    const cuit = parts[1]?.trim();
    const ac_asignado = parts[2]?.trim();
    const tipo_cuenta_raw = parts[3]?.trim();
    let tipo_cuenta = 'Mermas';
    if (tipo_cuenta_raw === 'ACT CI') tipo_cuenta = 'Activacion CI';
    else if (tipo_cuenta_raw === 'Merma') tipo_cuenta = 'Mermas';
    
    return {
        agente: 'Lucila Frutos',
        razon_social: razon_social,
        cuit: cuit,
        tipo_cuenta: tipo_cuenta,
        fecha_incorporacion: parts[5]?.trim(),
        ac_asignado: ac_asignado
    };
});

let existing = [];
try {
  existing = JSON.parse(fs.readFileSync('src/core/data/cuentas.json', 'utf8'));
} catch (e) {}

const finalData = existing.concat(results);
fs.writeFileSync('src/core/data/cuentas.json', JSON.stringify(finalData, null, 4));
console.log('Saved', results.length, 'cuentas to cuentas.json');
