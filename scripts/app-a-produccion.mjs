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
};

const app = (process.argv[2] || '').toLowerCase();
const forzar = process.argv.includes('--forzar');
const paquete = PAQUETES[app];

if (!paquete) {
  console.error(`Uso: node scripts/app-a-produccion.mjs <${Object.keys(PAQUETES).join('|')}> [--forzar]`);
  process.exit(1);
}

const fichaPublica = `https://play.google.com/store/apps/details?id=${paquete}`;

// ── 1) ¿La ficha ya es publica? ─────────────────────────────────────────────
if (!forzar) {
  process.stdout.write(`Comprobando la ficha de ${app}... `);
  let codigo = 0;
  try {
    const r = await fetch(fichaPublica, { redirect: 'follow' });
    codigo = r.status;
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
}

// ── 2) Cambiar el estado en la tarjeta ──────────────────────────────────────
let t = readFileSync(HTML, 'utf8');
const antes = t;

const testing = `https://play.google.com/apps/testing/${paquete}`;
const viejo = new RegExp(
  '<a class="estado" href="' + testing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
  '"[^>]*>.*?</a>'
);

if (!viejo.test(t)) {
  console.error(`No encontre la tarjeta de ${app} en estado de prueba cerrada.`);
  console.error('Puede que ya este en produccion, o que el enlace haya cambiado.');
  process.exit(1);
}

t = t.replace(viejo,
  `<a class="estado" href="${fichaPublica}" rel="noopener"><span class="punto" aria-hidden="true"></span>Google Play</a>`);

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
