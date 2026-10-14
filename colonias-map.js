// Peluditos — mapa de colonias felinas (Leaflet + teselas de OpenStreetMap).
(function () {
  const ARANDA_CENTER = [41.6708, -3.6892]; // Aranda de Duero (centro aprox.)
  const mapEl = document.getElementById('colonias-map');
  const listEl = document.getElementById('colonias-list');
  const emptyEl = document.getElementById('colonias-empty');
  const paListEl = document.getElementById('puntos-alimentacion-list');
  const paEmptyEl = document.getElementById('puntos-alimentacion-empty');
  if (!mapEl || typeof L === 'undefined') return;

  const escapeHtml = (s) =>
    (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const map = L.map(mapEl).setView(ARANDA_CENTER, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(map);

  const foodIcon = L.divIcon({ className: 'pa-marker', html: '🍽️', iconSize: [28, 28] });
  const allBounds = [];

  const gatosLabel = (n) => {
    if (n == null || n === '') return '';
    if (typeof n === 'number') return `${n} gatos aprox.`;
    return n === 'Desconocido' ? 'Número de gatos no conocido' : String(n);
  };

  function popupHtml(c) {
    const gatos = gatosLabel(c.numGatos);
    return `
      <strong>${escapeHtml(c.nombre)}</strong><br>
      ${escapeHtml(c.zona || '')}
      ${gatos ? `<br>🐱 ${escapeHtml(gatos)}` : ''}
      ${c.descripcion ? `<br><span>${escapeHtml(c.descripcion)}</span>` : ''}`;
  }

  function popupHtmlPunto(p) {
    const fotos = (Array.isArray(p.fotos) ? p.fotos : [])
      .map((src, i) => `<a href="${escapeHtml(src)}" target="_blank" rel="noopener">` +
        `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.nombre)}, foto ${i + 1}" width="120" height="160"></a>`)
      .join('');
    return `
      <strong>🍽️ ${escapeHtml(p.nombre)}</strong>
      ${p.ubicacion ? `<br><span>${escapeHtml(p.ubicacion)}</span>` : ''}
      <br><span>Punto de alimentación autorizado para colonias felinas</span>
      ${fotos ? `<div class="pa-photos">${fotos}</div>` : ''}`;
  }

  // Un <li> clicable que centra el mapa y abre el popup del marcador correspondiente.
  function addFocusableItem(container, cls, marker, lat, lng, html, offsetY = 40) {
    const li = document.createElement('li');
    li.className = cls;
    li.innerHTML = html;
    li.tabIndex = 0;
    // El popup se abre encima del marcador: centramos el mapa `offsetY` px al norte para que el
    // marcador quede por debajo del centro y el popup (más alto si lleva fotos) entre entero.
    const focus = () => {
      const target = map.unproject(map.project([lat, lng], 17).subtract([0, offsetY]), 17);
      map.setView(target, 17, { animate: false });
      marker.openPopup();
    };
    li.addEventListener('click', focus);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focus(); } });
    container.appendChild(li);
  }

  const colonias = fetch('data/colonias.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const colonias = Array.isArray(data) ? data : [];
      emptyEl.hidden = colonias.length > 0;

      for (const c of colonias) {
        const hasCoords = typeof c.lat === 'number' && typeof c.lng === 'number';
        let marker = null;
        if (hasCoords) {
          allBounds.push([c.lat, c.lng]);
          marker = L.marker([c.lat, c.lng]).addTo(map).bindPopup(popupHtml(c));
        }

        const gatos = gatosLabel(c.numGatos);
        const html = `
          <strong>${escapeHtml(c.nombre)}</strong>
          <span class="colonias-list__zone">${escapeHtml(c.zona || '')}</span>
          ${gatos ? `<span>🐱 ${escapeHtml(gatos)}</span>` : ''}
          ${!hasCoords ? '<span class="colonias-list__nogeo">Ubicación pendiente de confirmar</span>' : ''}`;
        if (hasCoords) addFocusableItem(listEl, 'colonias-list__item', marker, c.lat, c.lng, html);
        else {
          const li = document.createElement('li');
          li.className = 'colonias-list__item';
          li.innerHTML = html;
          listEl.appendChild(li);
        }
      }
    })
    .catch(() => { emptyEl.hidden = false; });

  const puntos = fetch('data/puntos-alimentacion.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const puntos = Array.isArray(data) ? data : [];
      if (paEmptyEl) paEmptyEl.hidden = puntos.length > 0;

      for (const p of puntos) {
        const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
        if (!hasCoords) continue;
        allBounds.push([p.lat, p.lng]);
        const marker = L.marker([p.lat, p.lng], { icon: foodIcon }).addTo(map).bindPopup(popupHtmlPunto(p), { maxWidth: 300, autoPanPadding: [20, 20], keepInView: true });
        if (paListEl) {
          const html = `
            <strong>🍽️ ${escapeHtml(p.nombre)}</strong>
            <span class="colonias-list__zone">${escapeHtml(p.ubicacion || '')}</span>`;
          addFocusableItem(paListEl, 'colonias-list__item', marker, p.lat, p.lng, html, 120);
        }
      }
    })
    .catch(() => { if (paEmptyEl) paEmptyEl.hidden = false; });

  Promise.all([colonias, puntos]).then(() => {
    if (allBounds.length > 1) map.fitBounds(allBounds, { padding: [30, 30] });
    else if (allBounds.length === 1) map.setView(allBounds[0], 16);
  });
})();
