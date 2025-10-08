#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

async function dynamicImport(name) {
  try {
    return await import(name);
  } catch (error) {
    console.error(`[validate-templates] Missing dependency: ${name}. Install with: pnpm add -D ajv yaml`);
    process.exit(2);
  }
}

const { default: YAML } = await dynamicImport('yaml');
const AjvModule = await dynamicImport('ajv');
const Ajv = AjvModule.default ?? AjvModule;

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(filePath);
    } else {
      yield filePath;
    }
  }
}

function isYaml(file) {
  const lower = file.toLowerCase();
  return lower.endsWith('.yaml') || lower.endsWith('.yml');
}

async function loadSchema() {
  const schemaPath = path.resolve('schemas/template.schema.json');
  const contents = await fs.readFile(schemaPath, 'utf8');
  return JSON.parse(contents);
}

async function main() {
  const schema = await loadSchema();
  const ajv = new Ajv({ strict: true, allErrors: true });
  const validate = ajv.compile(schema);

  const roots = ['catalog'];
  const files = [];
  for (const root of roots) {
    for await (const file of walk(root)) {
      if (isYaml(file)) {
        files.push(file);
      }
    }
  }
  files.sort();

  let ok = true;
  const findings = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const doc = YAML.parse(raw);
    const valid = validate(doc);
    if (!valid) {
      ok = false;
      findings.push({ file, errors: validate.errors });
    }
  }

  const summary = { ok, files: files.length, findings };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
