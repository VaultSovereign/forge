import path from 'node:path';
import { listTemplates, TemplateListing } from '../dispatcher/router.js';

const cache = new Map<string, TemplateListing>();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function resolveTemplateMeta(projectRoot: string, input: string): Promise<TemplateListing> {
  const key = `${projectRoot}::${input}`;
  if (cache.has(key)) return cache.get(key)!;

  const templates = await listTemplates(projectRoot);
  const byId = new Map<string, TemplateListing>();
  const byKeyword = new Map<string, TemplateListing>();
  const bySlug = new Map<string, TemplateListing>();

  for (const tpl of templates) {
    const id = tpl.id || tpl.keyword;
    byId.set(id, tpl);
    byKeyword.set(tpl.keyword, tpl);
    bySlug.set(slugify(id), tpl);
    bySlug.set(slugify(tpl.keyword), tpl);
  }

  if (byId.has(input)) {
    const hit = byId.get(input)!;
    cache.set(key, hit);
    return hit;
  }
  if (byKeyword.has(input)) {
    const hit = byKeyword.get(input)!;
    cache.set(key, hit);
    return hit;
  }
  const slug = slugify(input);
  if (bySlug.has(slug)) {
    const hit = bySlug.get(slug)!;
    cache.set(key, hit);
    return hit;
  }

  throw new Error(`Template not found: ${input}`);
}
