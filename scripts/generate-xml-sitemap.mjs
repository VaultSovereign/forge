#!/usr/bin/env node
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const [root = 'docs', out = 'docs/sitemap.xml', base = 'https://doc.vaultmesh.org'] = process.argv.slice(2);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const urls = [];
for (const p of walk(root)) {
  if (!/\.(html|md)$/i.test(p)) continue;
  // ignore hidden and non-docs
  if (p.includes('/.')) continue;
  // Compute URL path relative to root
  const rel = p.replace(/^\/?\.?\/?/, '').replace(/^docs\//, '');
  let urlPath = rel;
  if (extname(rel).toLowerCase() === '.md') continue; // prefer built html
  urls.push(`${base}/${urlPath}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
  `\n</urlset>\n`;

writeFileSync(out, xml, 'utf8');
console.log(`Wrote ${out} with ${urls.length} URLs`);

