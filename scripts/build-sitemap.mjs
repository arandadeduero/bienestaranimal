// Genera sitemap.xml a partir de las páginas reales del sitio (index.html de la raíz y de cada
// carpeta de primer nivel). Toma la URL del <link rel="canonical"> de cada página y omite las que
// llevan <meta name="robots" content="noindex">. Lo ejecuta deploy-pages.yml en cada despliegue,
// así el sitemap refleja siempre las páginas que existen; no hace falta mantenerlo a mano.
//
// Uso: node scripts/build-sitemap.mjs [raíz del sitio]   (por defecto, el directorio actual)

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const IGNORAR = new Set(['node_modules', 'scripts', 'docs', 'img', 'data', 'fonts', 'vendor', 'scratch']);

function paginas() {
  const res = [join(root, 'index.html')];
  for (const nombre of readdirSync(root)) {
    if (nombre.startsWith('.') || IGNORAR.has(nombre)) continue;
    const dir = join(root, nombre);
    if (!statSync(dir).isDirectory()) continue;
    const idx = join(dir, 'index.html');
    try { if (statSync(idx).isFile()) res.push(idx); } catch { /* carpeta sin index.html */ }
  }
  return res;
}

const urls = [];
for (const fichero of paginas()) {
  const html = readFileSync(fichero, 'utf8');
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!m) {
    console.error(`Aviso: ${fichero} no tiene <link rel="canonical">; no se incluye en el sitemap.`);
    continue;
  }
  urls.push(m[1]);
}
urls.sort((a, b) => a.length - b.length || a.localeCompare(b));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(root, 'sitemap.xml'), xml);
console.log(`sitemap.xml generado con ${urls.length} URL:\n  ${urls.join('\n  ')}`);
