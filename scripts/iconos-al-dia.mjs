/* Compara los iconos de la landing con el icono REAL de cada app y, si cambio,
 * lo rehace.
 *
 * 🚨 CADA APP TIENE SU ICONO EN DOS SITIOS, y el segundo es el que se olvida:
 *   · `iconos/<app>.webp` (256) — la tarjeta de la portada y el mosaico
 *   · `<app>/icono.webp`  (320) — el heroe de su propia pagina
 * Son archivos distintos y envejecen por separado. El 01-10-2026 se arreglaron
 * los de la portada y los de las paginas de Lunabu y Dilo Jugando se quedaron
 * viejos: la portada mostraba el icono nuevo y la pagina de al lado el viejo.
 *
 * 🚨 Y hay un tercero que NO se arregla aca: `<app>/og.png` lleva el icono
 * INCRUSTADO, asi que al cambiar `<app>/icono.webp` hay que volver a correr
 * `node scripts/og-app.mjs`. Este guion lo recuerda al final.
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

const COMPARA = 256; // el lado al que se igualan los dos para medir la diferencia

/* 🚨 HAY TRES BANDAS, NO DOS, Y LA DE EN MEDIO SE GANO A GOLPES.
 *
 * Con un solo umbral en 2 el guion daba por CAMBIADOS a Dilo Jugando (2,42 y
 * 2,38) y a Dormibu (4,31), y el 04-10-2026 se miraron los dos puestos uno al
 * lado del otro: son el MISMO dibujo. Lo que mide ahi no es arte distinto, es
 * el remuestreo —1024 px a 256— y la recompresion a webp. Los que de verdad son
 * iguales caen entre 1,20 y 1,95, asi que el margen es estrecho y un umbral
 * seco en 2 convierte ruido en tarea.
 *
 * Pero subirlo sin mas esconderia un cambio de verdad pequeño. Por eso se parte
 * en tres y la de en medio se MIRA, que es lo unico que decide:
 *   < 2    iguales
 *   2 a 6  sospechoso: se mira, no se reescribe solo
 *   > 6    cambio de verdad
 */
const UMBRAL = 6; // diferencia media por canal que ya es otro dibujo
const SOSPECHA = 2; // de aqui hasta UMBRAL: mirarlos antes de tocar
const escribir = process.argv.includes('--escribir');

const aRaw = (buf) =>
  sharp(buf).resize(COMPARA, COMPARA, { fit: 'fill' }).removeAlpha().raw().toBuffer();

const cambios = [];
const sospechosos = [];
const iguales = [];
const sinFuente = [];

for (const [app, repo] of Object.entries(APPS)) {
  const carpeta = join(TALLER, repo, 'assets');
  const fuente = ['icon.png', 'icono.png', 'icon-base.png']
    .map((n) => join(carpeta, n))
    .find(existsSync);
  if (!fuente) { sinFuente.push(`${app} (no hay assets/icon.png en ${repo}/)`); continue; }

  // Los dos sitios. El de la pagina propia solo existe si la app tiene pagina.
  const sitios = [
    { destino: join(RAIZ, 'iconos', `${app}.webp`), lado: 256, nombre: `iconos/${app}.webp`, siempre: true },
    { destino: join(RAIZ, app, 'icono.webp'), lado: 320, nombre: `${app}/icono.webp`, siempre: false },
  ];

  for (const sitio of sitios) {
    if (!existsSync(sitio.destino)) {
      if (sitio.siempre) cambios.push({ app, fuente, ...sitio, dif: Infinity, nuevo: true });
      continue;
    }
    const [a, b] = await Promise.all([aRaw(readFileSync(fuente)), aRaw(readFileSync(sitio.destino))]);
    let suma = 0;
    for (let i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
    const dif = suma / a.length;

    if (dif > UMBRAL) cambios.push({ app, fuente, ...sitio, dif });
    else if (dif > SOSPECHA) sospechosos.push({ app, fuente, ...sitio, dif });
    else iguales.push(`${sitio.nombre} (${dif.toFixed(2)})`);
  }
}

console.log(`\nIguales (${iguales.length}): ${iguales.join(', ') || '—'}`);
if (sinFuente.length) console.log(`\nSin fuente (${sinFuente.length}):\n  ${sinFuente.join('\n  ')}`);

if (sospechosos.length) {
  console.log(`\nSOSPECHOSOS (${sospechosos.length}) — entre ${SOSPECHA} y ${UMBRAL}:`);
  for (const s of sospechosos) console.log(`  ${s.nombre.padEnd(24)} dif ${s.dif.toFixed(2)}`);
  console.log('  A esta altura casi siempre es el remuestreo y la recompresion, no otro');
  console.log('  dibujo. MIRARLOS uno al lado del otro antes de reescribir nada; con');
  console.log('  --escribir NO se tocan.');
}

if (!cambios.length) { console.log('\nNingun icono del sitio es un dibujo distinto al de su app.'); process.exit(0); }

console.log(`\nCAMBIARON (${cambios.length}):`);
for (const c of cambios) console.log(`  ${c.nombre.padEnd(24)} dif ${c.nuevo ? '(no estaba)' : c.dif.toFixed(2)}`);

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
    .resize(c.lado, c.lado, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(c.destino);
  const ahora = readFileSync(c.destino).length;
  console.log(`  ${c.nombre.padEnd(24)} ${(antes / 1024).toFixed(1)} KB -> ${(ahora / 1024).toFixed(1)} KB`);
}

const conPagina = [...new Set(cambios.filter((c) => !c.siempre).map((c) => c.app))];
if (conPagina.length) {
  console.log(`\n🚨 ${conPagina.join(', ')} cambio el icono de su PAGINA, y su og.png lo lleva`);
  console.log('   incrustado. Hay que rehacerlo o el enlace se comparte con el icono viejo:');
  console.log('     node scripts/og-app.mjs');
}
console.log('\nListo. 🚨 Mirarlos antes de commitear.');
