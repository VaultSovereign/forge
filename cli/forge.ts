#!/usr/bin/env node
import minimist from 'minimist';
import path from 'path';
import { fileURLToPath } from 'url';

import { runKeyword } from '../dispatcher/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function help() {
  console.log(`
Forge — minimal Prompt OS

Usage:
  pnpm forge <keyword> [@profile] [notes...] [--flags]

Examples:
  pnpm forge tem-recon @blue --target acme.bank --depth deep --format json
  pnpm forge deck-fintech @vault "KYC automation + cyber defence for payments startup"
  pnpm forge tem-guardrails @blue --agent "Backoffice LLM" --permissions_matrix iso27001.yaml --data_access "crm,s3:reports"

Flags:
  --format <json|yaml|markdown>
  --depth <shallow|moderate|deep>
  --scope <public|in-scope|out-of-scope>
  --lab (requires ROE_TOKEN in env)
`);
}

async function main() {
  const argv = minimist(process.argv.slice(2), { string: ['_'] }) as minimist.ParsedArgs;
  if (argv._.length === 0 || argv.help || argv.h) {
    help();
    return;
  }
  const tokens = argv._ as string[];
  let profile: string | null = null;
  let keyword = '';
  const free: string[] = [];

  for (const t of tokens) {
    if (t.startsWith('@')) profile = t.slice(1);
    else if (!keyword && /^[a-z]+-[a-z]+(-[a-z]+)?$/.test(t)) keyword = t;
    else free.push(t);
  }

  if (!keyword) {
    help();
    process.exit(1);
  }

  const notes = free.join(' ');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _: _unused, ...restFlags } = argv;
  const flags = { ...restFlags } as Record<string, unknown>;

  try {
    const out = await runKeyword({ projectRoot, keyword, profileName: profile, flags, notes });
    if (typeof out === 'string') {
      console.log(out);
    } else {
      const fmt = typeof flags.format === 'string' ? flags.format.toLowerCase() : '';
      if (fmt === 'json') console.log(JSON.stringify(out, null, 2));
      else if (out && typeof out === 'object' && 'markdown' in out)
        console.log((out as any).markdown);
      else console.log(JSON.stringify(out, null, 2));
    }
  } catch (e: any) {
    console.error('[forge] ERROR:', e?.message || e);
    process.exit(1);
  }
}

main();
