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
<span class="estado">Proximamente</span>
```

por:

```html
<a class="estado" href="https://play.google.com/store/apps/details?id=PAQUETE">Ver en Google Play</a>
```

En la tarjeta de Matibu quedo el comentario con la linea ya escrita.

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

## Colores

Cada tarjeta usa el color de marca de su app, salvo tres que se oscurecieron porque
la letra blanca encima no llegaba al minimo AA de 4.5:1 — medido, no estimado:

- Silabu `#12908C` -> `#107D7A` (daba 3.89:1)
- Cronobu `#B58200` -> `#936900` (daba 3.41:1)
- El gris tenue de los textos secundarios `#767c9a` -> `#696e89` (daba 4.10:1)

Los nueve colores y los ocho pares de texto pasan AA en modo claro y oscuro.
