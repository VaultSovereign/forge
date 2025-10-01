#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import childProcess from "child_process";

const { default: YAML } = await import("yaml");

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function execGit(cmd) {
  try {
    return childProcess.execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}

function setTopLevelVersion(yamlText, newVersion) {
  const doc = YAML.parseDocument(yamlText);
  doc.set("version", newVersion);
  return String(doc);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const sorted = sortKeys(obj);
  fs.writeFileSync(p, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortKeys(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let proposalPath = null;
  let repoRoot = ".";
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--repo-root") {
      i += 1;
      repoRoot = args[i];
    } else if (!proposalPath) {
      proposalPath = arg;
    }
  }
  if (!proposalPath) {
    console.error("usage: node scripts/template_evolution_apply.mjs <proposal.json> [--repo-root .]");
    process.exit(2);
  }
  return { proposalPath, repoRoot };
}

const { proposalPath, repoRoot } = parseArgs();
const proposal = readJSON(proposalPath);
if (proposal.ore_type !== "template_evolution.v1") {
  console.error("ore_type must be 'template_evolution.v1'");
  process.exit(2);
}

const results = [];
for (const target of proposal.targets || []) {
  const templatePath = target.template_path;
  const fullPath = path.join(repoRoot, templatePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[apply] template not found: ${fullPath}`);
    process.exit(1);
  }
  const before = fs.readFileSync(fullPath, "utf8");
  const hashBefore = sha256(before);
  const match = before.match(/^\s*version:\s*["']?([\w.\-]+)["']?/m);
  const currentVersion = match ? match[1] : "";
  if (currentVersion !== target.from_version) {
    console.error(`[apply] version mismatch in ${templatePath}: file=${currentVersion}, expected=${target.from_version}`);
    process.exit(1);
  }

  const after = setTopLevelVersion(before, target.to_version);
  fs.writeFileSync(fullPath, after, "utf8");
  const hashAfter = sha256(after);

  results.push({
    template_path: templatePath,
    from_version: target.from_version,
    to_version: target.to_version,
    deprecation_window_days: target.deprecation_window_days ?? null,
    hash_before: hashBefore,
    hash_after: hashAfter,
  });
}

const receipt = {
  receipt_type: "template_evolution_receipt.v1",
  proposal_id: proposal.proposal_id,
  proposed_at: proposal.proposed_at,
  applied_at: new Date().toISOString(),
  repo_hash: execGit("git rev-parse --short HEAD"),
  targets: results,
  rationale: proposal.rationale || "",
};

writeJSON("artifacts/evolution/template_evolution_receipt.json", receipt);
console.log("[apply] OK — receipt → artifacts/evolution/template_evolution_receipt.json");
