// Abre una página del sitio en un Chrome headless propio y corre una expresión
// dentro de ella. Existe porque el panel del navegador de Claude Code no siempre
// está a la vista, y una pestaña que NO se pinta deja a los IntersectionObserver
// sin intersecciones: todo lo que se revela al bajar queda en opacidad 0 y
// cualquier medición miente diciendo que la página está rota.
//
//   node scripts/ver-en-chrome.mjs <url> "<expresion js>" [--scroll=1500] [--espera=2500]
//                                  [--foto=salida.png] [--ancho=1200] [--alto=900]
//
// La expresión se evalúa con `await` permitido y su valor se imprime en JSON.
// Con `--foto` además se guarda la captura de lo que se ve tras el scroll.
//
// 🚨 Headless de verdad, no `--headless=old`: el viejo no compone frames y
// vuelve a dejar los observadores mudos, que es justo lo que se quiere evitar.
// Requiere `ws`, prestado de una app de la familia como sharp — el sitio no
// tiene dependencias y así se queda.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VECINO =
  process.env.WS_DESDE ?? 'C:/Users/HP/Documents/claude/aprende-matematicas/node_modules/';
const WebSocket = createRequire(VECINO.endsWith('/') ? VECINO : VECINO + '/')('ws');

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const args = process.argv.slice(2);
const [URL, EXPR] = args.filter((a) => !a.startsWith('--'));
const num = (nombre, porDefecto) =>
  Number(args.find((a) => a.startsWith(`--${nombre}=`))?.split('=')[1] ?? porDefecto);
const SCROLL = num('scroll', 0);
const ESPERA = num('espera', 2500);
const PUERTO = num('puerto', 9333);
const ANCHO = num('ancho', 1200);
const ALTO = num('alto', 900);
const FOTO = args.find((a) => a.startsWith('--foto='))?.split('=')[1];

if (!URL || !EXPR) {
  console.error('Uso: node scripts/ver-en-chrome.mjs <url> "<expresion>" [--scroll=N] [--espera=ms]');
  process.exit(1);
}

const perfil = mkdtempSync(join(tmpdir(), 'chrome-ver-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PUERTO}`,
    `--user-data-dir=${perfil}`,
    `--window-size=${ANCHO},${ALTO}`,
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run',
    '--disable-extensions',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** El puerto tarda en abrir; se pregunta hasta que conteste, sin dormir a ciegas. */
async function esperarPuerto() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PUERTO}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await dormir(250);
  }
  throw new Error('Chrome no abrió el puerto de depuración');
}

function cliente(url) {
  const ws = new WebSocket(url, { maxPayload: 64 * 1024 * 1024 });
  let n = 0;
  const pend = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.id && pend.has(m.id)) {
      const { ok, mal } = pend.get(m.id);
      pend.delete(m.id);
      m.error ? mal(new Error(m.error.message)) : ok(m.result);
    }
  });
  const listo = new Promise((ok, mal) => {
    ws.on('open', ok);
    ws.on('error', mal);
  });
  return {
    listo,
    cerrar: () => ws.close(),
    enviar: (method, params = {}, sessionId) =>
      new Promise((ok, mal) => {
        const id = ++n;
        pend.set(id, { ok, mal });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      }),
  };
}

let salida = 0;
try {
  const c = cliente(await esperarPuerto());
  await c.listo;

  const { targetId } = await c.enviar('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await c.enviar('Target.attachToTarget', { targetId, flatten: true });
  const ev = async (expression) => {
    const r = await c.enviar(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'error en la página');
    return r.result.value;
  };

  await c.enviar('Page.enable', {}, sessionId);
  await c.enviar('Page.navigate', { url: URL }, sessionId);
  await dormir(1200);
  if (SCROLL) await ev(`window.scrollTo({top:${SCROLL},behavior:'instant'})`);
  await dormir(ESPERA);

  console.log(JSON.stringify(await ev(`(async () => (${EXPR}))()`), null, 2));

  if (FOTO) {
    const { data } = await c.enviar('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(FOTO, Buffer.from(data, 'base64'));
    console.error(FOTO);
  }
  c.cerrar();
} catch (e) {
  console.error(String(e.message ?? e));
  salida = 1;
} finally {
  chrome.kill();
  await dormir(400);
  try {
    rmSync(perfil, { recursive: true, force: true });
  } catch {}
  process.exit(salida);
}
