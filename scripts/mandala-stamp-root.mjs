#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOTS_DIR = "ai-companion-proxy-starter/artifacts/roots";
const SVG_PATH  = "docs/VaultMesh_Mandala.svg";

// pick latest root-YYYY-MM-DD.json
const files = fs.existsSync(ROOTS_DIR)
  ? fs.readdirSync(ROOTS_DIR).filter(f => /^root-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  : [];

if (!files.length) {
  console.error("No Merkle roots found; skipping stamp.");
  process.exit(0);
}

const latestFile = files.at(-1);
const latest = JSON.parse(fs.readFileSync(path.join(ROOTS_DIR, latestFile), "utf8"));

// Extract short hash (first 8 chars) and count
const rootShort = latest.rootHash ? latest.rootHash.slice(0, 8) : (latest.root ? latest.root.slice(0, 8) : "unknown");
const count = latest.count || latest.receiptCount || 0;

// Read SVG and replace placeholder
const svg = fs.readFileSync(SVG_PATH, "utf8")
  .replace(/Merkle root: \{\{ROOT\}\} • count: \{\{COUNT\}\}/,
           `Merkle root: ${rootShort} • count: ${count}`);

fs.writeFileSync(SVG_PATH, svg);
console.log(`✅ Stamped mandala with root ${rootShort} (${count} receipts) from ${latestFile}`);
