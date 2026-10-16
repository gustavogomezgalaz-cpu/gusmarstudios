/* El QR de «Paga desde tu celular» (y el de «Abrir en otro aparato») llega a la página de la
   app con ?c=CODIGO&m=pagar|canjear. Sin código, esta página es la de siempre y este script no
   hace nada. Con código:
   · arriba aparece una tarjeta con el código y el botón «Abrir <app>»;
   · en Android se intenta abrir la app de una (intent://), y si no está instalada Chrome sigue
     a la Play Store;
   · TODOS los botones de Google Play de la página llevan el código en el install referrer, para
     que la app lo reciba sola al abrirse por primera vez.
   La app y su paquete vienen del propio <script>: data-app, data-paquete y data-esquema. */
(function () {
  var yo = document.currentScript;
  if (!yo) return;
  var APP = { nombre: yo.dataset.app, paquete: yo.dataset.paquete, esquema: yo.dataset.esquema, donde: yo.dataset.donde || 'la Zona de Papás' };
  var q = new URLSearchParams(location.search);
  var crudo = String(q.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (crudo.length !== 8) return;
  var codigo = crudo.slice(0, 4) + '-' + crudo.slice(4);
  var modo = q.get('m') === 'canjear' ? 'canjear' : 'pagar';

  var params = 'c=' + encodeURIComponent(codigo) + '&m=' + modo;
  var playUrl = 'https://play.google.com/store/apps/details?id=' + APP.paquete + '&referrer=' + encodeURIComponent(params + '&utm_source=qr');
  var intent = 'intent://activar?' + params + '#Intent;scheme=' + APP.esquema + ';package=' + APP.paquete + ';S.browser_fallback_url=' + encodeURIComponent(playUrl) + ';end';
  var android = /android/i.test(navigator.userAgent);

  // Los botones de Google Play de la página, con el código.
  document.querySelectorAll('a[href^="https://play.google.com/store/apps/details?id=' + APP.paquete + '"]').forEach(function (a) {
    a.href = playUrl;
  });

  var textos = {
    pagar: {
      etiqueta: 'Pago para otro aparato',
      titulo: 'Paga aquí, y el otro aparato se abre solo',
      cuerpo: 'Abre ' + APP.nombre + ' en este teléfono y paga ahí, dentro de la app, con Google Play: tarjeta, efectivo o saldo. En cuanto termines, el aparato que te mostró el código queda con la versión completa. Y este teléfono también.',
    },
    canjear: {
      etiqueta: 'Código de activación',
      titulo: 'Abre ' + APP.nombre + ' con tu compra',
      cuerpo: 'Abre ' + APP.nombre + ' en este aparato: el código se aplica solo y queda con la versión completa, sin volver a pagar.',
    },
  }[modo];

  var tarjeta = document.createElement('section');
  tarjeta.className = 'codigo-qr';
  tarjeta.setAttribute('aria-label', textos.etiqueta);
  tarjeta.innerHTML =
    '<p class="codigo-qr-etiqueta"></p>' +
    '<h2 class="codigo-qr-titulo"></h2>' +
    '<div class="codigo-qr-boleto"><span class="codigo-qr-codigo"></span></div>' +
    '<button type="button" class="codigo-qr-copiar" aria-live="polite"></button>' +
    '<p class="codigo-qr-cuerpo"></p>' +
    '<a class="boton codigo-qr-abrir"></a>' +
    '<p class="codigo-qr-nota"></p>';
  tarjeta.querySelector('.codigo-qr-etiqueta').textContent = textos.etiqueta;
  tarjeta.querySelector('.codigo-qr-titulo').textContent = textos.titulo;
  tarjeta.querySelector('.codigo-qr-codigo').textContent = codigo;
  tarjeta.querySelector('.codigo-qr-cuerpo').textContent = textos.cuerpo;
  // Copiar el código: si instala Matibu buscándola en Google Play, lo pega en la app.
  var copiar = tarjeta.querySelector('.codigo-qr-copiar');
  copiar.textContent = 'Copiar código';
  copiar.addEventListener('click', function () {
    var listo = function () {
      copiar.textContent = '¡Copiado!';
      copiar.classList.add('copiado');
      setTimeout(function () { copiar.textContent = 'Copiar código'; copiar.classList.remove('copiado'); }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(codigo).then(listo, function () {});
    else {
      var t = document.createElement('textarea'); t.value = codigo; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); listo(); } catch (e) {}
      document.body.removeChild(t);
    }
  });
  var abrir = tarjeta.querySelector('.codigo-qr-abrir');
  abrir.textContent = 'Abrir ' + APP.nombre;
  abrir.href = android ? intent : playUrl;
  tarjeta.querySelector('.codigo-qr-nota').textContent = android
    ? '¿Todavía no tienes ' + APP.nombre + '? Descárgala con el botón de abajo y el código se aplica solo al abrirla. Si la instalas de otra forma, copia el código y pégalo en la app, en ' + APP.donde + '.'
    : 'Esto funciona en teléfonos Android: abre este enlace en tu teléfono.';

  var heroe = document.querySelector('.heroe');
  var acciones = heroe && heroe.querySelector('.acciones');
  if (acciones) heroe.insertBefore(tarjeta, acciones);
  else document.body.insertBefore(tarjeta, document.body.firstChild);
  document.documentElement.classList.add('con-codigo');

  // En Android, se intenta abrir la app de una (una sola vez por visita).
  if (android) setTimeout(function () { location.href = intent; }, 700);
})();
