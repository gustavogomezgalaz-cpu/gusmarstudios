// La imagen de compartir (1200×630) de cada página de app.
//
//   node scripts/og-app.mjs            → escribe <app>/og.png de todas
//
// Es lo que se ve cuando alguien pega el enlace en WhatsApp, y por eso NO se
// puede dejar sin hacer: sin `og:image` propio, cada app comparte la miniatura
// del estudio y las nueve se ven iguales en el chat.
//
// 🚨 No compartir un enlace recién publicado: mientras GitHub Pages reconstruye,
// los archivos dan 404 y el caché de Meta guarda la miniatura rota por días. Ya
// pasó con la portada. Se purga en el Sharing Debugger con "Scrape Again".
//
// Se dibuja con SVG y se rasteriza con sharp —prestado de una app de la familia,
// ver capturas-web.mjs—: el icono va incrustado como imagen, no redibujado.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const VECINO =
  process.env.SHARP_DESDE ?? 'C:/Users/HP/Documents/claude/aprende-matematicas/node_modules/';
const sharp = createRequire(VECINO.endsWith('/') ? VECINO : VECINO + '/')('sharp');

// Los textos son los mismos que el <h1> y la bajada de cada página: si una
// cambia, la otra tiene que cambiar con ella.
const APPS = [
  {
    dir: 'lunabu',
    nombre: 'Lunabu',
    bajada: 'Todavía no lee, y ya aprende',
    detalle: '21 mundos nombrados en voz alta · 2 a 5 años',
    tono: '#F0784A',
    hondo: '#C64A1E',
  },
  {
    dir: 'anticipa',
    nombre: 'Anticipa',
    bajada: 'Que sepa qué viene ahora y después',
    detalle: 'Agenda visual de rutinas · TDAH y TEA',
    tono: '#5A9DBA',
    hondo: '#2C5464',
  },
  {
    dir: 'cavila',
    nombre: 'Cavila',
    bajada: 'Aprende a pensar, no a responder',
    detalle: '66 niveles de lógica y criterio · 6 a 12 años',
    tono: '#5E9DF0',
    hondo: '#2A6FCC',
  },
];

/** Los `&` y `<` de un texto rompen el SVG en silencio: se escapan siempre. */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const app of APPS) {
  // 🚨 El icono se pasa a PNG antes de incrustarlo. En WEBP el `<image>` del SVG
  // se renderiza VACÍO —sin error, sin aviso: el resto de la imagen sale
  // perfecto y el icono simplemente no está—, porque el rasterizador de SVG no
  // decodifica webp aunque sharp sí sepa leerlo.
  const icono = (await sharp(`${app.dir}/icono.webp`).png().toBuffer()).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630">
  <defs>
    <radialGradient id="halo" cx="76%" cy="26%" r="62%">
      <stop offset="0%" stop-color="${app.tono}" stop-opacity=".38"/>
      <stop offset="100%" stop-color="${app.tono}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pie" cx="12%" cy="92%" r="55%">
      <stop offset="0%" stop-color="${app.hondo}" stop-opacity=".34"/>
      <stop offset="100%" stop-color="${app.hondo}" stop-opacity="0"/>
    </radialGradient>
    <!-- El icono se recorta redondeado como en Android: cuadrado se lee como un
         recorte de pantalla y no como el icono de una app. -->
    <clipPath id="redondo"><rect x="880" y="196" width="236" height="236" rx="52"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="#0A0B14"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <rect width="1200" height="630" fill="url(#pie)"/>

  <g transform="translate(88 76) scale(1.05)">
    <g transform="translate(32 32)">
      <g transform="translate(-11 1) rotate(-11)"><rect x="-12" y="-12" width="24" height="24" rx="6.8" fill="#C08B0A" stroke="#0A0B14" stroke-width="3"/></g>
      <g transform="translate(11 1) rotate(11)"><rect x="-12" y="-12" width="24" height="24" rx="6.8" fill="#12A0AC" stroke="#0A0B14" stroke-width="3"/></g>
      <g transform="translate(0 -2)"><rect x="-13" y="-13" width="26" height="26" rx="7.4" fill="#7C80FF" stroke="#0A0B14" stroke-width="3"/></g>
    </g>
  </g>
  <text x="174" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="#A7ACC6">GusMar Studios</text>

  <image clip-path="url(#redondo)" x="880" y="196" width="236" height="236" xlink:href="data:image/png;base64,${icono}"/>

  <text x="88" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="88" font-weight="700" fill="#EDEEF6">${esc(app.nombre)}</text>
  <text x="88" y="368" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="600" fill="${app.tono}">${esc(app.bajada)}</text>
  <text x="88" y="438" font-family="Segoe UI, Arial, sans-serif" font-size="27" fill="#A7ACC6">${esc(app.detalle)}</text>

  <rect x="88" y="510" width="110" height="4" rx="2" fill="${app.tono}"/>
  <text x="88" y="566" font-family="Consolas, monospace" font-size="23" fill="#8890AD">gusmarstudios.com/${app.dir}</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${app.dir}/og.png`);
  console.log(`${app.dir}/og.png`);
}
