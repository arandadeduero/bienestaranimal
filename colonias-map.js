// Peluditos — mapa de colonias felinas y puntos de alimentación autorizados
// (Leaflet + teselas de OpenStreetMap).
//
// Un único modelo: la colonia. Si una colonia tiene `puntoAlimentacion`, ese punto es lo
// principal (marcador numerado, ficha con fotos, listado propio arriba); si no, es una colonia
// "a secas" (punto discreto, listado de abajo).
(function () {
  const ARANDA_CENTER = [41.6708, -3.6892]; // Aranda de Duero (centro aprox.)
  const mapEl = document.getElementById('colonias-map');
  const puntosEl = document.getElementById('puntos-list');
  const coloniasEl = document.getElementById('colonias-list');
  const emptyEl = document.getElementById('colonias-empty');
  if (!mapEl || typeof L === 'undefined') return;

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const map = L.map(mapEl).setView(ARANDA_CENTER, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const gatosLabel = (n) => {
    if (n == null || n === '') return '';
    if (typeof n === 'number') return `${n} gatos aprox.`;
    return n === 'Desconocido' ? 'Número de gatos no conocido' : String(n);
  };
  const hasCoords = (c) => typeof c.lat === 'number' && typeof c.lng === 'number';
  // Frase estándar de las colonias del censo: no aporta nada repetida en cada ficha.
  const GENERICA = 'Colonia felina urbana incluida en el censo municipal de 2025.';
  const notaPropia = (c) => (c.descripcion && c.descripcion !== GENERICA ? c.descripcion : '');

  // Miniaturas de las fotos del punto; cada una abre la foto completa en otra pestaña.
  const fotosHtml = (p, cls) => {
    const fotos = Array.isArray(p.fotos) ? p.fotos : [];
    if (!fotos.length) return '';
    return `<div class="${cls}">` + fotos.map((src, i) =>
      `<a href="${escapeHtml(src)}" target="_blank" rel="noopener">` +
      `<img src="${escapeHtml(src)}" alt="Punto nº ${escapeHtml(p.numero)}, ${escapeHtml(p.nombre)}: foto ${i + 1}" width="120" height="160"></a>`
    ).join('') + '</div>';
  };

  // Nombre del censo solo si aporta algo distinto al nombre del punto.
  const coloniaAparte = (c, p) => (p.nombre && p.nombre !== c.nombre ? c.nombre : '');

  function popupHtml(c) {
    const p = c.puntoAlimentacion;
    const gatos = gatosLabel(c.numGatos);
    if (!p) {
      return `
        <strong>${escapeHtml(c.nombre)}</strong>
        ${c.zona && c.zona !== 'Desconocido' ? `<br>${escapeHtml(c.zona)}` : ''}
        ${gatos ? `<br>🐱 ${escapeHtml(gatos)}` : ''}
        ${notaPropia(c) ? `<br><span>${escapeHtml(notaPropia(c))}</span>` : ''}
        <br><span class="popup-muted">Sin punto de alimentación autorizado por ahora</span>`;
    }
    const aparte = coloniaAparte(c, p);
    return `
      <strong>Punto de alimentación nº ${escapeHtml(p.numero)} · ${escapeHtml(p.nombre)}</strong>
      ${p.ubicacion ? `<br>${escapeHtml(p.ubicacion)}` : ''}
      ${aparte ? `<br><span class="popup-muted">Colonia: ${escapeHtml(aparte)}</span>` : ''}
      ${gatos ? `<br>🐱 ${escapeHtml(gatos)}` : ''}
      ${fotosHtml(p, 'pa-photos')}`;
  }

  // <li> clicable/enfocable por teclado que centra el mapa y abre el popup de su marcador.
  // offsetY desplaza el centro al norte: el popup se abre encima del marcador y, con fotos,
  // es alto — así el marcador queda por debajo del centro y el popup entra entero.
  function addFocusable(container, cls, marker, c, html, offsetY) {
    const li = document.createElement('li');
    li.className = cls;
    li.innerHTML = html;
    if (marker) {
      li.tabIndex = 0;
      const focus = () => {
        const target = map.unproject(map.project([c.lat, c.lng], 17).subtract([0, offsetY]), 17);
        map.setView(target, 17, { animate: false });
        marker.openPopup();
      };
      li.addEventListener('click', (e) => { if (!e.target.closest('a')) focus(); });
      li.addEventListener('keydown', (e) => {
        if (e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); focus(); }
      });
    }
    container.appendChild(li);
  }

  // Subir DATA_VERSION cada vez que cambie data/colonias.json: Cloudflare/GitHub Pages lo cachean
  // y, sin versión en la URL, los visitantes seguirían viendo los datos antiguos tras el despliegue.
  const DATA_VERSION = 1;
  fetch(`data/colonias.json?v=${DATA_VERSION}`)
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const todas = Array.isArray(data) ? data : [];
      emptyEl.hidden = todas.length > 0;

      const conPunto = todas
        .filter((c) => c.puntoAlimentacion)
        .sort((a, b) => a.puntoAlimentacion.numero - b.puntoAlimentacion.numero);
      const sinPunto = todas.filter((c) => !c.puntoAlimentacion);
      const bounds = [];

      // Primero las colonias "a secas" (quedan debajo); luego los puntos, encima y más grandes.
      for (const c of sinPunto) {
        let marker = null;
        if (hasCoords(c)) {
          bounds.push([c.lat, c.lng]);
          marker = L.circleMarker([c.lat, c.lng], {
            radius: 7, color: '#fff', weight: 2, fillColor: '#0083c1', fillOpacity: 0.9,
          }).addTo(map).bindPopup(popupHtml(c), { maxWidth: 300 });
        }
        const gatos = gatosLabel(c.numGatos);
        const zona = c.zona && c.zona !== 'Desconocido' ? c.zona : '';
        addFocusable(coloniasEl, 'colonias-list__item', marker, c, `
          <strong>${escapeHtml(c.nombre)}</strong>
          ${zona ? `<span class="colonias-list__zone">${escapeHtml(zona)}</span>` : ''}
          ${gatos ? `<span>🐱 ${escapeHtml(gatos)}</span>` : ''}
          ${!hasCoords(c) ? '<span class="colonias-list__nogeo">Ubicación pendiente de confirmar</span>' : ''}`, 40);
      }

      for (const c of conPunto) {
        const p = c.puntoAlimentacion;
        let marker = null;
        if (hasCoords(c)) {
          bounds.push([c.lat, c.lng]);
          marker = L.marker([c.lat, c.lng], {
            icon: L.divIcon({
              className: 'map-pin map-pin--punto',
              html: `<span>${escapeHtml(p.numero)}</span>`,
              iconSize: [32, 32],
            }),
            zIndexOffset: 1000,
            title: `Punto de alimentación nº ${p.numero}: ${p.nombre}`,
          }).addTo(map).bindPopup(popupHtml(c), { maxWidth: 300, autoPanPadding: [20, 20], keepInView: true });
        }
        const gatos = gatosLabel(c.numGatos);
        const aparte = coloniaAparte(c, p);
        addFocusable(puntosEl, 'punto-card', marker, c, `
          ${fotosHtml(p, 'punto-card__photos')}
          <div class="punto-card__body">
            <span class="punto-card__num">Punto nº ${escapeHtml(p.numero)}</span>
            <strong>${escapeHtml(p.nombre)}</strong>
            ${p.ubicacion ? `<span class="colonias-list__zone">${escapeHtml(p.ubicacion)}</span>` : ''}
            ${gatos ? `<span>🐱 ${escapeHtml(gatos)}</span>` : ''}
            ${aparte ? `<span class="colonias-list__zone">Colonia: ${escapeHtml(aparte)}</span>` : ''}
            ${notaPropia(c) ? `<span class="colonias-list__zone">${escapeHtml(notaPropia(c))}</span>` : ''}
          </div>`, 120);
      }

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
      else if (bounds.length === 1) map.setView(bounds[0], 16);
    })
    .catch(() => { emptyEl.hidden = false; });
})();
