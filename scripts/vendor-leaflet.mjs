// Descarga una versión de Leaflet del registro de npm y la deja en vendor/leaflet/ (JS, CSS e
// imágenes que usa el CSS), escribe vendor/leaflet/VERSION y actualiza el ?v= con el que
// mapa-colonias/index.html carga leaflet.css y leaflet.js. Así el mapa no hace peticiones a
// ningún CDN y la caché se invalida sola al cambiar de versión.
//
// Uso: node scripts/vendor-leaflet.mjs <versión>      (p. ej. 1.9.4)
// Lo ejecuta a mano quien actualice, o el workflow leaflet-update.yml cuando sale una versión nueva.

import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? '')) {
  console.error('Uso: node scripts/vendor-leaflet.mjs <versión>  (p. ej. 1.9.4)');
  process.exit(1);
}

const root = new URL('..', import.meta.url).pathname;
const dest = join(root, 'vendor', 'leaflet');
const html = join(root, 'mapa-colonias', 'index.html');

// 1. Metadatos del paquete en npm: URL del tarball y su integridad (sha512) para comprobarla.
const meta = await (await fetch(`https://registry.npmjs.org/leaflet/${version}`)).json();
if (!meta.dist?.tarball) throw new Error(`Leaflet ${version} no existe en npm`);
const tgz = Buffer.from(await (await fetch(meta.dist.tarball)).arrayBuffer());
const sha512 = 'sha512-' + createHash('sha512').update(tgz).digest('base64');
if (sha512 !== meta.dist.integrity) throw new Error(`El tarball no coincide con la integridad publicada en npm (${meta.dist.integrity})`);

// 2. Extraer solo dist/ y copiar lo que usa el sitio.
const tmp = mkdtempSync(join(tmpdir(), 'leaflet-'));
try {
  writeFileSync(join(tmp, 'leaflet.tgz'), tgz);
  execFileSync('tar', ['-xzf', 'leaflet.tgz', 'package/dist', 'package/LICENSE'], { cwd: tmp });
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const f of ['leaflet.js', 'leaflet.css']) cpSync(join(tmp, 'package', 'dist', f), join(dest, f));
  cpSync(join(tmp, 'package', 'dist', 'images'), join(dest, 'images'), { recursive: true });
  cpSync(join(tmp, 'package', 'LICENSE'), join(dest, 'LICENSE'));
  writeFileSync(join(dest, 'VERSION'), version + '\n');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 3. Versionar la carga en el HTML con el número de versión de Leaflet.
let s = readFileSync(html, 'utf8');
const antes = s;
s = s.replace(/vendor\/leaflet\/leaflet\.css\?v=[^"]+/g, `vendor/leaflet/leaflet.css?v=${version}`);
s = s.replace(/vendor\/leaflet\/leaflet\.js\?v=[^"]+/g, `vendor/leaflet/leaflet.js?v=${version}`);
if (s === antes) console.warn('Aviso: mapa-colonias/index.html no tenía referencias a vendor/leaflet que actualizar.');
writeFileSync(html, s);

console.log(`Leaflet ${version} en vendor/leaflet/ (tarball verificado: ${sha512.slice(0, 24)}…)`);
