#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: false, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);

let YAML;
try {
  YAML = (await import('yaml')).default;
} catch {
  console.error("Install 'yaml' (pnpm -w add -D yaml)");
  process.exit(1);
}

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.yaml') && !f.endsWith('.yml')) continue;
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const obj = YAML.parse(src);
  const ok = validate(obj);
  if (!ok) {
    console.error(`❌ ${f}`);
    console.error(validate.errors);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${f}`);
  }
}
