#!/usr/bin/env node
/**
 * VaultMesh Template Journal Appender (JSONL)
 * Appends one line per amended template to artifacts/evolution/template_journal.jsonl.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import childProcess from "child_process";

const ROOT = process.cwd();
const EVO_DIR = path.join(ROOT, "artifacts", "evolution");
const RECEIPT = path.join(EVO_DIR, "template_evolution_receipt.json");
const PROOF = path.join(EVO_DIR, "proof_bundle.json");
const JOURNAL = path.join(EVO_DIR, "template_journal.jsonl");
const TAIL_SIZE = 1024 * 1024; // 1 MiB

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function gitShortHash() {
  try {
    return childProcess.execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
  } catch {
    return "unknown";
  }
}

function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function requireFile(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`[journal] missing ${label}: ${path.relative(ROOT, p)}`);
    process.exit(2);
  }
}

function dedupHasLine(journalPath, key) {
  if (!fs.existsSync(journalPath)) return false;
  const stats = fs.statSync(journalPath);
  const size = Math.min(TAIL_SIZE, stats.size);
  const start = Math.max(0, stats.size - size);
  const buffer = Buffer.alloc(size);
  const fd = fs.openSync(journalPath, "r");
  fs.readSync(fd, buffer, 0, size, start);
  fs.closeSync(fd);
  const segment = buffer.toString("utf8");
  return segment.split("\n").some((line) => line.includes(`"dedup_key":"${key}"`));
}

function stableJSONStringify(o) {
  const ordered = {};
  for (const key of Object.keys(o).sort()) {
    ordered[key] = o[key];
  }
  return JSON.stringify(ordered);
}

requireFile(RECEIPT, "evolution receipt");

const receipt = readJSONSafe(RECEIPT);
if (!receipt || !Array.isArray(receipt.targets) || receipt.targets.length === 0) {
  console.error("[journal] malformed or empty receipt");
  process.exit(2);
}

const repo_hash = gitShortHash();
const receipt_sha256 = sha256File(RECEIPT);
const proof = readJSONSafe(PROOF) || {};
const artifact_id = proof.artifact_id || proof.artifactId || null;
const proof_root = proof.merkle_root || proof.root || proof.archive_root || null;

fs.mkdirSync(path.dirname(JOURNAL), { recursive: true });
const fd = fs.openSync(JOURNAL, "a");

for (const target of receipt.targets) {
  const template_path = target.template_path;
  if (!template_path) continue;
  const dedup_key = `${receipt_sha256}|${template_path}`;
  if (dedupHasLine(JOURNAL, dedup_key)) {
    continue;
  }

  const line = {
    applied_at: receipt.applied_at || new Date().toISOString(),
    repo_hash,
    proposal_id: receipt.proposal_id || null,
    template_path,
    from_version: target.from_version || null,
    to_version: target.to_version || null,
    receipt_path: "artifacts/evolution/template_evolution_receipt.json",
    receipt_sha256,
    artifact_id,
    proof_root,
    dedup_key,
  };

  fs.writeSync(fd, stableJSONStringify(line) + "\n", null, "utf8");
}

fs.closeSync(fd);
console.log(`[journal] appended → ${path.relative(ROOT, JOURNAL)}`);
