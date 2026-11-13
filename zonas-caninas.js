// Bienestar Animal Aranda — mapa de zonas de esparcimiento canino (Leaflet + teselas de OpenStreetMap).
// Mismo esquema que colonias-map.js, sin numeración ni censo: marcador, ficha con fotos y listado.
(function () {
  const mapEl = document.getElementById('zonas-map');
  const listEl = document.getElementById('zonas-list');
  const emptyEl = document.getElementById('zonas-empty');
  if (!mapEl || typeof L === 'undefined') return;

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const map = L.map(mapEl).setView([41.6708, -3.6892], 14);
  // Mapa base gris del IGN (organismo público español, CC BY 4.0): las teselas no pasan por
  // servidores de terceros y el gris deja destacar los marcadores naranjas.
  L.tileLayer('https://www.ign.es/wmts/ign-base?request=getTile&layer=IGNBase-gris&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileCol={x}&TileRow={y}&format=image/jpeg', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.ign.es/" target="_blank" rel="noopener">Instituto Geográfico Nacional de España</a>',
  }).addTo(map);

  const fotosHtml = (z, cls) => (z.fotos || []).length
    ? `<div class="${cls}">` + z.fotos.map((src, i) =>
      `<a href="${escapeHtml(src)}">` +
      `<img src="${escapeHtml(src)}" alt="Zona canina ${escapeHtml(z.nombre)}: foto ${i + 1}" width="120" height="160"></a>`
    ).join('') + '</div>'
    : '';

  // Ampliar las fotos en una ventana emergente (<dialog>) en vez de abrirlas en otra pestaña.
  // El listener va en fase de captura porque Leaflet corta la propagación de los clics dentro
  // de los popups del mapa.
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

  // Subir DATA_VERSION cada vez que cambie data/zonas-caninas.json (caché de Cloudflare/GitHub Pages).
  const DATA_VERSION = 1;
  fetch(`data/zonas-caninas.json?v=${DATA_VERSION}`)
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      const zonas = Array.isArray(data) ? data : [];
      emptyEl.hidden = zonas.length > 0;
      const bounds = [];
      for (const z of zonas) {
        bounds.push([z.lat, z.lng]);
        const marker = L.marker([z.lat, z.lng], {
          icon: L.divIcon({ className: 'map-pin map-pin--punto', html: '<span>🐕</span>', iconSize: [32, 32] }),
          title: `Zona de esparcimiento canino: ${z.nombre}`,
        }).addTo(map).bindPopup(`<strong>${escapeHtml(z.nombre)}</strong>${fotosHtml(z, 'pa-photos')}`,
          { maxWidth: 400, autoPanPadding: [20, 20], keepInView: true });

        // Ficha clicable/enfocable: centra el mapa (desplazado al norte para que quepa el popup) y lo abre.
        const li = document.createElement('li');
        li.className = 'punto-card';
        li.tabIndex = 0;
        li.innerHTML = `
          ${fotosHtml(z, 'punto-card__photos')}
          <div class="punto-card__body">
            <strong>${escapeHtml(z.nombre)}</strong>
            ${z.descripcion ? `<span>${escapeHtml(z.descripcion)}</span>` : ''}
          </div>`;
        const focus = () => {
          map.setView(map.unproject(map.project([z.lat, z.lng], 17).subtract([0, 120]), 17), 17, { animate: false });
          marker.openPopup();
        };
        li.addEventListener('click', (e) => { if (!e.target.closest('a')) focus(); });
        li.addEventListener('keydown', (e) => {
          if (e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); focus(); }
        });
        listEl.appendChild(li);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
      else if (bounds.length === 1) map.setView(bounds[0], 16);
    })
    .catch(() => { emptyEl.hidden = false; });
})();
