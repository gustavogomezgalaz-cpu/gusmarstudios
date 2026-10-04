/* El extremo CLARO del degradado del boton principal, medido.
 *
 *   node scripts/boton-contraste.mjs              # todas las paginas
 *   node scripts/boton-contraste.mjs cavila       # una
 *
 * ---------------------------------------------------------------------------
 * 🚨 POR QUE ESTE ARCHIVO EXISTE
 *
 * `.boton` vive en `app.css` y lo comparten todas las paginas de app, pero su
 * degradado estaba escrito A MANO en indigo —el de Matibu—. Mientras Matibu fue
 * la unica app en produccion no se noto: era la unica pagina con boton. El dia
 * que Cavila paso a produccion (07-09-2026) aparecio un boton indigo en una
 * pagina azul.
 *
 * 🚨 Y la salida NO es poner `var(--acento)`: el acento de una pagina es el
 * color de marca, elegido para leerse SOBRE EL FONDO OSCURO, no para llevar
 * letra blanca encima. Medido: blanco sobre el #7C80FF de Matibu da 3,29:1 y
 * sobre el #5E9DF0 de Cavila da 2,78:1. AA pide 4,5:1. Un boton con el acento
 * puro es ilegible en las dos.
 *
 * Asi que el extremo claro es el acento OSCURECIDO justo lo necesario, y este
 * script dice cuanto. El oscurecido se hace en el espacio sRGB por un factor
 * unico a los tres canales, que conserva el tono: el color sigue siendo el de
 * la marca, mas apagado.
 *
 * 🚨 PERO OSCURECER NO ES LA UNICA SALIDA, Y A VECES ES LA MALA. La letra del
 * boton no tiene por que ser blanca. Con letra OSCURA el acento no se toca, y
 * en las paletas claras —las doradas— es la unica salida razonable: el dorado
 * de Cavila con blanco da 2,39:1 y para llegar a 4,5 hay que oscurecerlo hasta
 * #95701F, que ya es el boton de Cronobu; con letra noche el mismo dorado da
 * 7,23:1. Por eso cada linea trae LAS DOS medidas, y la pagina elige con
 * `--boton-letra` (ver el comentario de `.boton` en app.css).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** AA para texto grande es 3:1 y para normal 4,5:1. El boton lleva 16px en
 *  negrita, que NO es texto grande (eso empieza en 18,66px negrita). Va 4,5. */
const MINIMO = 4.5;

const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const aHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0').toUpperCase()).join('');

/** Luminancia relativa, WCAG 2.1. */
function luz([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** La letra oscura de la familia: el fondo noche de las apps. */
const NOCHE = '#181833';

/** Contraste entre dos colores, en cualquier orden. */
function entre(a, b) {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Contraste contra el blanco, que es la letra del boton salvo que la pagina
 *  declare `--boton-letra`. Es el que usa la busqueda de abajo. */
const contraste = (c) => 1.05 / (luz(c) + 0.05);

/**
 * El color mas CLARO —o sea, el menos oscurecido— que aun llega al minimo.
 * Se busca bajando de 1 a 0 en pasos de 1/255, que es la resolucion real del
 * canal: afinar mas devolveria decimales que el navegador redondea igual.
 */
function oscurecerHasta(hex, minimo) {
  const base = aRgb(hex);
  for (let k = 255; k > 0; k--) {
    const c = base.map((v) => (v * k) / 255);
    if (contraste(c) >= minimo) return { hex: aHex(c), ratio: contraste(c), k: k / 255 };
  }
  return null;
}

const paginas = readdirSync(RAIZ).filter((d) => {
  try { return statSync(join(RAIZ, d)).isDirectory() && readdirSync(join(RAIZ, d)).includes('index.html'); }
  catch { return false; }
});

const soloEsta = (process.argv[2] || '').toLowerCase();

for (const p of paginas) {
  if (soloEsta && p !== soloEsta) continue;
  const html = readFileSync(join(RAIZ, p, 'index.html'), 'utf8');
  const m = /--acento:\s*(#[0-9A-Fa-f]{6})\s*;\s*--acento-hondo:\s*(#[0-9A-Fa-f]{6})/.exec(html);
  if (!m) continue;
  const [, acento, hondo] = m;
  const usa = /class="boton"/.test(html);

  // Lo que la pagina ya decidio, si decidio algo.
  const letra = (/--boton-letra:\s*(#[0-9A-Fa-f]{6})/.exec(html) || [, '#FFFFFF'])[1];
  const puesto = (n) => {
    const x = new RegExp(`--boton-${n}:\\s*(#[0-9A-Fa-f]{6})`).exec(html);
    return x ? x[1] : null;
  };

  const fila = (nombre, hex) => {
    const cb = entre(aRgb(hex), aRgb('#FFFFFF'));
    const cn = entre(aRgb(hex), aRgb(NOCHE));
    const marca = (c) => (c >= MINIMO ? 'OK' : '🚨');
    return `  ${nombre.padEnd(14)} ${hex}  blanca ${cb.toFixed(2)}:1 ${marca(cb)}   noche ${cn.toFixed(2)}:1 ${marca(cn)}`;
  };

  console.log(`${p}${usa ? '' : '  (todavia sin boton)'}   letra de hoy: ${letra}`);
  console.log(fila('--acento', acento));
  console.log(fila('--acento-hondo', hondo));
  for (const n of ['claro', 'hondo']) {
    const hex = puesto(n);
    if (hex) console.log(fila(`--boton-${n}`, hex));
  }
  /* Las dos salidas solo se ofrecen a quien no haya elegido todavia: en una
     pagina que ya puso su letra noche serian ruido, no aviso. */
  if (letra.toUpperCase() === '#FFFFFF') {
    const claro = oscurecerHasta(acento, MINIMO);
    console.log(`  con letra blanca, el extremo claro es ${claro.hex}  ${claro.ratio.toFixed(2)}:1   (el acento al ${(claro.k * 100).toFixed(0)}%)`);
    if (entre(aRgb(acento), aRgb(NOCHE)) >= MINIMO) {
      console.log(`  con letra noche el acento #${acento.slice(1)} sirve TAL CUAL, sin oscurecer: --boton-letra:${NOCHE}`);
    }
  }
  console.log();
}
