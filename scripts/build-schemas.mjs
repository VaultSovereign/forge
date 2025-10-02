import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import YAML from 'yaml';

const SRC = 'schemas'; // or "docs/schemas" if you prefer
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

for (const p of walk(SRC)) {
  if (extname(p).toLowerCase() === '.yaml' || extname(p).toLowerCase() === '.yml') {
    const jsonPath = p.replace(/\.ya?ml$/i, '.json');
    const obj = YAML.parse(readFileSync(p, 'utf8'));
    writeFileSync(jsonPath, JSON.stringify(obj, null, 2));
    console.log(`Schema → JSON: ${p} → ${jsonPath}`);
  }
}
