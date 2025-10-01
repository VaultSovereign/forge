import fs from 'node:fs';
import path from 'node:path';
import { listTemplates } from '../providers/catalog.js';

const DEFAULT_ROOT = process.env.VM_CATALOG_ROOT
  ? path.resolve(process.env.VM_CATALOG_ROOT)
  : path.resolve(process.cwd(), 'catalog');

export function resolveTemplateId(id: string): string | null {
  const norm = id.trim();
  // direct file stem
  const directJson = path.join(DEFAULT_ROOT, `${norm}.json`);
  const directYaml = path.join(DEFAULT_ROOT, `${norm}.yaml`);
  if (fs.existsSync(directJson) || fs.existsSync(directYaml)) return norm;

  // dotted path segments demo.echo -> demo/echo.yaml
  const parts = norm.split('.');
  const last = parts.at(-1) ?? norm;
  const dir = parts.length > 1 ? path.join(DEFAULT_ROOT, ...parts.slice(0, -1)) : DEFAULT_ROOT;
  const dottedJson = path.join(dir, `${last}.json`);
  const dottedYaml = path.join(dir, `${last}.yaml`);
  if (fs.existsSync(dottedJson) || fs.existsSync(dottedYaml)) return norm;

  // fallback scan (case-insensitive)
  const { items } = listTemplates({ limit: 200 });
  const hit = items.find(
    (t) => t.id.toLowerCase() === norm.toLowerCase() || (t.name ?? '').toLowerCase() === norm.toLowerCase()
  );
  return hit?.id ?? null;
}

