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

/** Contraste contra el blanco, que es el color de la letra del boton. */
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

  const cAcento = contraste(aRgb(acento));
  const cHondo = contraste(aRgb(hondo));
  const claro = oscurecerHasta(acento, MINIMO);

  console.log(`${p}${usa ? '' : '  (todavia sin boton)'}`);
  console.log(`  --acento       ${acento}  blanco encima: ${cAcento.toFixed(2)}:1  ${cAcento >= MINIMO ? 'OK' : '🚨 no llega a AA'}`);
  console.log(`  --acento-hondo ${hondo}  blanco encima: ${cHondo.toFixed(2)}:1  ${cHondo >= MINIMO ? 'OK' : '🚨 no llega a AA'}`);
  console.log(`  extremo claro  ${claro.hex}  ${claro.ratio.toFixed(2)}:1   (el acento al ${(claro.k * 100).toFixed(0)}%)`);
  console.log();
}
