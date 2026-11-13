// Bienestar Animal Aranda — utilidades compartidas por los scripts de las páginas (window.BA).
// Se carga antes que el script de cada página; las de mapa necesitan además Leaflet.
(function () {
  // Acepta números: con `s || ''` un 0 se perdería, y un TypeError aquí queda oculto por el .catch.
  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtFecha = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Mapa Leaflet centrado en Aranda con el mapa base gris del IGN (organismo público español,
  // CC BY 4.0): las teselas no pasan por servidores de terceros y el gris deja destacar los marcadores.
  function crearMapa(el) {
    const map = L.map(el).setView([41.6708, -3.6892], 14);
    L.tileLayer('https://www.ign.es/wmts/ign-base?request=getTile&layer=IGNBase-gris&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileCol={x}&TileRow={y}&format=image/jpeg', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.ign.es/" target="_blank" rel="noopener">Instituto Geográfico Nacional de España</a>',
    }).addTo(map);
    return map;
  }

  // Encuadra el mapa en los marcadores: uno solo, a zoom de calle.
  function encuadrar(map, bounds) {
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
    else if (bounds.length === 1) map.setView(bounds[0], 16);
  }

  // Opciones de un popup con fotos: en móvil el mapa es más estrecho que el popup, así que el
  // ancho se limita al del mapa menos el relleno del popup (46px) y el margen de autoPan (2×20).
  // shortcut: se calcula al crear el marcador, no al girar el móvil; recalcular en 'resize' si molesta.
  // minWidth = maxWidth: si no, el popup se ajusta al texto y las fotos (que encogen) quedan diminutas.
  const popupFotos = (map, ancho) => {
    const w = Math.min(ancho, map.getContainer().clientWidth - 86);
    return { minWidth: w, maxWidth: w, autoPanPadding: [20, 20], keepInView: true };
  };

  // Miniaturas que abre el visor de fotos (cada <a> apunta a la foto completa).
  const fotosHtml = (fotos, cls, alt) => {
    if (!Array.isArray(fotos) || !fotos.length) return '';
    return `<div class="${cls}">` + fotos.map((src, i) =>
      `<a href="${escapeHtml(src)}">` +
      `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}: foto ${i + 1}" width="120" height="160"></a>`
    ).join('') + '</div>';
  };

  // Ficha <li> clicable/enfocable por teclado que centra el mapa y abre el popup de su marcador.
  // offsetY desplaza el centro al norte: el popup se abre encima del marcador y, con fotos, es
  // alto — así el marcador queda por debajo del centro y el popup entra entero.
  function fichaEnMapa(li, map, marker, latlng, offsetY) {
    li.tabIndex = 0;
    const focus = () => {
      // El listado está debajo del mapa: sin esto, en móvil el popup se abre fuera de pantalla.
      map.getContainer().scrollIntoView({ block: 'center' });
      const target = map.unproject(map.project(latlng, 17).subtract([0, offsetY]), 17);
      map.setView(target, 17, { animate: false });
      marker.openPopup();
    };
    li.addEventListener('click', (e) => { if (!e.target.closest('a')) focus(); });
    li.addEventListener('keydown', (e) => {
      if (e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); focus(); }
    });
  }

  // Ampliar las fotos (de .pa-photos en popups y .punto-card__photos en fichas) en una ventana
  // emergente (<dialog>) en vez de abrirlas en otra pestaña. El listener va en fase de captura
  // porque Leaflet corta la propagación de los clics dentro de los popups del mapa.
  function visorFotos() {
    const visor = document.createElement('dialog');
    visor.className = 'foto-visor';
    visor.setAttribute('aria-label', 'Foto ampliada');
    visor.innerHTML = '<button class="foto-visor__close" type="button" aria-label="Cerrar">✕</button><img alt="">';
    document.body.appendChild(visor);
    const visorImg = visor.querySelector('img');
    document.addEventListener('click', (e) => {
      const a = e.target.closest('.pa-photos a, .punto-card__photos a');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      visorImg.src = a.getAttribute('href');
      visorImg.alt = a.querySelector('img')?.alt || '';
      visor.showModal();
    }, true);
    // Clic fuera de la foto (fondo) o en la ✕ cierra el visor; Esc lo cierra de serie.
    visor.addEventListener('click', (e) => { if (e.target !== visorImg) visor.close(); });
    visor.addEventListener('close', () => { visorImg.removeAttribute('src'); });
  }

  window.BA = { escapeHtml, fmtFecha, crearMapa, encuadrar, popupFotos, fotosHtml, fichaEnMapa, visorFotos };
})();
