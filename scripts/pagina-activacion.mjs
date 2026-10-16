// Genera /a/<app>/index.html: para ESCRIBIR a mano el código del QR («¿No te funciona la
// cámara?»). Con el estilo del sitio (/app.css) y el color de cada app. Al completar el código
// lleva a la página de la app con ?c=…&m=pagar, que muestra la tarjeta y abre la app (codigo.js).
// Si llega con ?c= (enlaces viejos), redirige directo. Sin índice: es una herramienta, no vitrina.
import fs from 'node:fs';
import path from 'node:path';

const APPS = [
  { clave: 'matibu', nombre: 'Matibu', acento: '#7C80FF', hondo: '#4247D6', claro: '#6669D1' },
  { clave: 'anticipa', nombre: 'Anticipa', acento: '#5A9DBA', hondo: '#2C5464', claro: '#487D94' },
];

const html = (a) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${a.nombre} · Escribe tu código</title>
<meta name="theme-color" content="${a.hondo}">
<link rel="icon" href="/marca.svg" type="image/svg+xml">
<link rel="stylesheet" href="/app.css">
<style>
  :root { --acento:${a.acento}; --acento-hondo:${a.hondo}; --boton-claro:${a.claro}; }
  .escribir { min-height:100svh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; padding:32px 22px; text-align:center; }
  .escribir .icono-app { width:96px; height:96px; border-radius:24px; box-shadow:0 18px 50px rgba(0,0,0,.5); }
  .escribir h1 { margin:0; font-family:var(--display); font-weight:700; font-size:clamp(26px,7vw,34px); text-wrap:balance; }
  .escribir p { margin:0; color:var(--suave); line-height:1.6; max-width:34ch; }
  .escribir form { width:100%; max-width:380px; display:flex; flex-direction:column; gap:14px; margin-top:6px; }
  .escribir input {
    width:100%; padding:16px 12px; border-radius:16px; text-align:center;
    font-family:var(--mono); font-size:30px; letter-spacing:.16em; text-transform:uppercase; color:#fff;
    background:var(--tarjeta); border:2px dashed color-mix(in srgb, var(--acento) 55%, transparent);
  }
  .escribir input:focus-visible { outline:2px solid var(--acento); outline-offset:3px; }
  .escribir .boton { width:100%; }
  .escribir .boton[aria-disabled="true"] { opacity:.45; pointer-events:none; }
  .escribir .firma { color:var(--tenue); font-size:13px; }
</style>
</head>
<body>
<main class="escribir">
  <img class="icono-app" src="/${a.clave}/icono.webp" alt="" width="96" height="96">
  <h1>Escribe el código de ${a.nombre}</h1>
  <p>Son 8 letras y números, los que ves en el otro aparato debajo del QR.</p>
  <form id="f" novalidate>
    <input id="c" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="ABCD-2345" aria-label="Código">
    <a class="boton" id="ir" href="#" aria-disabled="true">Continuar</a>
  </form>
  <p class="firma">Una app de GusMar Studios</p>
</main>
<script>
(function () {
  var destino = '/${a.clave}/';
  function normalizar(v) {
    var s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : null;
  }
  var q = new URLSearchParams(location.search);
  var ya = normalizar(q.get('c'));
  if (ya) { location.replace(destino + '?c=' + ya + '&m=' + (q.get('m') === 'canjear' ? 'canjear' : 'pagar')); return; }
  var c = document.getElementById('c'), ir = document.getElementById('ir');
  function actualizar() {
    var n = normalizar(c.value);
    ir.setAttribute('aria-disabled', n ? 'false' : 'true');
    ir.href = n ? destino + '?c=' + n + '&m=pagar' : '#';
  }
  c.addEventListener('input', actualizar);
  document.getElementById('f').addEventListener('submit', function (e) { e.preventDefault(); if (normalizar(c.value)) location.href = ir.href; });
  c.focus();
})();
</script>
</body>
</html>
`;

for (const a of APPS) {
  const dir = path.join(import.meta.dirname, '..', 'a', a.clave);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html(a));
  console.log('ok', a.clave);
}
