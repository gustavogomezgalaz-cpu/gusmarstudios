# gusmarstudios.com

Sitio de GusMar Studios, publicado con GitHub Pages sobre el dominio propio.
HTML y CSS a mano: **sin dependencias, sin framework y sin un solo recurso externo**.
Lleva un script propio de ~40 lineas por pagina, solo para el revelado al bajar, y la
pagina se ve entera aunque no corra.

```
/                     la vitrina del estudio (index.html)
/matibu/              la pagina de una app — el patron para las otras ocho
iconos/*.webp         los iconos reales de cada app
fuentes/*.woff2       Bricolage Grotesque + IBM Plex Sans/Mono, subconjunto latino
marca.svg             la marca; tambien favicon
favicon.ico  favicon-32.png  favicon-48.png  apple-touch-icon.png  icono-512.png
og.png                la tarjeta que se ve al pegar el enlace (1200x630)
CNAME                 NO BORRAR: ata el repo al dominio
```

El dominio esta en Porkbun (comprado el 2026-08-07, 3 anos, vence en agosto de 2029).

## No borrar el archivo CNAME

`CNAME` contiene `gusmarstudios.com` y es lo que ata este repositorio al dominio.
Si desaparece, el sitio deja de responder en gusmarstudios.com.

## Como agregar el enlace a Google Play de una app

Mientras una app esta en prueba cerrada **no tiene ficha publica**: la URL de Play
devuelve 404 para cualquiera que no sea tester. Por eso todas las tarjetas arrancan
en "Proximamente".

### Los TRES estados de una tarjeta

| Estado | Enlace | Cuando |
|--------|--------|--------|
| `En desarrollo` | ninguno | La app no esta en Play Console, o esta como borrador |
| `Prueba cerrada · solo testers` | `play.google.com/apps/testing/PAQUETE` | La app tiene una prueba cerrada viva |
| `Ver en Google Play` | `play.google.com/store/apps/details?id=PAQUETE` | La app esta en produccion |

**Los dos enlaces NO son intercambiables:**

- `/apps/testing/` es la puerta de la prueba cerrada. A quien esta en la lista de
  testers le muestra el boton para descargarla; a cualquier otro le dice que no es
  tester. **Es el unico que funciona mientras la app no este en produccion.**
- `/store/apps/details` es la ficha publica. **Devuelve 404 mientras la app este solo
  en prueba cerrada.**

Al 2026-08-07 tienen prueba cerrada: Matibu, Lunabu, Anticipa, Cavila y Dilo Jugando.
Cronobu esta como **borrador** en Play Console, asi que no le sirve ninguno de los dos.
Silabu, Palabu y Terrabu ni siquiera estan creadas.

### Al pasar una app a produccion

Cuando una app llegue a produccion, en su tarjeta de `index.html` hay que cambiar:

```html
<span class="estado"><span class="punto" aria-hidden="true"></span>Proximamente</span>
```

por:

```html
<a class="estado" href="https://play.google.com/store/apps/details?id=PAQUETE">
  <span class="punto" aria-hidden="true"></span>Ver en Google Play</a>
```

El comentario justo encima de la lista `.catalogo` lo repite.

Paquetes de las nueve:

| App          | Paquete                        |
|--------------|--------------------------------|
| Matibu       | cl.matibu.matematicas          |
| Silabu       | cl.silabu.lectura              |
| Palabu       | cl.palabu.lenguaje             |
| Terrabu      | cl.terrabu.ciencias            |
| Cronobu      | cl.cronobu.historia            |
| Lunabu       | cl.lunabu.preescolar           |
| Anticipa     | cl.anticipa.rutinas            |
| Dilo Jugando | cl.dilojugando.pronunciacion   |
| Cavila       | cl.cavila.app                  |

**Antes de poner un enlace, comprobar que la ficha responde 200**, no 404:

```
curl -s -o /dev/null -w "%{http_code}" "https://play.google.com/store/apps/details?id=PAQUETE"
```

## Pendiente: la seccion de contacto

