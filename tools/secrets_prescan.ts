#!/usr/bin/env node
/**
 * VaultMesh Secrets Pre-Scan (read-only)
 * Walks a repository, detects candidate secrets using regex + entropy, and prints JSON array of hits.
 */

import minimist from 'minimist';
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Hit = {
  file: string;
  line: number;
  kind: string;
  snippet: string;
  score: number; // 0..1 (pattern 0.6 + entropy 0.3 + provider 0.1)
  commit_hash?: string;
};

function toArray(input: string | string[] | undefined, sep = ','): string[] {
  if (Array.isArray(input)) return input;
  if (!input) return [];
  try {
    // allow JSON arrays
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Ignore parse failures; fall back to delimiter-based parsing
  }
  return String(input)
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBinaryBuffer(buf: Buffer): boolean {
  // crude check; safe for our purpose
  const sample = buf.slice(0, 1024);
  return sample.includes(0);
}

function shannonEntropy(s: string): number {
  if (!s) return 0;
  const counts: Record<string, number> = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  const len = s.length;
  let h = 0;
  for (const c of Object.values(counts)) {
    const p = c / len;
    h -= p * Math.log2(p);
  }
  return h;
}

function redact(line: string, hints: string[]): string {
  // provider-aware redaction
  if (hints.includes('openrouter')) line = line.replace(/(sk-or-)[A-Za-z0-9]+/g, '$1****');
  if (hints.includes('openai')) line = line.replace(/(sk-)[A-Za-z0-9]{20,}/g, '$1****');
  if (hints.includes('github'))
    line = line.replace(/((ghp|gho|ghu|ghs|ghr)_)[A-Za-z0-9]{24,}/g, '$1****');
  if (hints.includes('aws')) {
    line = line.replace(/(AKIA[0-9A-Z]{16})/g, '$1****');
    line = line.replace(/=[A-Za-z0-9/+=]{40}/g, '=****');
  }
  return line.replace(/=.*/, '=****');
}

async function walk(dir: string, excludeDirs: Set<string>, files: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue;
      await walk(full, excludeDirs, files);
    } else {
      files.push(full);
    }
  }
}

