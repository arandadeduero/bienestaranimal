# bienestaranimal

Sitio estático (HTML/CSS/JS sin build) desplegado con GitHub Pages detrás de Cloudflare.

## Regla obligatoria: subir la versión al cambiar JS, JSON o CSS

Cloudflare y GitHub Pages cachean estos ficheros de forma independiente de los despliegues; sin
versión en la URL, los visitantes siguen viendo la versión antigua. **Cada vez que se cambie algo en
un `.js`, un `.json` o un `.css`, hay que subir su versión en el mismo commit:**

- **CSS y JS** (`styles.css`, `nav.js`, `analytics.js`, `colonias-map.js`, `recogidas.js`,
  `archivo.js`…): subir el `?v=N` en **todas** las páginas HTML que lo cargan (`index.html` y
  `*/index.html`). Buscar con `grep -rn "<fichero>?v=" .` para no dejarse ninguna.
- **JSON de datos** (`data/*.json`): subir la versión con la que el script que lo lee lo pide
  (p. ej. `DATA_VERSION` en `colonias-map.js`, que hace `fetch('data/colonias.json?v=N')`), y
  después subir también el `?v=` del propio script en el HTML para que se descargue el cambio.
  Si un script lee un JSON sin versión, añadírsela.

Antes de commitear, comprobar que no queda ninguna referencia con la versión vieja.

Los JSON que modifican los workflows de issues (`animales-recogidos.json`, `archivo.json`) los versiona
el propio workflow con `scripts/bump-data-version.mjs` (sube `DATA_VERSION` y el `?v=` del HTML en la
misma PR). Si se añade un JSON nuevo que toque un workflow, hay que llamar a ese script también.

## Contexto del proyecto

- Web del Ayuntamiento de Aranda de Duero. Rama por defecto `aranda`; cada push despliega
  (`deploy-pages.yml`) en https://bienestaranimal.arandadeduero.dev. No hay build ni secrets.
- Idioma: español en todo el contenido, commits y mensajes al usuario.
- Páginas: portada (servicio municipal de recogida: Policía Local 947 51 26 46, 24 h, sin dirección
  física), `/info`, `/protectoras`, `/mapa-colonias`, `/archivo`.
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
- Leaflet: los popups altos con fotos necesitan `animate:false`, desplazamiento al norte y
  `keepInView`; `loading="lazy"` no carga dentro de popups.
- `escapeHtml` debe aceptar números (`String(s ?? '')`); un `TypeError` ahí queda oculto por el
  `.catch` y la página parece vacía.
- En el navegador de pruebas, el servidor local cachea el JSON: usar `fetch(url,{cache:'reload'})`.