Esta **comentada** en `index.html`, junto con el boton "Hablemos" de la cabecera.
Sale de nuevo cuando `hola@gusmarstudios.com` exista de verdad: se crea como reenvio
en el panel de Porkbun (los registros MX de fwd1/fwd2 ya estan puestos y apuntando).

Una direccion publicada que rebota es peor que no tener ninguna, sobre todo si la
pagina va a recibir trafico pagado.

## Iconos, marca y fuentes

- **`iconos/*.webp`** — los iconos REALES de cada app, sacados de su `assets/icon.png` y
  reducidos a 256 px con `sharp`: **21 KB los siete**, contra 730 KB los originales.
  Palabu y Terrabu no tienen icono todavia (estan en desarrollo) y se quedan con su letra,
  lo que ademas dice honestamente que faltan.
- **`marca.svg`** — la marca del estudio: tres fichas en abanico, no una inicial en un
  cuadrado. Cada `rect` nace centrado en el origen para poder rotarlo sobre SU centro y
  recien despues moverlo; al reves las encima a las tres y solo se ve una. Verificada
  RENDERIZANDOLA a 24, 28, 40, 64 y 160 px: con mas rotacion o mas separacion se empasta
  al tamano de la cabecera. Va tambien como favicon.
- **`fuentes/*.woff2`** — Bricolage Grotesque (variable, cubre 400/600/800), IBM Plex Sans
  y IBM Plex Mono, solo subconjunto latino. **Se sirven desde aqui a proposito**: cargarlas
  desde Google le mandaria la IP de cada visitante a un tercero, y esta pagina promete
  justo lo contrario.

## El favicon: el SVG solo NO basta

Cuatro archivos, y cada uno cubre a alguien que los otros dejan fuera:

| Archivo | Para quien |
|---------|-----------|
| `marca.svg` | Chrome, Firefox y Edge, que lo escalan sin perder nada |
| `favicon-32.png`, `favicon-48.png` | Safari y todo el que no entiende favicons SVG |
| `favicon.ico` | **el navegador que lo pide a `/favicon.ico` sin leer el HTML** |
| `apple-touch-icon.png` (180) | iOS al guardar la pagina en la pantalla de inicio |

Se declaran en **rutas absolutas** (`/marca.svg`, no `../marca.svg`) para que las paginas
de las apps compartan los mismos.

**Se rasterizan del propio `marca.svg` con FONDO OSCURO**, no transparente: el borde de las
tres fichas es del color del fondo del sitio, asi que sobre blanco la marca se desarma y
se ve un solo bulto. El `.ico` se arma con Node —cabecera ICO de 6 bytes + una entrada de
16 + el PNG tal cual— porque los navegadores aceptan PNG dentro de un ICO.

## Como se arma la pagina de una app

`/matibu/` es el patron. Para otra app se clona la carpeta y se cambia el contenido; la
estructura es siempre la misma y **cada bloque esta porque contesta una pregunta**:

| Bloque | Que contesta |
|--------|--------------|
| Heroe: icono, nombre, una linea, boton a Play | que es y donde se baja |
| Cifras (temas / lecciones / juegos / idiomas) | cuanto hay ahi dentro |
| **Que aprende** — los temas, en cintas por isla | de que va, sin leer un parrafo |
| **Asi se ve** — capturas dentro de un telefono | como se ve de verdad |
| **Lo que no vas a encontrar** | sin anuncios, sin datos, sin compras del nino |
| **Lo que si** — la zona del adulto | por que le sirve al que paga |
| **Cuanto cuesta** | que es gratis y que no, sin letra chica |

### Las capturas

Se sacan **de la app corriendo**, nunca de un mockup, con la ventana en **390x700**.
Es deliberado: a 375x812 la relacion es 2,17 y la captura se lee como una *tira*, no como
una pantalla. A 390x700 (1,79) parece un telefono.

Van dentro de un **marco de telefono dibujado con CSS** (`.tel`, con su auricular): con el
marco el ojo reconoce lo que mira y deja de medirlo.

Se guardan en **webp** (~25-55 KB cada una contra 200+ en PNG).

### Los temas

