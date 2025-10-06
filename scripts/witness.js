#!/usr/bin/env node
// witness.js — zero-dep build/use attestation for Forge
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function sha256File(p) {
  try {
    const data = fs.readFileSync(p);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch { return ''; }
}
function sh(cmd, args, opts={stdio:'inherit'}) {
  const r = spawnSync(cmd, args, opts);
  return r;
}
function shOut(cmd, args) {
  const r = spawnSync(cmd, args, {stdio:['ignore','pipe','pipe']});
  if (r.status !== 0) return '';
  return String(r.stdout||'').toString().trim();
}
function globs(base, candidates) {
  // minimalist glob: walk a few conventional dirs
  const out = [];
  const roots = ['dist','build','out'];
  roots.forEach(dir=>{
    const p = path.join(base, dir);
    if (fs.existsSync(p)) walk(p, out);
  });
  return out;
}
function walk(p, out) {
  const st = fs.statSync(p);
  if (st.isFile()) { out.push(p); return; }
  if (st.isDirectory()) {
    fs.readdirSync(p).forEach(n=>walk(path.join(p,n), out));
  }
}

(async () => {
  const repo = process.cwd();
  // best-effort build & test
  sh('pnpm', ['-w','run','build']);
  sh('pnpm', ['-w','run','test'], {stdio:['ignore','pipe','pipe']}); // do not fail witness on tests

  const pkg = path.join(repo, 'package.json');
  const lock = path.join(repo, 'pnpm-lock.yaml');
  const arts = globs(repo, []);

  const files = {};
  [pkg, lock, ...arts].forEach(f=>{
    if (fs.existsSync(f)) files[path.relative(repo,f)] = sha256File(f);
  });

  const receipt = {
    type: "forge-witness",
    ts: new Date().toISOString(),
    component: "forge",
    node: shOut('node', ['-v']) || 'node?',
    pnpm: shOut('pnpm', ['-v']) || 'pnpm?',
    files
  };
  const day = receipt.ts.slice(0,10);
  const outDir = path.join(repo, 'receipts', 'forge', day);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${receipt.ts.replace(/[:]/g,'-')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(receipt, null, 2));
  console.log(`[witness] ${path.relative(repo, outFile)}`);
})();