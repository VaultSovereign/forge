#!/usr/bin/env node
/**
 * VaultMesh checkpoint sealer — deterministic Merkle root from archive.
 *
 * Used in CI: .github/workflows/ci.yml (evolution checkpoint sealing)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import childProcess from 'child_process';

const args = process.argv.slice(2);
let baseDir = args.find((a) => !a.startsWith('-')) || 'unforged_forge_genesis';
const strict = args.includes('--strict');
const updateIndex = !args.includes('--no-index');
baseDir = path.resolve(baseDir);

function sha256Hex(input) {
  const h = crypto.createHash('sha256');
  if (typeof input === 'string') h.update(input, 'utf8');
  else h.update(input);
  return h.digest('hex');
}

function listArtifacts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('artifact-') && f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

function merkleRoot(ids) {
  if (ids.length === 0) return sha256Hex('');
  let layer = ids.map((id) => sha256Hex(id)).sort();
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i];
      const [a, b] = [left, right].sort();
      const buf = Buffer.from(a + b, 'hex');
      next.push(sha256Hex(buf));
    }
    layer = next;
  }
  return layer[0];
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, obj) {
  const ordered = sort(objectToSorted(obj));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
}

function objectToSorted(value) {
  if (Array.isArray(value)) return value.map(objectToSorted);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = objectToSorted(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function sort(value) {
  return value;
}

function deriveStateRoot(genesisPath) {
  let ghash = 'genesis-unknown';
  if (fs.existsSync(genesisPath)) {
    const txt = fs.readFileSync(genesisPath, 'utf8');
    ghash = sha256Hex(txt);
  }
  return sha256Hex(`${ghash}|state`);
}

function gitShortHash() {
  try {
    return childProcess
      .execSync('git rev-parse --short HEAD', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

if (!fs.existsSync(baseDir)) {
  console.error(`[seal] base dir not found: ${baseDir}`);
  process.exit(strict ? 2 : 0);
}

const archiveDir = path.join(baseDir, 'archive');
const checkpointsDir = path.join(baseDir, 'checkpoints');
const genesisPath = path.join(baseDir, 'genesis.json');
const artifactIndex = path.join(baseDir, 'artifact_index.json');

const ids = listArtifacts(archiveDir);
if (ids.length === 0) {
  console.error('[seal] no artifacts found; skipping checkpoint');
  process.exit(strict ? 1 : 0);
}

const root = merkleRoot(ids);

let lastHeight = 0;
let stateRoot = deriveStateRoot(genesisPath);
if (fs.existsSync(checkpointsDir)) {
  const files = fs
    .readdirSync(checkpointsDir)
    .filter((f) => /^checkpoint_\d+\.json$/.test(f))
    .sort();
  if (files.length) {
    const latest = files[files.length - 1];
    lastHeight = Number(latest.match(/(\d+)\.json$/)[1]);
    try {
      stateRoot = readJSON(path.join(checkpointsDir, latest)).state_root || stateRoot;
    } catch {}
  }
}

const nextHeight = lastHeight + 1;
const checkpoint = {
  height: nextHeight,
  state_root: stateRoot,
  archive_root: root,
  quorum_signatures: [],
};

const filename = `checkpoint_${String(nextHeight).padStart(4, '0')}.json`;
writeJSON(path.join(checkpointsDir, filename), checkpoint);

if (updateIndex) {
  const index = {
    mesh: 'Unforged-Forge',
    artifacts: ids,
    merkle_root: root,
    created: Math.floor(Date.now() / 1000),
  };
  writeJSON(artifactIndex, index);
  console.log(`[seal] index → ${artifactIndex}`);
}

const checkpointPath = path.join(checkpointsDir, filename);
console.log(`[seal] checkpoint → ${checkpointPath}`);
console.log(`[seal] STATE:  ${stateRoot}`);
console.log(`[seal] ARCH:   ${root}`);
