// Comportamiento de las paginas de app. Se saco de matibu/index.html cuando
// aparecio la segunda pagina, por lo mismo que el CSS: cuatro copias de un
// script no se rompen al copiarlas, se rompen al arreglar una sola.
// Revelado al bajar, y la pista de "hay más abajo" que se apaga al primer scroll.
//
// Barrido en el scroll y NO un IntersectionObserver, por lo mismo que en la
// portada: el observador solo avisa de lo que cruza EN ESE INSTANTE, así que un
// salto deja elementos invisibles para siempre. La condición de aquí —"ya pasó
// el borde de abajo"— un salto no la puede deshacer.
(() => {
  let pendientes = [...document.querySelectorAll('[data-rise]')];
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const todos = () => { pendientes.forEach((p) => p.setAttribute('data-visible', '')); pendientes = []; };
  if (quieto) todos();

  // La pista sobra en dos casos: cuando ya bajaste, y cuando el héroe no cabe
  // entero — ahí la página se ve cortada por sí sola y el aviso solo se
  // superpone a lo que hay debajo.
  const barra = document.querySelector('.progreso');
  const medir = () => {
    if (!barra) return;
    const alto = document.documentElement.scrollHeight - innerHeight;
    barra.style.width = (alto > 0 ? Math.min(100, (scrollY / alto) * 100) : 0) + '%';
  };

  const heroe = document.querySelector('.heroe');
  const estorba = () => heroe && heroe.getBoundingClientRect().bottom > innerHeight - 64;

  let agendado = false;
  const barrer = () => {
    agendado = false;
    medir();
    if (scrollY > 40 || estorba()) document.body.setAttribute('data-bajo', '');
    if (!pendientes.length) return;
    const limite = innerHeight * 0.92;   // aparece un poco antes del borde
    const quedan = [];
    let enTanda = 0;
    for (const el of pendientes) {
      if (el.getBoundingClientRect().top >= limite) { quedan.push(el); continue; }
      // Escalonado: los que entran juntos lo hacen uno detrás de otro. Tope de
      // cinco, para que el último no se haga esperar.
      if (enTanda > 0) el.style.transitionDelay = `${Math.min(enTanda, 5) * 70}ms`;
      el.setAttribute('data-visible', '');
      enTanda++;
    }
    pendientes = quedan;
  };
  const pedir = () => { if (!agendado) { agendado = true; requestAnimationFrame(barrer); } };

  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir, { passive: true });
  pedir();                       // lo que ya está en pantalla no espera un scroll
  addEventListener('load', pedir);

  // Red de seguridad: llama a `barrer` DIRECTO, sin pasar por rAF. En una
  // pestaña en segundo plano rAF no dispara nunca y nada se vería.
  setTimeout(() => { if (pendientes.length) barrer(); }, 2500);
})();

/* La intro de la app: se reproduce sola al entrar en pantalla, MUDA, y el botón
   enciende el sonido.
   🚨 Muda no es un detalle de estilo: un video con audio que se lanza solo lo
   bloquean todos los navegadores, y si el `play()` lo rechazan queda un cuadro
   negro donde debía haber una intro.
   🚨 `preload="none"` en el HTML y carga al entrar: son 2 MB, y quien no baja
   hasta acá no tiene por qué pagarlos en datos móviles. */
(() => {
  const cine = document.querySelector('.cine');
  if (!cine) return;
  const video = cine.querySelector('video');
  const boton = cine.querySelector('.cine-son');
  if (!video) return;

  const pintar = () => {
    if (!boton) return;
    boton.textContent = video.muted ? '🔇 Sonido' : '🔊 Sonido';
    boton.setAttribute('aria-pressed', String(!video.muted));
    boton.toggleAttribute('data-mudo', video.muted);
  };

  if (boton) {
    boton.addEventListener('click', () => {
      video.muted = !video.muted;
      pintar();
      // 🚨 Quitar el mute a un video que el navegador solo autorizó MUDO lo PAUSA.
      // Sin este play() el botón de sonido dejaría la intro congelada.
      const r = video.play();
      if (r && r.catch) r.catch(() => { video.muted = true; pintar(); video.play().catch(() => {}); });
    });
    pintar();
  }

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!('IntersectionObserver' in window)) {
    // Sin observador se deja a mano: los controles nativos del <video> siguen ahí.
    cine.setAttribute('data-visible', '');
    return;
  }

  new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        cine.setAttribute('data-visible', '');
        if (quieto) return;                 // quien pide menos movimiento, le da play a mano
        const r = video.play();
        if (r && r.catch) r.catch(() => {});
      } else if (!video.paused) {
        video.pause();                      // fuera de pantalla no gasta batería
      }
    });
  }, { threshold: 0.35 }).observe(cine);
})();
