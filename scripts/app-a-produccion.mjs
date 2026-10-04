/* Pasa la tarjeta de una app de "Prueba cerrada · solo testers" a "Google Play".
 *
 * 🚨 COMPRUEBA LA FICHA ANTES DE TOCAR NADA. Una ficha que todavia no es publica
 * devuelve 404, y publicar ese enlace manda al visitante a un error de Play, que
 * es peor que el enlace de prueba cerrada que tenia. Si no da 200, no cambia
 * nada y avisa.
 *
 *   node scripts/app-a-produccion.mjs cavila
 *   node scripts/app-a-produccion.mjs cavila --forzar   (salta la comprobacion)
 *
 * Despues hay que revisar el diff y publicar a mano: esto no commitea.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(RAIZ, 'index.html');

// El paquete de cada app. Estan tambien en el README; si se agrega una, va aqui.
const PAQUETES = {
  matibu: 'cl.matibu.matematicas',
  cavila: 'cl.cavila.app',
  lunabu: 'cl.lunabu.preescolar',
  anticipa: 'cl.anticipa.rutinas',
  dilojugando: 'cl.dilojugando.pronunciacion',
  cronobu: 'cl.cronobu.historia',
  palabu: 'cl.palabu.lenguaje',
};

/* Con que palabra tiene que empezar el og:title para creerle a Play. Ver el
   paso 1: el nombre de la ficha no siempre es el de la tarjeta —Lunabu se llama
   "Lunabu: Toddler Learning 2-5"— asi que se compara el principio. */
const NOMBRES = {
  matibu: 'Matibu',
  cavila: 'Cavila',
  lunabu: 'Lunabu',
  anticipa: 'Anticipa',
  dilojugando: 'Dilo Jugando',
  cronobu: 'Cronobu',
  palabu: 'Palabu',
};

const app = (process.argv[2] || '').toLowerCase();
const forzar = process.argv.includes('--forzar');
const paquete = PAQUETES[app];

if (!paquete) {
  console.error(`Uso: node scripts/app-a-produccion.mjs <${Object.keys(PAQUETES).join('|')}> [--forzar]`);
  process.exit(1);
}

const fichaPublica = `https://play.google.com/store/apps/details?id=${paquete}`;

/* ── 1) ¿La ficha ya es publica? ─────────────────────────────────────────────
 *
 * 🚨 UN 200 NO ALCANZA, Y ESTA ES LA TRAMPA QUE MAS VECES SE PISO. Play
 * responde 200 con una PAGINA DE ERROR —"no encontramos la aplicacion"— y
 * tambien con la ficha de otra cosa. El codigo de estado dice que el servidor
 * contesto, no que la app exista. Lo que lo distingue es el og:title: en una
 * ficha de verdad dice "<Nombre> - Apps on Google Play", y en la de error no
 * dice nada. Por eso se miran las DOS cosas antes de encender un boton que va a
 * la portada del estudio.
 */
if (!forzar) {
  process.stdout.write(`Comprobando la ficha de ${app}... `);
  let codigo = 0;
  let cuerpo = '';
  try {
    const r = await fetch(fichaPublica, { redirect: 'follow' });
    codigo = r.status;
    cuerpo = await r.text();
  } catch (e) {
    console.log('sin respuesta');
    console.error(`No se pudo consultar Play (${e.message}). No se cambio nada.`);
    process.exit(1);
  }
  console.log(codigo);
  if (codigo !== 200) {
    console.error(`\nLa ficha todavia NO es publica (${codigo}). No se cambio nada.`);
    console.error('Volver a intentarlo cuando la version este publicada en produccion.');
    process.exit(1);
  }

  const titulo = (/<meta property="og:title" content="([^"]*)"/.exec(cuerpo) || [, ''])[1];
  const esperado = NOMBRES[app];
  console.log(`  og:title: ${titulo || '(vacio)'}`);
  if (!titulo.startsWith(esperado)) {
    console.error(`\n🚨 Da 200 pero el og:title NO empieza por "${esperado}".`);
    console.error('   Play devuelve 200 con una pagina de error: esto NO es la ficha.');
    console.error('   Aprobada en Play no es lo mismo que publicada; el despliegue tarda.');
    console.error('   No se cambio nada.');
    process.exit(1);
  }
}

// ── 2) Cambiar el estado en la tarjeta ──────────────────────────────────────
let t = readFileSync(HTML, 'utf8');
const antes = t;

const estadoPublico =
  `<a class="estado" href="${fichaPublica}" rel="noopener"><span class="punto" aria-hidden="true"></span>Google Play</a>`;

/* Una app puede llegar a produccion desde DOS estados, y el salto no es el mismo:
 *
 *   a) "Prueba cerrada"  -> un <a class="estado"> al enlace /apps/testing/.
 *      Se cambia el href y listo. Es el caso de Matibu, Cavila y Lunabu.
 *
 *   b) "En desarrollo"   -> un <span class="estado"> (no es enlace, no hay a
 *      donde mandar a nadie) MAS un <span class="proximo"> que hace de boton
 *      apagado, para que la fila de abajo se vea igual en las diez tarjetas.
 *      Hay que encender las dos cosas. Paso con Cronobu el 30-09-2026: nunca
 *      tuvo prueba cerrada abierta al publico, saltó de borrador a produccion,
 *      y el guion solo sabia hacer (a), asi que decia "no la encontre".
 *
 * Para (b) hay que trabajar DENTRO de la tarjeta de esta app y no en todo el
 * archivo: "En desarrollo" lo dicen varias, y un replace global las encendería
 * todas de una. La tarjeta se reconoce por su icono, que lleva el nombre.
 */