No es una lista: son **cintas que corren, una por isla**, con el emoji y el color que esa
isla y ese tema tienen DENTRO de la app (salen de `curriculum.ts`, no se eligen a ojo).
Veintiocho etiquetas quietas son un muro que nadie lee; corriendo son una franja que se
mira sola. Se detienen al pasar el raton, porque si no, el que quiere leer una la persigue.

### La `og.png` (1200x630)

Es la cara del enlace al pegarlo en WhatsApp, que es justo como se reparten los codigos de
regalo. **Lleva el icono de la app DENTRO**, asi que no se actualiza sola cuando el icono
cambia: hay que recomponerla. En `/matibu/og.png` el icono va en 300x300 en (800,165) con
esquinas de radio 60.

Ademas de `og:image` van `og:image:secure_url` y `og:image:type`, que algunos scrapers
viejos de Meta prefieren. La URL es **absoluta y sin redirecciones**.

🚨 **No compartir un enlace recien publicado.** Tras un push, GitHub Pages tarda entre 30
segundos y 5 minutos en reconstruir, y en esa ventana los archivos pueden dar **404 con el
HTML nuevo ya servido**. Si el robot de Meta pasa justo ahi, guarda "esta URL no tiene
imagen" y **ese cache dura dias aunque la imagen ya funcione**: el enlace sale en el chat
sin foto, como de sitio desconocido. Paso exactamente eso con `/matibu/`.

- Antes de pegar un enlace en un chat, comprobar que la imagen responde 200:
  `curl -sI https://gusmarstudios.com/matibu/og.png`
- Si el cache ya se envenono, se purga en `developers.facebook.com/tools/debug` con
  **"Scrape Again"** (es el mismo cache que usa WhatsApp). Para salir del paso, cualquier
  parametro —`?v=2`— es una URL distinta y la obliga a mirar de nuevo.

## Los efectos, y por que cada uno

- **Revelado al bajar** (`[data-rise]`): barrido en el evento `scroll`, **NO un
  `IntersectionObserver`**. El observador solo avisa de lo que cruza EN ESE INSTANTE, asi
  que un salto —un enlace del menu, un dedo rapido— deja elementos invisibles **para
  siempre**. La condicion de aqui es "ya paso el borde de abajo", que un salto no deshace.
  La clase `js` se pone en la cabecera: **sin JavaScript no se esconde nada**.
- **Destello de los botones**: un pseudo-elemento con un degradado blanco inclinado que
  cruza el boton. Cruza en menos de dos segundos y **descansa otros dos**: un brillo que
  barre sin parar deja de llamar la atencion. Va SOLO en los botones de accion principal
  (`.boton`, `.boton-principal`, `.boton-nav`, `.ficha`); si lo lleva todo, deja de decir
  cual es EL boton. Sobre el boton claro de la barra el destello es oscuro, no blanco.
- **Pista de "sigue bajando"**: anclada al borde inferior de la ventana, no al final del
  heroe —ahi se queda fuera de pantalla en un telefono, o sea que no existe—, y se apaga
  al primer scroll **o si el heroe no cabe entero**, porque entonces la pagina ya se ve
  cortada y el aviso solo tapa lo que hay debajo.
- **Cinta de la portada**: los nueve nombres corriendo, **cada uno con su icono**. Y los
  nueve iconos del heroe son **enlaces** (el de una app publicada a su pagina, el resto al
  catalogo) que enseñan su nombre al pasar por encima; en pantalla tactil, siempre.

Todo lo animado se apaga con `prefers-reduced-motion`. El destello se **quita** (`display:
none`), no se acelera: a 0,001s se quedaria parado encima del texto.

## Colores

Cada tarjeta usa el color de marca de su app, salvo tres que se oscurecieron porque
la letra blanca encima no llegaba al minimo AA de 4.5:1 — medido, no estimado:

- Silabu `#12908C` -> `#107D7A` (daba 3.89:1)
- Cronobu `#B58200` -> `#936900` (daba 3.41:1)
- El gris tenue de los textos secundarios `#767c9a` -> `#696e89` (daba 4.10:1)

Los nueve colores y los ocho pares de texto pasan AA en modo claro y oscuro.
