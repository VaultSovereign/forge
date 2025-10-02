import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { fromHere } from '../utils/esm-paths.js';

let yaml: { parse: (s: string) => any } | null = null;
try {
  // lazy load to avoid hard dependency if JSON-only
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  yaml = require('yaml');
} catch {
  yaml = null;
}

export type TemplateMeta = {
  id: string;
  name: string;
  version?: string;
  tags?: string[];
  description?: string;
  updatedAt?: string; // ISO string
  // passthrough extras
  [k: string]: unknown;
};

export type ListParams = {
  limit?: number; // 1..200
  cursor?: string | null;
  filter?: string | null;
};

export type ListResult = {
  items: TemplateMeta[];
  nextCursor: string | null;
  total: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function detectCatalogRoot(): string | null {
  if (process.env.VM_CATALOG_ROOT) {
    const p = path.resolve(process.env.VM_CATALOG_ROOT);
    return fs.existsSync(p) ? p : null;
  }
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'catalog'),
    path.resolve(cwd, '..', 'catalog'),
    path.resolve(cwd, '..', '..', 'catalog'),
    path.resolve(cwd, '..', '..', '..', 'catalog'),
    fromHere(import.meta.url, '../../..', '..', '..', 'catalog'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const CATALOG_ROOT = detectCatalogRoot();

function safeRead(file: string): any | null {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) return JSON.parse(raw);
    if ((file.endsWith('.yaml') || file.endsWith('.yml')) && yaml) return yaml.parse(raw);
    return null;
  } catch {
    return null;
  }
}

function* walkCatalog(dir: string): Generator<TemplateMeta> {
  if (!dir || !fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkCatalog(p);
    } else if (
      e.isFile() &&
      (e.name.endsWith('.yaml') || e.name.endsWith('.yml') || e.name.endsWith('.json'))
    ) {
      const j = safeRead(p);
      if (!j) continue;
      const stem = path.basename(e.name, path.extname(e.name));
      const id = typeof j.id === 'string' && j.id.length > 0 ? (j.id as string) : stem;
      const name = typeof j.name === 'string' && j.name.length > 0 ? (j.name as string) : id;
      const tags = Array.isArray(j.tags) ? (j.tags as string[]) : [];
      const version = typeof j.version === 'string' ? (j.version as string) : undefined;
      const description = typeof j.description === 'string' ? (j.description as string) : undefined;
      const stat = fs.statSync(p);
      const updatedAt = new Date(stat.mtimeMs || Date.now()).toISOString();
      yield { id, name, version, tags, description, updatedAt, ...j } as TemplateMeta;
    }
  }
}

function applyFilter(items: TemplateMeta[], filter: string | null | undefined): TemplateMeta[] {
  if (!filter) return items;
  const f = filter.toLowerCase();
  return items.filter(
    (t) =>
      t.id.toLowerCase().includes(f) ||
      t.name.toLowerCase().includes(f) ||
      (t.tags || []).some((tag) => tag.toLowerCase().includes(f))
  );
}

function makeCursor(id: string): string {
  return crypto.createHash('sha1').update(id).digest('hex');
}

export function listTemplates(params: ListParams = {}): ListResult {
  const dir = CATALOG_ROOT;
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const all = dir
    ? Array.from(walkCatalog(dir)).sort((a, b) => {
        const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        if (tb !== ta) return tb - ta;
        return a.name.localeCompare(b.name);
      })
    : [];

  const filtered = applyFilter(all, params.filter);
  const total = filtered.length;

  let start = 0;
  if (params.cursor) {
    const idx = filtered.findIndex((t) => makeCursor(t.id) === params.cursor);
    if (idx >= 0) start = idx + 1;
  }
  const slice = filtered.slice(start, start + limit);
  const last = slice.at(-1);
  const nextCursor = last ? makeCursor(last.id) : null;

  return { items: slice, nextCursor, total };
}

export function countTemplates(filter: string | null | undefined = undefined): number {
  const dir = CATALOG_ROOT;
  const items = dir ? Array.from(walkCatalog(dir)) : [];
  return applyFilter(items, filter).length;
}
