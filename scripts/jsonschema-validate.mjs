#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';

const [dir, schemaPath, pointer] = process.argv.slice(2);
if (!dir || !schemaPath || !pointer) {
  console.error('Usage: jsonschema-validate.mjs <dir> <schema.json> <json-pointer>');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
let schema = raw;
for (const k of pointer.replace(/^#\//, '').split('/')) {
  schema = schema[k];
}

const ajv = new Ajv({ strict: false, allowUnionTypes: true });
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
