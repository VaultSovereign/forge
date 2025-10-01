#!/usr/bin/env node
/**
 * VaultMesh Template Index Builder
 * Deterministically scans the catalog tree, extracts metadata, joins last evolution receipt & proof.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import childProcess from "child_process";
const { default: YAML } = await import("yaml");

const repoRoot = process.cwd();
const catalogDir = path.join(repoRoot, "catalog");
const outDir = path.join(repoRoot, "artifacts", "evolution");
const outFile = path.join(outDir, "template_index.json");
const receiptFile = path.join(outDir, "template_evolution_receipt.json");
const proofFile = path.join(outDir, "proof_bundle.json");

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function gitShortHash() {
  try {
    return childProcess.execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (entry.isFile() && p.endsWith(".yaml")) {
      yield p;
    }
  }
}

function readTemplate(frontPath) {
  const text = fs.readFileSync(frontPath, "utf8");
  const doc = YAML.parseDocument(text);
  const obj = doc.toJS();
  const id = obj?.id ? String(obj.id) : null;
  const keyword = obj?.keyword ? String(obj.keyword) : "";
  const version = obj?.version ? String(obj.version) : "";
  return { id, keyword, version, checksum_sha256: sha256Text(text) };
}

function loadReceiptMap(filePath) {
  try {
    const receipt = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const map = new Map();
    for (const target of receipt.targets || []) {
      if (!target.template_path) continue;
      map.set(target.template_path, {
        proposal_id: receipt.proposal_id || null,
        from_version: target.from_version || null,
        to_version: target.to_version || null,
        applied_at: receipt.applied_at || null,
        repo_hash: receipt.repo_hash || null,
        receipt_path: "artifacts/evolution/template_evolution_receipt.json",
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

function loadProof(filePath) {
  if (!fs.existsSync(filePath)) return { artifact_id: null, proof_root: null };
  try {
    const proof = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      artifact_id: proof.artifact_id || proof.artifactId || null,
      proof_root: proof.merkle_root || proof.root || proof.archive_root || null,
    };
  } catch {
    return { artifact_id: null, proof_root: null };
  }
}

function ensureIndexShape(index) {
  if (index.index_version !== 1) throw new Error("index_version must be 1");
  if (!Array.isArray(index.templates)) throw new Error("templates must be array");
  for (const t of index.templates) {
    if (!t.template_path || !t.id || !t.version || !t.checksum_sha256) {
      throw new Error("template entry missing required fields");
    }
  }
}

const repoHash = await gitShortHash();
const receiptMap = loadReceiptMap(receiptFile);
const proof = loadProof(proofFile);

const rows = [];
for (const filePath of walk(catalogDir)) {
  const rel = path.relative(repoRoot, filePath).split(path.sep).join("/");
  const { id, keyword, version, checksum_sha256 } = readTemplate(filePath);
  if (!id || !version) continue;
  const entry = { template_path: rel, id, keyword, version, checksum_sha256 };
  const last = receiptMap.get(rel);
  if (last) {
    entry.last_evolution = {
      ...last,
      artifact_id: proof.artifact_id,
      proof_root: proof.proof_root,
    };
  }
  rows.push(entry);
}

rows.sort((a, b) => a.template_path.localeCompare(b.template_path));

const index = {
  index_version: 1,
  generated_at: new Date().toISOString(),
  repo_hash: repoHash,
  templates: rows,
};

ensureIndexShape(index);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`[index] wrote ${path.relative(repoRoot, outFile)} (${rows.length} templates)`);
