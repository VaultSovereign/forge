# ⚔️ Forge Command Language — Starter Repo (Blueprint v1)

[![forge-prepush](https://github.com/VaultSovereign/vaultmesh-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/VaultSovereign/vaultmesh-ai/actions/workflows/ci.yml)
<br><sub>CI & pre-push gates for <strong>vaultmesh-ai</strong></sub>
<br>
[![pages](https://github.com/VaultSovereign/vaultmesh-ai/actions/workflows/pages.yml/badge.svg)](https://github.com/VaultSovereign/vaultmesh-ai/actions/workflows/pages.yml)
<strong>Sales Deck:</strong> <a href="https://VaultSovereign.github.io/vaultmesh-ai/">Live preview (HTML) & PDF</a>
 • <strong>One-Pager:</strong> <a href="https://VaultSovereign.github.io/vaultmesh-ai/one-pager.pdf">PDF</a>
 • <strong>Demo Data:</strong> <a href="https://VaultSovereign.github.io/vaultmesh-ai/demo/">/demo</a>

→ See **[ARTIFACTS.md](./ARTIFACTS.md)** for how to interpret CI downloads (secrets/code review JSON, SBOM, etc.).

**North Star:** Position VaultMesh as Earth's Civilization Ledger — a living archive of law, memory, economy, and guardianship.

This repo is a minimal, sovereign **Prompt OS** that turns tiny commands into full operational scrolls.

## Quickstart

### One-command compliance demo
```bash
make demo-compliance
# -> builds repo, runs DORA ICT Risk + TPRM with sample evidence,
#    writes artifacts/demo/*.json, opens the live sales deck.
```
Artifacts: `artifacts/demo/ict_risk.report.json`, `artifacts/demo/tprm.report.json`.

```bash
# 1) Install deps
pnpm install

# 2) Set your OpenAI key (or use .env)
export OPENAI_API_KEY="sk-..."

# 3) Run: Recon (JSON)
pnpm forge tem-recon @blue --target acme.bank --depth deep --format json

# 4) Run: Fintech deck (Markdown)
pnpm forge deck-fintech @vault "Payments scale-up; ask: 10-day €12k sprint + €15–25k retainer"

# 5) Run: Guardrails check (Markdown)
pnpm forge tem-guardrails @blue \
  --agent "Ops Copilot" \
  --permissions_matrix "./examples/iso27001.yaml" \
  --data_access "crm,s3:reports"
```

> **Safety levels:** read-only (default), advisory, lab-only (pseudocode), restricted.
> No live payloads, no destructive steps, no secrets. Passive recon only unless lab gates are met.

### Codebase audit scroll

```bash
pnpm build
make audit-run
```

Artifacts are written to `artifacts/audit/audit_scroll.json` plus a timestamped copy for every run. The template will self-collect evidence if no bundle exists.

> **Provider note:** ensure one of `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `OLLAMA_HOST` is set (via `export` or `.env`) before running audits locally. Without a provider the CLI will abort once it reaches the model call.

Each run also anchors the scroll into `unforged_forge_genesis/` and emits `artifacts/audit/proof_bundle.json`. Verify locally:

```bash
node scripts/verify-proof.js artifacts/audit/proof_bundle.json
```

Merkle construction: leaves use `sha256(artifact_id)` and parents use `sha256(sorted(left||right))`, duplicating lone nodes for determinism.

To enforce gating locally, drop the advisory semantics:

```bash
make audit-run || echo "audit failed — inspect artifacts/audit"
```

> **Governance note:** CI automatically runs `evolve:verify` (advisory comment) on PRs that touch `catalog/**` or `unforged_forge_genesis/ore/**`. Merges to `main` that update the Ore will `evolve:apply` + `evolve:mint` (plus proof) and upload the receipts—advisory today; remove the advisory flags to gate.
> To enforce this constitutionally, mark the `template-evolution-apply-mint` job as a required branch check (`Settings → Branch protection → main`) and drop the advisory flags (`continue-on-error`, `|| true`).

### Template Index
After each evolution, the CI (and local `pnpm run evolution:index`) writes a deterministic index at `artifacts/evolution/template_index.json`.

- **What:** list of all catalog templates with `id`, `version`, file SHA-256, and last evolution receipt (if any).
- **Why:** Workbench/CLI can render the constitutional status of every template instantly.
- **How:** `scripts/template_index_build.mjs` is dependency-light, offline, and sorts output for reproducibility.

### Council Journal
Every evolution appends a signed, append-only line to `artifacts/evolution/template_journal.jsonl` via `scripts/journal_append.mjs` (CI and `pnpm run evolution:journal`). Each entry records proposal id, versions, repo hash, receipt SHA-256, and—if minted—the anchored artifact/proof root.

## Layout

```
/forge/
  catalog/
    tem/
      reconnaissance.yaml       # tem-recon
      guardrails-checker.yaml   # tem-guardrails
    deck/
      fintech-strike-deck.yaml  # deck-fintech
  dispatcher/
    router.ts
    expander.ts
    safety.ts
    ensureConforms.ts
  profiles/
    vault.yaml
    exec.yaml
    blue.yaml
  schemas/
    prompt.schema.json
    output.schema.json
  cli/
    forge.ts
  logs/                        # JSONL audit (runtime)
  examples/
    commands.md
    iso27001.yaml
```

## Notes

- **Profiles** merge voice + defaults (e.g., `@vault`, `@exec`, `@blue`).
- **Schema refs** use JSON Pointers into `schemas/output.schema.json` (e.g., `#/definitions/tem/recon`).
- **Dispatcher** validates inputs, expands prompts, runs safety preflight, calls the LLM, then validates outputs against the schema.
- **Auto-repair:** if the first model output violates the schema, a single repair pass is attempted.

— VaultMesh · Earth's Civilization Ledger
