/* Los seis rios de temas de la pagina de Palabu, armados desde la APP.
 *
 *   node scripts/palabu-rios.mjs              mira y cuenta, no toca nada
 *   node scripts/palabu-rios.mjs --escribir   los vuelve a meter en la pagina
 *
 * 🚨 POR QUE ESTO NO SE ESCRIBE A MANO. Son 55 chips con su emoji, su nombre y
 * el color de su mundo. Escritos a mano envejecen solos y en silencio: el dia
 * que entre un tema nuevo, la app lo muestra —su pantalla de inicio se arma
 * sola desde el temario— y la pagina sigue contando los de antes. Ya paso con
 * los numeros escritos a mano de otras paginas: Anticipa decia 121 pictogramas
 * cuando eran 157, y Dilo decia 8 juegos cuando eran 16.
 *
 * Las tres fuentes viven en el repo de la app, no aca:
 *   mundos.ts    el orden de los mundos, su emoji y su color
 *   temario.ts   que tema va en que mundo, y su emoji
 *   i18n/es.ts   como se llama cada cosa en la pantalla
 *
 * 🚨 Los colores salen de `color`, que en esa app es el tono VIVO —el que va con
 * letra blanca encima en la cabecera del camino— y ya esta medido alli. No
 * retocarlos a ojo aca: se veria distinto de la app.
 *
 * 🚨 Si el repo de la app no esta (otra maquina, un clon suelto), esto avisa y
 * no toca nada. No puede romper la pagina por mirar algo que no es suyo.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = resolve(RAIZ, '..', 'lenguaje', 'src', 'content');
const PAGINA = join(RAIZ, 'palabu', 'index.html');

const ABRE = '    <ul class="rios" data-rise>';
const CIERRA = '    </ul>';

if (!existsSync(join(APP, 'temario.ts'))) {
  console.error(`No encontre el repo de Palabu en ${APP}. No toco nada.`);
  process.exit(1);
}

const tem = readFileSync(join(APP, 'temario.ts'), 'utf8');
const mun = readFileSync(join(APP, 'mundos.ts'), 'utf8');
const es = readFileSync(join(APP, 'i18n', 'es.ts'), 'utf8');

const textos = Object.fromEntries(
  [...es.matchAll(/'([a-z0-9.\-]+)':\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2]]),
);
const nombre = (k) => textos[k] ?? `FALTA:${k}`;

const mundos = [
  ...mun.matchAll(/id:\s*'([^']+)'[\s\S]*?emoji:\s*'([^']+)'[\s\S]*?color:\s*'(#[0-9A-Fa-f]{6})'/g),
].map((m) => ({ id: m[1], emoji: m[2], color: m[3] }));

const temas = [...tem.matchAll(/tema\('([a-z0-9-]+)',\s*'([a-z]+)',\s*'([^']+)'/g)].map((m) => ({
  id: m[1],
  mundo: m[2],
  emoji: m[3],
}));

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16)).join(',');
/* Duraciones distintas y primas entre si: con la misma, las seis filas se
   alinean cada tantos segundos y el conjunto se lee como un solo bloque. */
const DURACION = [30, 34, 38, 32, 36, 33];

let rios = '';
for (const [i, mu] of mundos.entries()) {
  const ts = temas.filter((t) => t.mundo === mu.id);
  const isla =
    `<span class="rio-isla"><span class="rio-emoji" aria-hidden="true">${mu.emoji}</span>` +
    `${nombre('mundo.' + mu.id)}` +
    `<span class="rio-cuenta">${ts.length} temas · ${ts.length * 4} lecciones</span></span>`;
  const chips = ts
    .map(
      (t) =>
        `<span class="chip"><span class="chip-emoji" aria-hidden="true">${t.emoji}</span>` +
        `${nombre('tema.' + t.id)}</span>`,
    )
    .join('');
  // La copia es la que hace el bucle: la pista mide el doble y vuelve al origen.
  rios +=
    `      <li class="rio${i % 2 ? ' al-reves' : ''}" ` +
    `style="--tono:${mu.color};--tinte:rgba(${rgb(mu.color)},.15);--borde:rgba(${rgb(mu.color)},.38)">\n` +
    `        <div class="rio-pista" style="animation-duration:${DURACION[i % DURACION.length]}s">\n` +
    `          <div class="rio-grupo">${isla}${chips}</div>\n` +
    `          <div class="rio-grupo" aria-hidden="true">${isla}${chips}</div>\n` +
    `        </div>\n      </li>\n`;
}

const faltan = [...new Set(rios.match(/FALTA:[a-z0-9.\-]+/g) || [])];
console.log(`${mundos.length} mundos · ${temas.length} temas · ${temas.length * 4} lecciones`);
for (const mu of mundos) {
  const n = temas.filter((t) => t.mundo === mu.id).length;
  console.log(`  ${mu.emoji} ${nombre('mundo.' + mu.id).padEnd(18)} ${String(n).padStart(2)} temas  ${mu.color}`);
}
if (faltan.length) {
  console.error(`\n🚨 ${faltan.length} sin nombre en i18n/es.ts: ${faltan.join(', ')}`);
  console.error('   No se escribe nada: la pagina quedaria con "FALTA:" a la vista.');
  process.exit(1);
}

if (!process.argv.includes('--escribir')) {
  console.log('\nNo se toco nada. Para meterlos en la pagina:');
  console.log('  node scripts/palabu-rios.mjs --escribir');
  process.exit(0);
}

const html = readFileSync(PAGINA, 'utf8');
const a = html.indexOf(ABRE);
const b = html.indexOf(CIERRA, a);
if (a < 0 || b < 0) {
  console.error(`No encontre "${ABRE.trim()}" ... "${CIERRA.trim()}" en palabu/index.html.`);
  process.exit(1);
}
const nuevo = html.slice(0, a + ABRE.length) + '\n' + rios + html.slice(b);
if (nuevo === html) {
  console.log('\nLa pagina ya decia exactamente esto.');
  process.exit(0);
}
writeFileSync(PAGINA, nuevo);
console.log(`\npalabu/index.html: ${(html.length / 1024).toFixed(1)} KB -> ${(nuevo.length / 1024).toFixed(1)} KB`);
console.log('🚨 Y despues MIRARLO: que las seis filas corran y que ninguna quede vacia.');
