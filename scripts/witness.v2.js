#!/usr/bin/env node
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ARTIFACT_DIRS = ['dist', 'build', 'out'];
const EXTRA_FILES = ['package.json', 'pnpm-lock.yaml'];

function sha256Hex(buf) {
  const h = crypto.createHash('sha256');
  h.update(buf);
  return h.digest('hex');
}

function canonicalize(value) {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    if (!Number.isFinite(value)) return null;
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : canonicalize(v)));
  if (t === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      const v = value[k];
      if (v === undefined) continue;
      out[k] = canonicalize(v);
    }
    return out;
  }
  return JSON.parse(JSON.stringify(value));
}

function canonicalJSONString(value) {
  return JSON.stringify(canonicalize(value));
}

async function sha256File(filePath) {
  const h = crypto.createHash('sha256');
  const rs = createReadStream(filePath);
  await new Promise((resolve, reject) => {
    rs.on('data', (chunk) => h.update(chunk));
    rs.on('end', resolve);
    rs.on('error', reject);
  });
  return h.digest('hex');
}

async function listFilesRecursive(relDir) {
  const dir = path.join(ROOT, relDir);
  const out = [];
  try {
    const stack = [dir];
    while (stack.length) {
      const d = stack.pop();
      const entries = await fs.readdir(d, { withFileTypes: true });
      for (const ent of entries) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) stack.push(p);
        else out.push(p);
      }
    }
  } catch {
  }
  return out;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function merkleRoot(hashes) {
  if (!hashes.length) return sha256Hex(Buffer.from(''));
  let level = hashes.map((hex) => Buffer.from(hex, 'hex'));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      const h = crypto.createHash('sha256');
      h.update(left);
      h.update(right);
      next.push(h.digest());
    }
    level = next;
  }
  return level[0].toString('hex');
}

async function main() {
  const day = today();
  const receiptsDir = path.join(ROOT, 'receipts', 'forge', day);
  await fs.mkdir(receiptsDir, { recursive: true });

  const files = new Set();
  for (const d of ARTIFACT_DIRS) {
    const list = await listFilesRecursive(d);
    list.forEach((abs) => files.add(path.relative(ROOT, abs)));
  }
  for (const f of EXTRA_FILES) {
    try {
      await fs.access(path.join(ROOT, f));
      files.add(f);
    } catch {}
  }

  const entries = [];
  for (const rel of Array.from(files).sort()) {
    const abs = path.join(ROOT, rel);
    const stat = await fs.stat(abs);
    if (!stat.isFile()) continue;
    const hash = await sha256File(abs);
    entries.push({
      path: rel.replaceAll('\\', '/'),
      size: stat.size,
      sha256: hash,
    });
  }

  const receipt = {
    version: 1,
    service: 'forge',
    createdAt: new Date().toISOString(),
    artifacts: entries,
  };

  const receiptPath = path.join(receiptsDir, 'receipt.json');
  await fs.writeFile(receiptPath, canonicalJSONString(receipt));

  const root = merkleRoot(entries.map((e) => e.sha256));
  const rootTxt = `root:${root}\nfiles:${entries.length}\ndate:${day}\n`;
  const rootPath = path.join(ROOT, 'receipts', 'ROOT.txt');
  await fs.writeFile(rootPath, rootTxt);

  const lastRootPath = path.join(ROOT, 'receipts', 'LAST_ROOT.txt');
  await fs.writeFile(lastRootPath, rootTxt);

  const summaryPath = path.join(receiptsDir, 'summary.json');
  await fs.writeFile(summaryPath, canonicalJSONString({ root, files: entries.length, day }));

  console.log(JSON.stringify({ ok: true, receiptPath, root, files: entries.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
