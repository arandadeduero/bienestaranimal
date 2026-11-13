# bienestaranimal

Sitio estático (HTML/CSS/JS sin build) desplegado con GitHub Pages detrás de Cloudflare.

## Regla obligatoria: subir la versión al cambiar JS, JSON o CSS

Cloudflare y GitHub Pages cachean estos ficheros de forma independiente de los despliegues; sin
versión en la URL, los visitantes siguen viendo la versión antigua. **Cada vez que se cambie algo en
un `.js`, un `.json` o un `.css`, hay que subir su versión en el mismo commit:**

- **CSS y JS** (`styles.css`, `nav.js`, `analytics.js`, `colonias-map.js`, `recogidas.js`,
  `zonas-caninas.js`, `comun.js`, `archivo.js`…): subir el `?v=N` en **todas** las páginas
  HTML que lo cargan (`index.html` y `*/index.html`). Buscar con `grep -rn "<fichero>?v=" .` para no dejarse ninguna.
- **Fuentes** (`fonts/*.woff2`): subir el `?v=` tanto en el `url()` del `@font-face` de `styles.css` como en
  el `<link rel="preload">` de cada HTML (deben coincidir exactamente o el preload no sirve).
- **JSON de datos** (`data/*.json`): subir la versión con la que el script que lo lee lo pide
  (p. ej. `DATA_VERSION` en `colonias-map.js`, que hace `fetch('data/colonias.json?v=N')`), y
  después subir también el `?v=` del propio script en el HTML para que se descargue el cambio.
  Si un script lee un JSON sin versión, añadírsela.

Antes de commitear, comprobar que no queda ninguna referencia con la versión vieja.

## Estilos

Todos los estilos van en `styles.css`: nada de `style="…"` en el HTML ni de `element.style.x = …` en
JS. Si el JS necesita variar un estilo, que añada o quite una clase; si necesita pasar un valor
calculado (p. ej. coordenadas), que lo haga con una variable CSS (`style.setProperty('--x', …)`)
que consuma una regla del CSS, como hace `nav.js` con `.nav-dropdown__menu--fixed`.

Los JSON que modifican los workflows de issues (`animales-recogidos.json`, `archivo.json`) los versiona
el propio workflow con `scripts/bump-data-version.mjs` (sube `DATA_VERSION` y el `?v=` del HTML en la
misma PR). Si se añade un JSON nuevo que toque un workflow, hay que llamar a ese script también.

## Código compartido

Lo que usan varias páginas va en `comun.js` (`window.BA`: `escapeHtml`, `fmtFecha`, `crearMapa`
con el mapa base del IGN, `encuadrar`, `fotosHtml`, `fichaEnMapa`, `visorFotos`), cargado con
`defer` justo antes del script de cada página. No volver a copiar estas funciones en los scripts de
página: añadirlas o cambiarlas en `comun.js` y subir su `?v=` en todas las páginas que lo cargan.
`DATA_VERSION` se queda en cada script de página (lo sube `scripts/bump-data-version.mjs`).
La cabecera, el menú y el pie se repiten en cada HTML a propósito (no hay build): al añadir una
página, copiar una existente y añadir su enlace al menú de todas, incluida `404.html`.

## Leaflet

Leaflet está alojado en `vendor/leaflet/` (sin CDN): lo descarga `scripts/vendor-leaflet.mjs <versión>`
desde npm, verificando el tarball, y versiona su carga en `mapa-colonias/index.html` con el número de
versión de Leaflet (`?v=1.9.4`). El workflow `leaflet-update.yml` comprueba cada lunes si hay versión
nueva y abre un PR con la actualización; el merge es manual. No editar `vendor/` a mano.

## Sitemap

`sitemap.xml` no está en el repo: lo genera `scripts/build-sitemap.mjs` en cada despliegue a partir
de los `index.html` existentes (raíz y carpetas de primer nivel), usando su `<link rel="canonical">`.
Al añadir o quitar una página no hay que tocar nada más, pero toda página nueva debe llevar canonical;
las que no deban indexarse (p. ej. `404.html`) llevan `<meta name="robots" content="noindex">`.

