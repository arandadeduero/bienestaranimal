# peluditos

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
