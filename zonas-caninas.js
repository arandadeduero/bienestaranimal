// Bienestar Animal Aranda — mapa de zonas de esparcimiento canino (Leaflet + mapa base del IGN;
// utilidades comunes en comun.js). Mismo esquema que colonias-map.js, sin numeración ni censo.
(function () {
  const mapEl = document.getElementById('zonas-map');
  const listEl = document.getElementById('zonas-list');
  const emptyEl = document.getElementById('zonas-empty');
  if (!mapEl || typeof L === 'undefined') return;

  const { escapeHtml } = BA;
  const map = BA.crearMapa(mapEl);
  BA.visorFotos();
  const fotosHtml = (z, cls) => BA.fotosHtml(z.fotos, cls, `Zona canina ${z.nombre}`);

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
          icon: L.divIcon({ className: 'map-pin map-pin--punto map-pin--zona', html: '<span>🐕</span>', iconSize: [32, 32] }),
          title: `Zona de esparcimiento canino: ${z.nombre}`,
        }).addTo(map).bindPopup(`<strong>${escapeHtml(z.nombre)}</strong>${fotosHtml(z, 'pa-photos')}`,
          BA.popupFotos(map, 400));

        const li = document.createElement('li');
        li.className = 'punto-card punto-card--zona';
        li.innerHTML = `
          ${fotosHtml(z, 'punto-card__photos')}
          <div class="punto-card__body">
            <strong>${escapeHtml(z.nombre)}</strong>
            ${z.descripcion ? `<span>${escapeHtml(z.descripcion)}</span>` : ''}
          </div>`;
        BA.fichaEnMapa(li, map, marker, [z.lat, z.lng], 120);
        listEl.appendChild(li);
      }
      BA.encuadrar(map, bounds);
    })
    .catch(() => { emptyEl.hidden = false; });
})();
