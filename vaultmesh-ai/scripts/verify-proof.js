#!/usr/bin/env node
import { readFileSync } from 'fs';
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

const bundlePath = process.argv[1 + 1];
if (!bundlePath) {
  console.error('usage: node scripts/verify-proof.js <proof_bundle.json>');
  process.exit(1);
}

let bundle;
try {
  bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
} catch (error) {
  console.error('[verify] failed to read bundle:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const {
  artifact_id: artifactId,
  leaf,
  merkle_root: expectedRoot,
  proof = [],
  checkpoint_archive_root: checkpointRoot = null,
} = bundle;

if (!artifactId || !expectedRoot) {
  console.error('[verify] bundle missing artifact_id or merkle_root');
  process.exit(1);
}

let hash = leaf || leafHash(artifactId);
if (typeof hash !== 'string') {
  console.error('[verify] invalid leaf hash in bundle');
  process.exit(1);
}

for (const step of proof) {
  if (!step || typeof step.hash !== 'string') {
    console.error('[verify] malformed proof step');
    process.exit(1);
  }
  hash = pair(hash, step.hash);
}

const okRoot = hash === expectedRoot;
const okCheckpoint = checkpointRoot ? expectedRoot === checkpointRoot : true;

const result = {
  artifact_id: artifactId,
  recomputed_root: hash,
  expected_root: expectedRoot,
  okRoot,
  okCheckpoint,
};

console.log(JSON.stringify(result, null, 2));
process.exit(okRoot ? 0 : 2);
