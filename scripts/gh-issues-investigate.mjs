#!/usr/bin/env node
// Simple GitHub Issues investigator
// Usage:
//   node scripts/gh-issues-investigate.mjs [--repo owner/name] [--since 7d|2025-10-02T00:00:00Z] [--state open|closed|all] [--query "text"] [--limit 50]
// Env: GITHUB_TOKEN or GH_TOKEN (recommended), GITHUB_REPO (optional)

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo') out.repo = argv[++i];
    else if (a === '--since') out.since = argv[++i];
    else if (a === '--state') out.state = argv[++i];
    else if (a === '--query') out.query = argv[++i];
    else if (a === '--limit') out.limit = Number(argv[++i] ?? '0') || 0;
  }
  return out;
}

function getDefaultRepoFromPkg() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
    const url = pkg?.repository?.url || '';
    const m = String(url).match(/github\.com[:/]+([^/]+)\/([^/.#]+)(?:\.git)?/i);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // ignore
  }
  return null;
}

function parseSince(input) {
  if (!input) return null;
  const m = String(input).match(/^(\d+)([dhm])$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const now = Date.now();
    const ms = unit === 'd' ? n * 24 * 3600e3 : unit === 'h' ? n * 3600e3 : n * 60e3;
    return new Date(now - ms).toISOString();
  }
  const dt = new Date(input);
  if (!isNaN(dt.getTime())) return dt.toISOString();
  return null;
}

async function ghRequest(endpoint, opts = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const headers = {
    'user-agent': 'forge-gh-issues-investigator',
    accept: 'application/vnd.github+json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const url = `https://api.github.com${endpoint}`;
  const res = await fetch(url, { headers, method: 'GET', ...opts });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${txt.slice(0, 400)}`);
  }
  const remaining = res.headers.get('x-ratelimit-remaining');
  const limit = res.headers.get('x-ratelimit-limit');
  if (remaining && limit) {
    console.error(`[gh] rate-limit: ${remaining}/${limit} remaining`);
  }
  return res.json();
}

function fmtIssue(i) {
  const labels = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
  return [
    `#${i.number} ${i.title}`,
    `  state: ${i.state}${i.state_reason ? ` (${i.state_reason})` : ''}`,
    `  labels: ${labels.join(', ') || '—'}`,
    `  author: ${i.user?.login || 'unknown'}`,
    `  updated: ${i.updated_at}`,
    `  url: ${i.html_url}`,
  ].join('\n');
}

async function main() {
  // Load .env if present (best-effort; do not print secrets)
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const s = line.trim();
        if (!s || s.startsWith('#') || !s.includes('=')) continue;
        const idx = s.indexOf('=');
        const key = s.slice(0, idx).trim();
        const value = s.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch {}

  const args = parseArgs(process.argv);
  const repo = args.repo || process.env.GITHUB_REPO || getDefaultRepoFromPkg();
  if (!repo) {
    console.error('Repo not provided. Use --repo owner/name or set GITHUB_REPO.');
    process.exit(2);
  }
  const [owner, name] = repo.split('/');
  const state = args.state || 'open';
  const limit = Math.max(1, Math.min(Number(args.limit || 50), 100));
  const sinceISO = parseSince(args.since || '7d');

  if (args.query) {
    const q = encodeURIComponent(`repo:${repo} type:issue ${args.query}`);
    const data = await ghRequest(`/search/issues?q=${q}&per_page=${limit}`);
    console.log(`Found ${data.total_count} matching issues (showing up to ${limit})`);
    for (const item of data.items || []) {
      console.log(fmtIssue(item));
    }
    return;
  }

  const params = new URLSearchParams();
  params.set('state', state);
  params.set('per_page', String(limit));
  if (sinceISO) params.set('since', sinceISO);
  const issues = await ghRequest(`/repos/${owner}/${name}/issues?${params.toString()}`);
  if (!Array.isArray(issues)) {
    console.error('Unexpected response shape');
    process.exit(1);
  }

  const openBugs = issues.filter((i) =>
    (i.labels || []).some((l) => (typeof l === 'string' ? l : l.name) === 'bug')
  );
  const verifyMentions = issues.filter((i) =>
    /verifyEvent|verify\s+button|risk\s+verify/i.test(`${i.title}\n${i.body || ''}`)
  );

  console.log(`Issues (${state}) since ${sinceISO || 'N/A'} — showing up to ${limit}`);
  for (const i of issues) {
    console.log(fmtIssue(i));
  }
  if (openBugs.length) {
    console.log(`\nOpen bugs: ${openBugs.length}`);
    for (const i of openBugs) console.log(fmtIssue(i));
  }
  if (verifyMentions.length) {
    console.log(`\nMentions of verifyEvent/verify button: ${verifyMentions.length}`);
    for (const i of verifyMentions) console.log(fmtIssue(i));
  }
}

main().catch((err) => {
  console.error('[gh] error:', err?.message || err);
  process.exit(1);
});