export async function preScan(opts: {
  repositoryPath: string;
  fileExtensions: string[];
  sensitivePatterns: string[];
  commitHistoryDepth: number;
  excludedNames: string[];
  ignoreExamples: boolean;
  entropyThreshold: number;
  minSecretLength: number;
  providerHints: string[];
}): Promise<Hit[]> {
  const hits: Hit[] = [];
  const regexes = opts.sensitivePatterns.map((p) => new RegExp(p, 'i'));
  const excludeSet = new Set(opts.excludedNames);

  const files: string[] = [];
  await walk(opts.repositoryPath, excludeSet, files);

  const allowedExts = new Set(opts.fileExtensions.map((e) => e.toLowerCase()));

  for (const file of files) {
    const rel = path.relative(opts.repositoryPath, file);
    if (!rel || rel.startsWith('.git' + path.sep)) continue;
    const base = path.basename(file);
    const ext = path.extname(file).toLowerCase();
    const allowed = allowedExts.has(ext) || allowedExts.has(base); // allow ".env" by name
    if (!allowed) continue;
    if (
      opts.ignoreExamples &&
      (base === '.env.example' || rel.includes(`${path.sep}examples${path.sep}`))
    )
      continue;

    let raw: Buffer;
    try {
      raw = await fs.readFile(file);
    } catch {
      continue;
    }
    if (isBinaryBuffer(raw)) continue;
    const content = raw.toString('utf8');
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (opts.ignoreExamples && /^\s*(#|\/\/|\/\*)/.test(trimmed)) continue;
      if (opts.ignoreExamples && /(example|test|dummy|changeme)/i.test(trimmed)) continue;

      let match = false;
      let score = 0;
      let kind = 'UNKNOWN';
      let snippet = trimmed;

      for (const rx of regexes) {
        if (rx.test(trimmed)) {
          match = true;
          score += 0.6;
          kind = 'PATTERN_MATCH';
          snippet = redact(trimmed, opts.providerHints);
          break;
        }
      }

      if (!match && trimmed.length >= opts.minSecretLength) {
        const h = shannonEntropy(trimmed);
        if (h >= opts.entropyThreshold) {
          match = true;
          score += 0.3;
          kind = 'HIGH_ENTROPY';
          snippet = redact(trimmed, opts.providerHints);
        }
      }

      if (match && opts.providerHints.some((h) => trimmed.toLowerCase().includes(h))) {
        score += 0.1;
      }

      if (match) {
        hits.push({ file: rel, line: i + 1, kind, snippet, score: Math.min(1, score) });
      }
    }
  }

  // Commit history (best-effort, skip if not a git repo)
  try {
    const commits = execSync(
      `git -C ${opts.repositoryPath} log -n ${opts.commitHistoryDepth} --pretty=%H`,
      {
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
      .toString()
      .split(/\r?\n/)
      .filter(Boolean);

    for (const c of commits) {
      const filesChanged = execSync(
        `git -C ${opts.repositoryPath} show ${c} --name-only --pretty=format:`,
        {
          stdio: ['ignore', 'pipe', 'ignore'],
        }
      )
        .toString()
        .split(/\r?\n/)
        .filter(Boolean);

      for (const f of filesChanged) {
        const ext = path.extname(f).toLowerCase();
        const allowed = allowedExts.has(ext) || allowedExts.has(path.basename(f));
        if (!allowed) continue;
        if (opts.excludedNames.some((n) => f.split(path.sep).includes(n))) continue;

        let content = '';
        try {
          content = execSync(`git -C ${opts.repositoryPath} show ${c}:${f}`, {
            stdio: ['ignore', 'pipe', 'ignore'],
          }).toString();
        } catch {
          continue;
        }
        const lines = content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (!trimmed) continue;
          if (opts.ignoreExamples && /^\s*(#|\/\/|\/\*)/.test(trimmed)) continue;
          if (opts.ignoreExamples && /(example|test|dummy|changeme)/i.test(trimmed)) continue;

          let match = false;
          let score = 0;
          let kind = 'UNKNOWN';
          let snippet = trimmed;

          for (const rx of regexes) {
            if (rx.test(trimmed)) {
              match = true;
              score += 0.6;
              kind = 'PATTERN_MATCH';
              snippet = redact(trimmed, opts.providerHints);
              break;
            }
          }
          if (!match && trimmed.length >= opts.minSecretLength) {
            const h = shannonEntropy(trimmed);
            if (h >= opts.entropyThreshold) {
              match = true;
              score += 0.3;
              kind = 'HIGH_ENTROPY';
              snippet = redact(trimmed, opts.providerHints);
            }
          }
          if (match && opts.providerHints.some((h) => trimmed.toLowerCase().includes(h)))
            score += 0.1;
          if (match)
            hits.push({
              file: f,
              line: i + 1,
              kind,
              snippet,
              score: Math.min(1, score),
              commit_hash: c,
            });
        }
      }
    }
  } catch {
    // not a git repo or no git in PATH
  }

  return hits;
}

async function main() {
  const argv = minimist(process.argv.slice(2));
  const repositoryPath = path.resolve(String(argv.repo || argv.repository || '.'));
  const fileExtensions = toArray(argv.extensions || argv.ext || '.env,.yml,.yaml,.json,.ts,.js');
  const sensitivePatterns = toArray(
    argv.patterns ||
      argv.p ||
      '["OPENAI_API_KEY=sk-[a-zA-Z0-9]{20,}","OPENROUTER_API_KEY=sk-or-[a-zA-Z0-9]{20,}","GITHUB_TOKEN=(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}","AWS_ACCESS_KEY_ID=AKIA[0-9A-Z]{16}","AWS_SECRET_ACCESS_KEY=[A-Za-z0-9/+=]{40}","password=.*"]'
  );
  const commitHistoryDepth = Number(argv.depth || argv.commits || 50);
  const excludedNames = toArray(
    argv.exclude || 'node_modules,dist,build,.git,.next,.turbo,coverage,.nyc_output'
  );
  const ignoreExamples = argv.ignore_examples !== undefined ? Boolean(argv.ignore_examples) : true;
  const entropyThreshold = Number(argv.entropy || 4.0);
  const minSecretLength = Number(argv.min || 20);
  const providerHints = toArray(argv.providers || 'openai,openrouter,github,aws');

  const hits = await preScan({
    repositoryPath,
    fileExtensions,
    sensitivePatterns,
    commitHistoryDepth,
    excludedNames,
    ignoreExamples,
    entropyThreshold,
    minSecretLength,
    providerHints,
  });

  if (argv.json || argv.ndjson === false) {
    process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
  } else {
    // default NDJSON
    for (const h of hits) process.stdout.write(JSON.stringify(h) + '\n');
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error('[secrets-prescan] error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