const testing = `https://play.google.com/apps/testing/${paquete}`;
const viejo = new RegExp(
  '<a class="estado" href="' + testing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
  '"[^>]*>.*?</a>'
);

if (viejo.test(t)) {
  t = t.replace(viejo, estadoPublico);
} else {
  const trozos = t.split('<li class="app"');
  /* Se busca desde 1 y por `alt="Icono`: el icono de cada app sale TAMBIEN en el
     abanico del heroe y en la cinta que corre, las dos cosas antes de la primera
     tarjeta, o sea dentro de trozos[0]. Buscando de 0 la primera coincidencia es
     siempre esa y el guion decia "no encontre la tarjeta" teniendola delante. */
  const i = trozos.findIndex((x, n) => n > 0 && x.includes(`iconos/${app}.webp" alt="Icono`));
  if (i < 1) {
    console.error(`No encontre la tarjeta de ${app} en index.html.`);
    console.error('Se reconoce por su icono: iconos/' + app + '.webp');
    process.exit(1);
  }
  let tarjeta = trozos[i];
  if (!/<span class="estado">[\s\S]*?En desarrollo<\/span>/.test(tarjeta)) {
    console.error(`La tarjeta de ${app} no esta en "prueba cerrada" ni en "En desarrollo".`);
    console.error('Puede que ya este en produccion, o que el enlace haya cambiado.');
    process.exit(1);
  }
  tarjeta = tarjeta.replace(/<span class="estado">[\s\S]*?En desarrollo<\/span>/, estadoPublico);
  /* El boton apagado pasa a ser el enlace de verdad. Va con el mismo href que la
     etiqueta de al lado a proposito: el que tiene pagina propia usa la pastilla
     para ir a ella, y el que no la tiene la usa para ir a la ficha. Una tarjeta
     con el hueco vacio se lee como una app de segunda.

     🚨 Y hay un tercer caso que NO necesita este reemplazo: la app que ya tiene
     PAGINA PROPIA pero todavia no tiene ficha. Su tarjeta trae un <a class=
     "ficha"> a su pagina y NINGUN <span class="proximo">, asi que esto no
     encuentra nada y no hace nada — que es exactamente lo correcto: la pastilla
     tiene que seguir llevando a la pagina, y lo unico que cambia es el estado.
     Es el caso de Palabu el 04-10-2026. Si algun dia esto empieza a fallar por
     "no se aplico ningun cambio", mirar primero si el estado si se cambio. */
  tarjeta = tarjeta.replace(
    /<span class="proximo"[\s\S]*?<\/span>\s*\n(\s*)/,
    `<a class="ficha" href="${fichaPublica}" rel="noopener">\n` +
    `              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3.4v17.2a1 1 0 0 0 1.52.86l14.2-8.6a1 1 0 0 0 0-1.72L6.52 2.54A1 1 0 0 0 5 3.4z"/></svg>\n` +
    `              Descargar\n            </a>\n$1`
  );
  trozos[i] = tarjeta;
  t = trozos.join('<li class="app"');
}

if (t === antes) { console.error('No se aplico ningun cambio.'); process.exit(1); }

writeFileSync(HTML, t, 'utf8');
console.log(`\nListo: la tarjeta de ${app} apunta a la ficha publica.`);

/* 🚨 ESTO SOLO CAMBIA LA PORTADA. Falta la pagina propia, y olvidarlo deja el
   sitio diciendo dos cosas distintas: la tarjeta manda a Play y la pagina sigue
   avisando de que la app "todavia no esta en Google Play". Paso con Cavila el
   07-09-2026. Se avisa aca porque este es el mensaje que se lee, no el README. */
const pagina = join(RAIZ, app, 'index.html');
let aviso = false;
try {
  const p = readFileSync(pagina, 'utf8');
  aviso = p.includes('aviso-tienda');
  if (aviso) {
    console.log(`\n🚨 FALTA la pagina propia: ${app}/index.html todavia tiene el aviso`);
    console.log('   de "todavia no esta en Google Play". Cambiar cada `p.aviso-tienda`');
    console.log('   por el boton, copiando el patron de matibu/index.html:');
    console.log(`     <a class="boton" href="${fichaPublica}">Descargar en Google Play</a>`);
    console.log('   🚨 Y comprobar que la pagina declare `--boton-claro`: sin eso el boton');
    console.log('   sale con el indigo de Matibu. El valor sale de');
    console.log(`     node scripts/boton-contraste.mjs ${app}`);
  }
} catch { /* la app puede no tener pagina propia todavia */ }

console.log('\nRevisa el diff y publica:');
console.log(`  git add index.html${aviso ? ` ${app}/index.html` : ''} && git commit -m "${app} ya esta en produccion" && git push`);
