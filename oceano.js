/* Océano profundo detrás de la portada.
   - Peces y medusas de línea luminosa, con los colores de la marca, nadando por detrás.
   - Tres peces-linterna (dorado, turquesa, índigo) se juntan cada tanto y forman el logo.
   - Un tiburón ballena cruza lento, al fondo.
   El mosaico de íconos no se toca: sigue con su flotado de siempre.
   Se apaga sola: menos movimiento → no arranca; fuera de pantalla o pestaña oculta → pausa. */
(function () {
  const escena = document.querySelector('.oceano-escena');
  const cv = escena && escena.querySelector('canvas');
  if (!cv) return;
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const QUIETO = params.has('quieto');           // cuadro fijo, para capturas
  if (menosMovimiento && !QUIETO) return;

  const ctx = cv.getContext('2d');
  const movil = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const FPS = movil ? 30 : 60;
  const TAU = Math.PI * 2;
  const MARCA = { oro: '#C08B0A', turq: '#12A0AC', indigo: '#7C80FF', menta: '#5EE7C6', lila: '#A9ACFF', tinta: '#0A0B14' };

  let W = 0, H = 0, DPR = 1, t = 0;
  let semilla = 11;
  const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const R = (a, b) => a + (b - a) * (QUIETO ? rnd() : Math.random());

  // dónde está el mosaico dentro del lienzo: el logo se arma en una casilla libre
  const mosaico = document.querySelector('.mosaico');
  let caja = null;
  function medirMosaico() {
    if (!mosaico) { caja = null; return; }
    const a = mosaico.getBoundingClientRect(), c = cv.getBoundingClientRect();
    caja = { x: a.left - c.left, y: a.top - c.top, w: a.width, h: a.height };
  }

  let peces = [], medusas = [], nieve = [], linternas = [], ballena = null, proxBallena = 12, proxLogo = 9, logo = null;
  function crear() {
    semilla = 11;
    const k = Math.min(1, W / 1400) * (movil ? 0.9 : 1);
    const n = movil ? 7 : 14;
    peces = [];
    for (let i = 0; i < n; i++) {
      const col = [MARCA.menta, MARCA.lila, MARCA.indigo][i % 3];
      peces.push({ x: R(0, W), y: R(H * 0.1, H * 0.9), vx: R(-1, 1), vy: R(-0.2, 0.2), L: R(18, 34) * (0.8 + k * 0.4), col, a: R(0.35, 0.7), wig: R(0, 6), tx: R(0, W), ty: R(0, H), cara: 1 });
    }
    medusas = [];
    for (let i = 0; i < (movil ? 1 : 2); i++) medusas.push({ x: R(W * 0.1, W * 0.9), y: R(H * 0.2, H * 0.9), r: R(14, 22), ph: R(0, TAU), col: i ? MARCA.menta : MARCA.lila });
    nieve = [];
    for (let i = 0; i < (movil ? 40 : 90); i++) nieve.push({ x: R(0, W), y: R(0, H), r: R(0.5, 1.6), v: R(0.05, 0.22), a: R(0.15, 0.55), p: R(0, TAU) });
    const tile = Math.max(18, Math.min(30, W / 48));
    linternas = [[MARCA.oro, -11, 1, -11, 12], [MARCA.turq, 11, 1, 11, 12], [MARCA.indigo, 0, -2, 0, 13]].map(([col, fx, fy, rotDeg, half]) => ({
      col, fx, fy, frot: rotDeg * Math.PI / 180, half, s: tile / 24,
      x: R(W * (movil ? 0.1 : 0.58), W * 0.92), y: R(H * 0.15, H * 0.85), vx: R(-0.6, 0.6), vy: R(-0.2, 0.2), rot: 0, wig: R(0, 6), tx: R(W * 0.6, W * 0.9), ty: R(0, H), cara: 1, forma: 0
    }));
  }

  // ---------- peces de línea ----------
  function dibujarPez(p) {
    const L = p.L, h = L * 0.42;
    const cola = Math.sin(p.wig) * 0.35;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.cara, 1);
    ctx.rotate(Math.atan2(p.vy, Math.abs(p.vx) + 0.01) * 0.5);
    ctx.globalAlpha = p.a;
    ctx.strokeStyle = p.col; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.quadraticCurveTo(L * 0.1, -h, -L * 0.3, 0);
    ctx.quadraticCurveTo(L * 0.1, h, L * 0.5, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-L * 0.3, 0);
    ctx.lineTo(-L * 0.55, -h * 0.7 + cola * h);
    ctx.lineTo(-L * 0.5, cola * h * 0.3);
    ctx.lineTo(-L * 0.55, h * 0.7 + cola * h);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(L * 0.3, -h * 0.12, 1.4, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = p.a * 0.12;
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(L * 0.05, 0, L * 0.5, h * 0.9, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function moverPez(p, dt) {
    const d = Math.hypot(p.tx - p.x, p.ty - p.y);
    if (d < 30 || R(0, 1) < 0.003) { p.tx = R(-W * 0.05, W * 1.05); p.ty = R(H * 0.08, H * 0.92); }
    p.vx += (p.tx - p.x) / (d + 1) * 0.025 * dt; p.vy += (p.ty - p.y) / (d + 1) * 0.02 * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 1.1) { p.vx *= 1.1 / sp; p.vy *= 1.1 / sp; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.99;
    if (Math.abs(p.vx) > 0.06) p.cara += ((p.vx > 0 ? 1 : -1) - p.cara) * Math.min(1, 0.12 * dt);
    p.wig += (0.12 + sp * 0.12) * dt;
    if (p.y < 10) p.vy += 0.05; if (p.y > H - 10) p.vy -= 0.05;
  }

  // ---------- medusas ----------
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function dibujarMedusa(m, dt) {
    const pul = (Math.sin(t * 1.4 + m.ph) + 1) / 2;
    m.y -= (0.04 + Math.max(0, Math.sin(t * 1.4 + m.ph)) * 0.3) * dt;
    m.x += Math.sin(t * 0.3 + m.ph) * 0.1 * dt;
    if (m.y < -m.r * 5) { m.y = H + m.r * 2; m.x = R(W * 0.1, W * 0.9); }
    const w = m.r * (1 - pul * 0.15), h = m.r * (0.7 + pul * 0.12);
    ctx.save(); ctx.translate(m.x, m.y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -h * 0.3, 0, 0, -h * 0.3, w * 3);
    g.addColorStop(0, hexA(m.col, 0.16)); g.addColorStop(1, hexA(m.col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -h * 0.3, w * 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(m.col, 0.75); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, Math.PI, 0); ctx.quadraticCurveTo(0, h * 0.25, -w, 0); ctx.stroke();
    ctx.strokeStyle = hexA(m.col, 0.4); ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x0 = (i / 4 - 0.5) * w * 1.4;
      ctx.beginPath(); ctx.moveTo(x0, 0);
      for (let k = 1; k <= 8; k++) ctx.lineTo(x0 + Math.sin(t * 2 + m.ph + k * 0.6 + i) * m.r * 0.15 * (k / 8), k * m.r * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- tiburón ballena, al fondo ----------
  function nuevaBallena() {
    const dir = R(0, 1) < 0.5 ? 1 : -1, L = Math.max(W * 0.55, 420);
    ballena = { dir, L, x: dir > 0 ? -L * 0.6 : W + L * 0.6, y: H * R(0.35, 0.65), ph: 0, puntos: [] };
    for (let i = 0; i < 70; i++) ballena.puntos.push([R(-0.36, 0.42), R(-0.4, 0.3), R(0, TAU)]);
  }
  function dibujarBallena(dt) {
    const b = ballena;
    b.x += b.dir * 0.55 * dt; b.ph += 0.025 * dt;
    const L = b.L, h = L * 0.16, cola = Math.sin(b.ph) * 0.12;
    const vis = Math.max(0, Math.min(1, (Math.min(b.x + L * 0.5, W - b.x + L * 0.5)) / (L * 0.6)));
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.dir, 1);
    ctx.globalAlpha = 0.55 * vis;
    const cuerpo = new Path2D();
    cuerpo.moveTo(L * 0.5, -h * 0.1);
    cuerpo.bezierCurveTo(L * 0.48, -h * 0.6, L * 0.1, -h * 0.75, -L * 0.38, -h * 0.12);
    cuerpo.lineTo(-L * 0.38, h * 0.1);
    cuerpo.bezierCurveTo(L * 0.1, h * 0.6, L * 0.46, h * 0.45, L * 0.5, -h * 0.1);
    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, 'rgba(38,46,92,0.9)'); g.addColorStop(1, 'rgba(16,20,44,0.9)');
    ctx.fillStyle = g; ctx.fill(cuerpo);
    ctx.fillStyle = 'rgba(38,46,92,0.9)';
    ctx.beginPath(); ctx.moveTo(L * 0.05, -h * 0.5); ctx.lineTo(-L * 0.06, -h * 1.15); ctx.lineTo(-L * 0.12, -h * 0.45); ctx.fill();
    ctx.save(); ctx.translate(-L * 0.38, 0); ctx.rotate(cola);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-L * 0.08, -h * 0.4, -L * 0.14, -h * 1.1); ctx.quadraticCurveTo(-L * 0.09, 0, -L * 0.12, h * 0.8); ctx.quadraticCurveTo(-L * 0.05, h * 0.2, 0, 0); ctx.fill();
    ctx.restore();
    // boca ancha y plana, y los puntos que brillan como estrellas
    ctx.strokeStyle = 'rgba(94,231,198,0.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(L * 0.5, h * 0.02); ctx.quadraticCurveTo(L * 0.44, h * 0.14, L * 0.36, h * 0.1); ctx.stroke();
    ctx.save(); ctx.clip(cuerpo); ctx.globalCompositeOperation = 'lighter';
    for (const [px, py, ph] of b.puntos) {
      ctx.fillStyle = `rgba(169,172,255,${0.35 + 0.35 * Math.sin(t * 1.5 + ph)})`;
      ctx.beginPath(); ctx.arc(px * L, py * h * 1.6, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    if ((b.dir > 0 && b.x > W + L * 0.7) || (b.dir < 0 && b.x < -L * 0.7)) { ballena = null; proxBallena = t + R(35, 60); }
  }

  // ---------- los tres peces-linterna que forman el logo ----------
  function dibujarLinterna(l) {
    const S = l.s, half = l.half * S, rr = (l.half === 13 ? 7.4 : 6.8) * S;
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 3.2);
    g.addColorStop(0, hexA(l.col, 0.22 + 0.2 * l.forma)); g.addColorStop(1, hexA(l.col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, half * 3.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // la cola desaparece cuando se vuelven ficha
    if (l.forma < 0.98) {
      ctx.save(); ctx.scale(l.cara, 1);
      ctx.globalAlpha = 1 - l.forma;
      const c = Math.sin(l.wig) * 0.4;
      ctx.fillStyle = l.col;
      ctx.beginPath(); ctx.moveTo(-half * 0.8, 0); ctx.lineTo(-half * 1.9, -half * 0.8 + c * half); ctx.lineTo(-half * 1.6, c * half * 0.3); ctx.lineTo(-half * 1.9, half * 0.8 + c * half); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // cuerpo: ficha redondeada con borde de tinta, como en el logo
    ctx.fillStyle = l.col; ctx.strokeStyle = MARCA.tinta; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.roundRect(-half, -half, half * 2, half * 2, rr); ctx.fill(); ctx.stroke();
    if (l.forma < 0.98) {
      ctx.globalAlpha = 1 - l.forma;
      ctx.fillStyle = MARCA.tinta; ctx.beginPath(); ctx.arc(half * 0.45 * l.cara, -half * 0.25, 2.2 * S, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function lugarDelLogo() {
    const tam = linternas[0].s * 70;
    // a la derecha del mosaico si hay aire; si no, en su casilla vacía de abajo a la derecha
    if (caja && W - (caja.x + caja.w) > tam * 1.8) return [(caja.x + caja.w + W) / 2, caja.y + caja.h * 0.45];
    if (caja && !movil) return [caja.x + caja.w * 5 / 6, caja.y + caja.h * 7 / 8];
    if (caja) return [caja.x + caja.w * 5 / 6, Math.min(H - tam, caja.y + caja.h * 7 / 8)];
    return [W * 0.5, H * 0.5];
  }
  function moverLinternas(dt) {
    if (!logo && t > proxLogo) { const [cx, cy] = lugarDelLogo(); logo = { cx, cy, edad: 0 }; }
    if (logo) logo.edad += dt / 60;
    const escala = linternas[0].s;
    for (const l of linternas) {
      if (logo && logo.edad < 7.5) {
        // formar: van a su puesto del abanico, giran y pierden la cola
        const tx = logo.cx + l.fx * escala, ty = logo.cy + l.fy * escala;
        const k = Math.min(1, logo.edad / 2.2);
        l.x += (tx - l.x) * Math.min(1, (0.03 + k * 0.08) * dt);
        l.y += (ty - l.y) * Math.min(1, (0.03 + k * 0.08) * dt);
        const cerca = Math.hypot(tx - l.x, ty - l.y) < 3;
        l.forma += ((cerca ? 1 : 0) - l.forma) * Math.min(1, 0.06 * dt);
        l.rot += (l.frot * l.forma - l.rot) * Math.min(1, 0.1 * dt);
        l.vx = 0; l.vy = 0;
      } else {
        if (logo && logo.edad >= 7.5) { l.vx = R(-1.5, 1.5); l.vy = R(-1, 1); }
        l.forma += (0 - l.forma) * Math.min(1, 0.05 * dt);
        l.rot += (0 - l.rot) * Math.min(1, 0.05 * dt);
        const d = Math.hypot(l.tx - l.x, l.ty - l.y);
        // en escritorio nadan en la mitad derecha: sus colores fuertes no deben pasar sobre el título
        if (d < 30 || R(0, 1) < 0.004) { l.tx = R(W * (movil ? 0.05 : 0.55), W * 0.95); l.ty = R(H * 0.1, H * 0.9); }
        l.vx += (l.tx - l.x) / (d + 1) * 0.03 * dt; l.vy += (l.ty - l.y) / (d + 1) * 0.025 * dt;
        const sp = Math.hypot(l.vx, l.vy); if (sp > 1) { l.vx /= sp; l.vy /= sp; }
        l.x += l.vx * dt; l.y += l.vy * dt;
        if (Math.abs(l.vx) > 0.05) l.cara += ((l.vx > 0 ? 1 : -1) - l.cara) * Math.min(1, 0.1 * dt);
      }
      l.wig += 0.2 * dt;
    }
    if (logo && logo.edad >= 7.5) { logo = null; proxLogo = t + R(18, 28); }
  }

  // ---------- luz y nieve marina ----------
  function dibujarAmbiente(dt) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + i * 0.2) + Math.sin(t * 0.1 + i) * W * 0.03, w = W * 0.07;
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.9);
      g.addColorStop(0, `rgba(169,172,255,${0.035 + 0.02 * Math.sin(t * 0.3 + i * 2)})`); g.addColorStop(1, 'rgba(169,172,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - w * 0.3, 0); ctx.lineTo(x + w * 0.3, 0); ctx.lineTo(x + w * 1.4 + W * 0.04, H * 0.9); ctx.lineTo(x - w * 0.6 + W * 0.04, H * 0.9); ctx.fill();
    }
    for (const n of nieve) {
      n.y -= n.v * dt; n.x += Math.sin(t * 0.5 + n.p) * 0.08 * dt;
      if (n.y < -4) { n.y = H + 4; n.x = R(0, W); }
      ctx.fillStyle = `rgba(200,210,255,${n.a * (0.6 + 0.4 * Math.sin(t * 1.8 + n.p))})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- bucle ----------
  function cuadro(dt) {
    t += dt / 60;
    ctx.clearRect(0, 0, W, H);
    if (!ballena && t > proxBallena) nuevaBallena();
    if (ballena) dibujarBallena(dt);
    dibujarAmbiente(dt);
    medusas.forEach(m => dibujarMedusa(m, dt));
    peces.forEach(p => { moverPez(p, dt); dibujarPez(p); });
    moverLinternas(dt);
    linternas.forEach(dibujarLinterna);
  }

  function medir() {
    DPR = Math.min(window.devicePixelRatio || 1, movil ? 1 : 1.5);
    const r = escena.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    medirMosaico();
  }

  let visible = true, ultimo = 0, corriendo = false;
  function bucle(ahora) {
    corriendo = false;
    if (!visible || document.hidden) return;
    const paso = 1000 / FPS;
    if (ahora - ultimo >= paso - 1) {
      const dt = Math.min(3, (ahora - (ultimo || ahora - paso)) / 16.67);
      ultimo = ahora;
      cuadro(dt);
    }
    corriendo = true; requestAnimationFrame(bucle);
  }
  function arrancar() { if (!corriendo && visible && !document.hidden) { corriendo = true; ultimo = 0; requestAnimationFrame(bucle); } }

  function iniciar() {
    medir(); crear();
    if (QUIETO) {
      // cuadro fijo: adelanta la escena con el logo formado y la ballena a la vista
      nuevaBallena(); ballena.x = W * 0.42; ballena.dir = 1;
      proxLogo = 0;
      for (let i = 0; i < 60 * 5; i++) cuadro(1);
      return;
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; arrancar(); }).observe(escena);
    document.addEventListener('visibilitychange', arrancar);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(medir, 200); });
    arrancar();
  }
  // después del contenido: la portada se pinta primero, el océano se enciende luego
  if (document.readyState === 'complete') iniciar(); else addEventListener('load', iniciar);
})();
