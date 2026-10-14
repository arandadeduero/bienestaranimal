// Sube en 1 la constante `DATA_VERSION` de los scripts indicados y el `?v=` con el que cada página
// HTML carga ese script. Lo usan los workflows de issues después de modificar un JSON de datos:
// sin esto, el navegador seguiría con el script (o el JSON) cacheado y no vería el cambio.
// Uso: node scripts/bump-data-version.mjs recogidas.js [archivo.js ...]
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bump = (src, re) => src.replace(re, (_, pre, n) => `${pre}${Number(n) + 1}`);

async function htmlFiles() {
  const out = ['index.html'];
  for (const d of await readdir('.', { withFileTypes: true })) {
    if (d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules') {
      out.push(path.join(d.name, 'index.html'));
    }
  }
  return out;
}

for (const file of process.argv.slice(2)) {
  const src = await readFile(file, 'utf8');
  const dataRe = /(const DATA_VERSION = )(\d+)/;
  if (!dataRe.test(src)) throw new Error(`${file}: no se encontró DATA_VERSION`);
  await writeFile(file, bump(src, dataRe));

  const scriptRe = new RegExp(`(${escapeRe(file)}\\?v=)(\\d+)`);
  let paginas = 0;
  for (const html of await htmlFiles()) {
    let page;
    try { page = await readFile(html, 'utf8'); } catch { continue; }
    if (!scriptRe.test(page)) continue;
    await writeFile(html, bump(page, scriptRe));
    paginas++;
  }
  if (!paginas) throw new Error(`${file}: ninguna página lo carga con ?v=`);
  console.log(`${file}: DATA_VERSION y ?v= en ${paginas} página(s) subidos`);
}
