#!/usr/bin/env node
// Lightweight, deterministic snippet selector for large source docs.
// - Splits Markdown by headings and paragraphs
// - Computes simple TF score against a query string
// - Emits top sections up to a size cap (chars)
//
// Usage:
//   node scripts/select-snippets.mjs \
//     --source docs/sources/operations/risk_register.md \
//     --query "risk, control, vendor, outage" \
//     --limit 4000
//
// Prints selected snippets to stdout. Redirect and pass into template as SOURCE_SNIPPETS.

import { promises as fs } from 'fs';
import path from 'path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k?.startsWith('--')) {
      args[k.slice(2)] = v && !v.startsWith('--') ? v : true;
      if (v && !v.startsWith('--')) i += 1;
    }
  }
  return args;
}

function splitSections(md) {
  const blocks = md
    .split(/\n(?=#)/) // split before headings
    .flatMap((sec) => sec.split(/\n\n+/)); // paragraphs
  return blocks.map((b) => b.trim()).filter(Boolean);
}

function score(section, terms) {
  const text = section.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!t) continue;
    const term = t.toLowerCase().trim();
    if (!term) continue;
    const re = new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
    const matches = text.match(re);
    s += matches ? matches.length : 0;
  }
  // Prefer heading blocks
  if (/^#/.test(section)) s += 1;
  return s;
}

async function main() {
  const args = parseArgs(process.argv);
  const source = String(args.source || 'docs/sources/operations/risk_register.md');
  const limit = Math.max(500, Number(args.limit || 3500));
  const query = String(args.query || '').split(/[,\s]+/);

  const p = path.resolve(process.cwd(), source);
  const raw = await fs.readFile(p, 'utf8');
  const sections = splitSections(raw);

  const ranked = sections.map((sec) => ({ sec, s: score(sec, query) })).sort((a, b) => b.s - a.s);

  const out = [];
  let used = 0;
  for (const { sec } of ranked) {
    if (used + sec.length + 2 > limit) break;
    out.push(sec);
    used += sec.length + 2;
  }

  process.stdout.write(out.join('\n\n'));
}

main().catch((err) => {
  console.error('[select-snippets] failed:', err?.message || String(err));
  process.exit(1);
});