## Contexto del proyecto

- Web del Ayuntamiento de Aranda de Duero. Rama por defecto `aranda`; cada push despliega
  (`deploy-pages.yml`) en https://bienestaranimal.arandadeduero.es. No hay build ni secrets.
- Idioma: español en todo el contenido, commits y mensajes al usuario.
- Páginas: portada (servicio municipal de recogida: Policía Local 947 51 26 46, 24 h, sin dirección
  física), `/info`, `/protectoras`, `/mapa-colonias`, `/zonas-caninas`, `/archivo`.
- `/zonas-caninas` (datos en `data/zonas-caninas.json`, fotos en `img/zonas-caninas/`): solo datos
  prácticos de cada zona, sin texto político ni institucional.
- **Las protectoras son independientes del Ayuntamiento**: solo aparecen en `/protectoras`, con la
  nota de que se muestran a nivel informativo. Nunca en la portada, los issues ni el archivo.
- Ficha de animal recogido: foto, fecha de recogida, lugar de recogida y situación.

## Datos del mapa

- `data/colonias.json` es la única fuente del mapa: una colonia puede llevar `puntoAlimentacion`
  (`numero`, `nombre`, `ubicacion`, `fotos`). Un punto autorizado implica que existe colonia; no
  hay fichero aparte de puntos.
- Sin dato: `"Desconocido"` (en pantalla, «Número de gatos no conocido»). Nadie «gestiona» las
  colonias: no añadir ese campo.
- Fotos de puntos: `img/puntos-alimentacion/pa-<nn>-<foto>.jpg`.
- Geocodificación con Nominatim (User-Agent obligatorio, 1 petición/s); comprobar los resultados a
  mano, a veces devuelve otro lugar con nombre parecido.

## Flujo de issues

- Dos formularios: «Animal recogido» (`nuevo-animal`) y «Archivar» (`archivar-animal`). El archivo
  es manual, nunca automático.
- Issue → Action → PR automática → merge manual → `issue-flow-closed.yml` cierra el issue con
  `gh issue close` (un squash-merge no arrastra «Closes #N»).
- El cuerpo del issue es entrada no confiable: pasarlo a los scripts por `env:`, nunca interpolado.

## Trampas conocidas

- `.mainnav` tiene `overflow-x:auto`, que recorta el desplegable en vertical: por eso el menú RRSS
  usa `position:fixed` calculado desde JS en escritorio.
- El menú pasa a hamburguesa por debajo de 1150px (`styles.css` y `isMobileNav` en `nav.js`, que
  deben coincidir): con más ancho que eso caben justos los enlaces actuales. Al añadir un enlace
  al menú, medir que `.mainnav` no se recorta (`scrollWidth > clientWidth`) y subir el corte.
- `.colonias-map` lleva `isolation: isolate`: las capas de Leaflet tienen `z-index` de hasta 1000
  y, sin eso, el mapa tapa el menú desplegado.
- Leaflet: los popups altos con fotos necesitan `animate:false`, desplazamiento al norte y
  `keepInView`; `loading="lazy"` no carga dentro de popups.
- Popups con fotos: usar `BA.popupFotos(map, ancho)`. En móvil el mapa (~358px) es más estrecho que
  un popup de 300px con sus márgenes, y `minWidth` debe igualar a `maxWidth` o las fotos encogen.
  Las fichas del listado están debajo del mapa: `BA.fichaEnMapa` lo trae a la vista al pulsarlas.
- Probar siempre los mapas también a 390px de ancho: los fallos de popup y menú solo salen ahí.
- `escapeHtml` (en `comun.js`) debe aceptar números (`String(s ?? '')`); un `TypeError` ahí queda oculto por el
  `.catch` y la página parece vacía.
- En el navegador de pruebas, el servidor local cachea el JSON: usar `fetch(url,{cache:'reload'})`.
