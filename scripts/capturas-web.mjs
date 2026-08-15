// Saca las capturas de la web a partir de las capturas de TIENDA de cada app.
//
//   node scripts/capturas-web.mjs <carpeta-de-capturas> <carpeta-destino>
//
// Las de tienda vienen con banda de titular y el teléfono dibujado sobre un
// fondo de color; la web las quiere PURAS, como las de Matibu, porque en la
// página ya van dentro de un marco de teléfono dibujado con CSS. Poner una
// dentro de otra se ve como una foto de una foto.
//
// 🚨 El recorte NO se escribe a mano por app. El generador de cada app coloca el
// teléfono donde quiere —y cambió entre versiones—, así que un rectángulo fijo
// funciona hasta que deja de hacerlo EN SILENCIO: la captura sale corrida y no
// falla nada. Acá se MIDE: se toma el color de la esquina como fondo y se busca
// la primera fila y columna que dejan de ser ese color.
//
// Requiere `sharp`, que NO se instala en este repo —el sitio no tiene
// dependencias y así se queda—: se toma prestado el de una app de la familia.
// Y se pide con `createRequire` y no con un import normal, porque un import ESM
// **ignora NODE_PATH** y falla por más que la variable esté puesta.
import { readdirSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { createRequire } from 'node:module';

const VECINO =
  process.env.SHARP_DESDE ?? 'C:/Users/HP/Documents/claude/aprende-matematicas/node_modules/';
const sharp = createRequire(VECINO.endsWith('/') ? VECINO : VECINO + '/')('sharp');

const args = process.argv.slice(2);
const [ORIGEN, DESTINO] = args.filter((a) => !a.startsWith('--'));
// 🚨 La caja a mano existe porque la medición automática NO siempre puede.
// Necesita un fondo de color plano alrededor del teléfono; el de Cavila tiene
// degradado y estrellas, así que ahí no hay "color del fondo" que buscar y el
// barrido se come el titular entero. En ese caso se mide una vez a ojo, se pasa
// acá y queda escrito en el README con la fecha — que es lo contrario de
// adivinarla.
const CAJA_MANO = args.find((a) => a.startsWith('--caja='))?.split('=')[1];
if (!ORIGEN || !DESTINO) {
  console.error('Uso: node scripts/capturas-web.mjs <origen> <destino> [--caja=izq,arriba,der,abajo]');
  process.exit(1);
}

/** ¿Son el mismo color, con holgura? El degradado del fondo mueve un par de puntos. */
const igual = (a, b, i, j, tol = 10) =>
  Math.abs(a[i] - b[j]) <= tol && Math.abs(a[i + 1] - b[j + 1]) <= tol && Math.abs(a[i + 2] - b[j + 2]) <= tol;

/**
 * El rectángulo del teléfono dentro de la captura de tienda.
 *
 * Se recorre desde cada borde hacia adentro mientras la fila (o columna) entera
 * siga siendo del color del fondo. La primera que no lo sea es el marco.
 *
 * El `inset` que se suma después no es cosmético: el marco tiene esquinas
 * redondeadas y sombra, y sin él la captura sale con una uña de color del fondo
 * en las cuatro esquinas.
 */
function recorte(datos, ancho, alto, canales) {
  const px = (x, y) => (y * ancho + x) * canales;
  const fondo = datos.slice(px(2, 2), px(2, 2) + 3);
  const filaEsFondo = (y) => {
    for (let x = 0; x < ancho; x += 3) if (!igual(datos, fondo, px(x, y), 0)) return false;
    return true;
  };
  const colEsFondo = (x) => {
    for (let y = 0; y < alto; y += 3) if (!igual(datos, fondo, px(x, y), 0)) return false;
    return true;
  };
  let arriba = 0, abajo = alto - 1, izq = 0, der = ancho - 1;
  while (arriba < alto - 1 && filaEsFondo(arriba)) arriba++;
  while (abajo > arriba && filaEsFondo(abajo)) abajo--;
  while (izq < ancho - 1 && colEsFondo(izq)) izq++;
  while (der > izq && colEsFondo(der)) der--;
  return { arriba, abajo, izq, der };
}

/** La caja del teléfono en UNA captura, saltando la franja del titular. */
async function cajaDe(ruta) {
  const { data, info } = await sharp(ruta).raw().toBuffer({ resolveWithObject: true });
  const r = recorte(data, info.width, info.height, info.channels);
  // El titular de la banda vive ARRIBA del teléfono, así que el primer borde que
  // encuentra la medición es el TEXTO, no el marco. Se descarta esa franja y se
  // vuelve a medir por debajo de ella.
  if (r.arriba >= info.height * 0.25) return r;
  const desde = Math.round(info.height * 0.14);
  const rec = await sharp(ruta)
    .extract({ left: 0, top: desde, width: info.width, height: info.height - desde })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const r2 = recorte(rec.data, rec.info.width, rec.info.height, rec.info.channels);
  return { arriba: r2.arriba + desde, abajo: r2.abajo + desde, izq: r2.izq, der: r2.der };
}

/** La mediana, que es lo que hace inmune a la captura rara. */
const mediana = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

mkdirSync(DESTINO, { recursive: true });
const archivos = readdirSync(ORIGEN).filter((f) => /\.png$/i.test(f)).sort();

// 🚨 La caja se mide en TODAS y se usa la MEDIANA, no la de cada una por su
// cuenta. El teléfono está en el mismo sitio en las nueve capturas de una app,
// así que cualquier diferencia es un error de medición — y los hay: en la
// portada de Lunabu el botón "Empezar" es del MISMO naranja que el fondo, así
// que las columnas que lo cruzan se leen como fondo y el recorte sale angosto y
// corrido. Con la mediana, una captura tramposa no arrastra a las demás.
let caja;
if (CAJA_MANO) {
  const [izq, arriba, der, abajo] = CAJA_MANO.split(',').map(Number);
  caja = { izq, arriba, der, abajo };
  console.log(`caja dada a mano: ${izq},${arriba} → ${der},${abajo}`);
} else {
  const cajas = [];
  for (const a of archivos) cajas.push(await cajaDe(join(ORIGEN, a)));
  caja = {
    arriba: mediana(cajas.map((c) => c.arriba)),
    abajo: mediana(cajas.map((c) => c.abajo)),
    izq: mediana(cajas.map((c) => c.izq)),
    der: mediana(cajas.map((c) => c.der)),
  };
  const raras = cajas.filter((c) => Math.abs(c.izq - caja.izq) > 4 || Math.abs(c.arriba - caja.arriba) > 4).length;
  if (raras) console.log(`(${raras} de ${archivos.length} midieron distinto; manda la mediana)`);
}

// El inset va en PROPORCIÓN al ancho del teléfono, no en píxeles fijos: el marco
// tiene esquinas redondeadas grandes y con 6 px la captura salía con una uña del
// color del fondo en las cuatro esquinas. Medido, 2,4% las limpia.
const inset = Math.round((caja.der - caja.izq) * 0.024);
const left = caja.izq + inset;
const top = caja.arriba + inset;
const width = caja.der - caja.izq + 1 - inset * 2;
const height = caja.abajo - caja.arriba + 1 - inset * 2;
if (width < 200 || height < 300) {
  console.error(`⚠️ el recorte medido es ${width}×${height}, demasiado chico. Revisar a ojo.`);
  process.exit(1);
}
// Guardia de proporción: un teléfono anda por 0,46 de ancho/alto. Si sale muy
// lejos, la medición agarró otra cosa —el lienzo entero, el titular— y el
// síntoma sería MUDO: capturas torcidas publicadas sin que nada fallara. Es
// aviso y no corte, porque hay capturas legítimas donde el teléfono se sale del
// lienzo por abajo (Cavila) y ahí la proporción es rara de verdad.
const prop = width / height;
if (prop < 0.40 || prop > 0.58) {
  console.log(`⚠️ proporción ${prop.toFixed(2)} (un teléfono es ~0,46): mirá el resultado antes de publicarlo.`);
}
console.log(`recorte: ${width}×${height} desde (${left},${top})`);

for (const archivo of archivos) {
  const salida = join(DESTINO, basename(archivo, extname(archivo)) + '.webp');
  await sharp(join(ORIGEN, archivo))
    .extract({ left, top, width, height })
    .resize({ width: 780 })
    .webp({ quality: 82 })
    .toFile(salida);
  console.log(`  ${archivo} -> ${basename(salida)}`);
}
