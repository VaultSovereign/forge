#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function leafHash(id) {
  return sha256Hex(Buffer.from(id, 'utf8'));
}

function pair(left, right) {
  const [a, b] = [left, right].sort();
  return sha256Hex(Buffer.from(a + b, 'hex'));
}

function buildLayers(leaves) {
  if (leaves.length === 0) {
    throw new Error('no leaves provided');
  }
  const layers = [leaves.slice()];
  let current = leaves.slice();
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? current[i];
      next.push(pair(left, right));
    }
    layers.push(next);
    current = next;
  }
  return layers;
}

function buildProof(targetHash, layers) {
  const proof = [];
  let idx = layers[0].indexOf(targetHash);
  if (idx === -1) {
    return null;
  }
  for (let level = 0; level < layers.length - 1; level++) {
    const layer = layers[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = layer[siblingIdx] ?? layer[idx];
    proof.push({ pos: isRight ? 'left' : 'right', hash: sibling });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

const artifactId = process.argv[2];
const baseDir = process.argv[3] || 'unforged_forge_genesis';

if (!artifactId) {
  console.error('usage: node scripts/merkle_proof.js <artifact_id> [forge_base]');
  process.exit(1);
}

const archiveDir = join(baseDir, 'archive');
let files;
try {
  files = readdirSync(archiveDir).filter((f) => f.startsWith('artifact-') && f.endsWith('.json'));
} catch (error) {
  console.error('[proof] unable to read archive dir:', archiveDir);
  process.exit(1);
}

const ids = files.map((f) => f.replace(/\.json$/u, ''));
if (!ids.includes(artifactId)) {
  console.error('[proof] artifact not found in archive:', artifactId);
  process.exit(2);
}

const leaves = ids
  .map((id) => ({ id, hash: leafHash(id) }))
  .sort((a, b) => a.hash.localeCompare(b.hash));
const leafHashes = leaves.map((entry) => entry.hash);
const layers = buildLayers(leafHashes);
const merkleRoot = layers[layers.length - 1][0];
const targetHash = leafHash(artifactId);
const proof = buildProof(targetHash, layers);

if (!proof) {
  console.error('[proof] failed to build proof path for', artifactId);
  process.exit(2);
}

let archiveRoot = null;
try {
  const checkpointDir = join(baseDir, 'checkpoints');
  const checkpoints = readdirSync(checkpointDir)
    .filter((f) => f.startsWith('checkpoint_') && f.endsWith('.json'))
    .sort();
  if (checkpoints.length > 0) {
    const latest = checkpoints[checkpoints.length - 1];
    const payload = JSON.parse(readFileSync(join(checkpointDir, latest), 'utf8'));
    archiveRoot = payload.archive_root || null;
  }
} catch (error) {
  archiveRoot = null;
}

const bundle = {
  artifact_id: artifactId,
  leaf: targetHash,
  merkle_root: merkleRoot,
  proof,
  checkpoint_archive_root: archiveRoot,
};

console.log(JSON.stringify(bundle, null, 2));
