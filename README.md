# gusmarstudios.com

Sitio de GusMar Studios, publicado con GitHub Pages sobre el dominio propio.
Una sola pagina estatica: sin dependencias, sin JavaScript, sin recursos externos.

El dominio esta en Porkbun (comprado el 2026-08-07, 3 anos, vence en agosto de 2029).

## No borrar el archivo CNAME

`CNAME` contiene `gusmarstudios.com` y es lo que ata este repositorio al dominio.
Si desaparece, el sitio deja de responder en gusmarstudios.com.

## Como agregar el enlace a Google Play de una app

Mientras una app esta en prueba cerrada **no tiene ficha publica**: la URL de Play
devuelve 404 para cualquiera que no sea tester. Por eso todas las tarjetas arrancan
en "Proximamente".

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

## Colores

Cada tarjeta usa el color de marca de su app, salvo tres que se oscurecieron porque
la letra blanca encima no llegaba al minimo AA de 4.5:1 — medido, no estimado:

- Silabu `#12908C` -> `#107D7A` (daba 3.89:1)
- Cronobu `#B58200` -> `#936900` (daba 3.41:1)
- El gris tenue de los textos secundarios `#767c9a` -> `#696e89` (daba 4.10:1)

Los nueve colores y los ocho pares de texto pasan AA en modo claro y oscuro.
