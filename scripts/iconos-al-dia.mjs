/* Compara los iconos de la landing con el icono REAL de cada app y, si cambio,
 * lo rehace.
 *
 *   node scripts/iconos-al-dia.mjs              mira y cuenta, no toca nada
 *   node scripts/iconos-al-dia.mjs --escribir   rehace los que cambiaron
 *
 * 🚨 NO COMPARA FECHAS, COMPARA PIXELES. La fecha del archivo miente en las dos
 * direcciones: una copia mas nueva puede ser el mismo dibujo recomprimido, y una
 * mas vieja puede seguir siendo la buena. Se decodifican los dos a 256x256 RGBA
 * y se mide la diferencia media por canal. Asi fue como se encontro que el icono
 * de Dilo Jugando llevaba meses viejo en la portada: por fecha habia cinco
 * sospechosos y de verdad habia cambiado uno.
 *
 * 🚨 Las fuentes viven FUERA de este repo, en el repo de cada app. Si la carpeta
 * no esta (otra maquina, un worktree, un clon suelto), esto avisa y sigue: no
 * puede fallar por mirar algo que no es suyo.
 *
 * 🚨 El nombre del archivo fuente NO es el mismo en las diez apps: unas lo
 * llaman icon.png y otras icono.png. Se prueban los dos.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const TALLER = resolve(RAIZ, '..');

/* sharp no es una dependencia de este repo —la landing no tiene ninguna, y es a
   proposito— asi que se toma prestado. La ruta tiene que ser de WINDOWS
   (C:/Users/...): una ruta POSIX /c/Users/... se vuelve C:\c\Users\... y no
   resuelve. Se pasa por SHARP_DESDE. */
const desde = process.env.SHARP_DESDE;
let sharp;
try {
  sharp = createRequire(desde ? join(desde, 'x.js') : import.meta.url)('sharp');
} catch {
  console.error('No encontre sharp. Este repo no lo tiene a proposito: se presta.');
  console.error('  SHARP_DESDE=C:/ruta/a/una/carpeta/con/node_modules node scripts/iconos-al-dia.mjs');
  process.exit(1);
}

// El repo de cada app. Son carpetas hermanas de esta; el nombre no se parece al
// de la app porque varias se renombraron despues de crear el repo.
const APPS = {
  matibu: 'aprende-matematicas',
  cavila: 'el-profe-gus',
  lunabu: 'lunabu',
  anticipa: 'agenda-visual',
  dilojugando: 'fonoaudiologo-virtual',
  cronobu: 'historia',
  silabu: 'aprende-a-leer',
  palabu: 'lenguaje',
  terrabu: 'ciencias',
  dormibu: 'cuentos-dormir',
};

const LADO = 256;
const UMBRAL = 2; // diferencia media por canal que ya se ve a simple vista
const escribir = process.argv.includes('--escribir');

const aRaw = (buf) =>
  sharp(buf).resize(LADO, LADO, { fit: 'fill' }).removeAlpha().raw().toBuffer();

const cambios = [];
const iguales = [];
const sinFuente = [];

for (const [app, repo] of Object.entries(APPS)) {
  const carpeta = join(TALLER, repo, 'assets');
  const fuente = ['icon.png', 'icono.png', 'icon-base.png']
    .map((n) => join(carpeta, n))
    .find(existsSync);
  const destino = join(RAIZ, 'iconos', `${app}.webp`);

  if (!fuente) { sinFuente.push(`${app} (no hay assets/icon.png en ${repo}/)`); continue; }
  if (!existsSync(destino)) { cambios.push({ app, fuente, destino, dif: Infinity, nuevo: true }); continue; }

  const [a, b] = await Promise.all([aRaw(readFileSync(fuente)), aRaw(readFileSync(destino))]);
  let suma = 0;
  for (let i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
  const dif = suma / a.length;

  if (dif > UMBRAL) cambios.push({ app, fuente, destino, dif });
  else iguales.push(`${app} (dif ${dif.toFixed(2)})`);
}

console.log(`\nIguales (${iguales.length}): ${iguales.join(', ') || '—'}`);
if (sinFuente.length) console.log(`\nSin fuente (${sinFuente.length}):\n  ${sinFuente.join('\n  ')}`);

if (!cambios.length) { console.log('\nTodos los iconos de la portada son el icono real de su app.'); process.exit(0); }

console.log(`\nCAMBIARON (${cambios.length}):`);
for (const c of cambios) console.log(`  ${c.app.padEnd(12)} dif ${c.nuevo ? '(no estaba)' : c.dif.toFixed(2)}`);

if (!escribir) {
  console.log('\nNo se toco nada. Para rehacerlos:');
  console.log('  node scripts/iconos-al-dia.mjs --escribir');
  console.log('\n🚨 Y despues MIRARLOS: la diferencia dice que cambio, no que el nuevo');
  console.log('   este bien. Un icono a medio exportar tambien "cambia".');
  process.exit(0);
}

for (const c of cambios) {
  const antes = existsSync(c.destino) ? readFileSync(c.destino).length : 0;
  await sharp(readFileSync(c.fuente))
    .resize(LADO, LADO, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(c.destino);
  const ahora = readFileSync(c.destino).length;
  console.log(`  ${c.app.padEnd(12)} ${(antes / 1024).toFixed(1)} KB -> ${(ahora / 1024).toFixed(1)} KB`);
}
console.log('\nListo. 🚨 Mirarlos antes de commitear.');
