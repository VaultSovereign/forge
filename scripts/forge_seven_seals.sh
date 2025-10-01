#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." && pwd -P)"

say() { printf "⚔️  %s\n" "$*"; }

# ---------- helpers ----------
ensure_parent() { mkdir -p "$(dirname "$1")"; }

make_tmp() {
  # Try a cross-platform mktemp (works on macOS & GNU)
  if tmpfile="$(mktemp "${TMPDIR:-/tmp}/forge.XXXXXX" 2>/dev/null)"; then
    printf "%s" "$tmpfile"
  else
    # Fallback if mktemp is odd in the environment
    printf "%s" "${TMPDIR:-/tmp}/forge.$$.$RANDOM.tmp"
  fi
}

# Prepend a header to a file if the sentinel is not found
prepend_if_missing() {
  local file="$1"
  local sentinel="$2"
  local header="$3"

  if ! grep -qF "$sentinel" "$file" 2>/dev/null; then
    local tmp
    tmp="$(make_tmp)"
    printf "%s\n" "$header" > "$tmp"
    [ -f "$file" ] && cat "$file" >> "$tmp"
    mv "$tmp" "$file"
    say "Prepended: $file"
  else
    say "Skip (already sealed): $file"
  fi
}

# ---------- 1) Field Ops Scroll ----------
ensure_parent "$root_dir/examples/commands.md"
cat > "$root_dir/examples/commands.md" <<'FIELDOPS'
# ⚔️ Field Ops Scroll — Command Recipes

🜄 **VaultMesh Operational Patterns** — tiny incantations → sealed artifacts.

---

## Invocation Grammar

```text
pnpm forge <scroll> <@profile> [args]

	•	scroll: YAML catalog entry (e.g., tem-recon, tem-guardrails, deck-fintech)
	•	@profile: merges voice + defaults (e.g., @vault, @exec, @blue)
	•	args: flags/params consumed by router + template (--target, --depth, --format)

Run-levels: read-only (default) · advisory · lab-only (pseudocode) · restricted
Protocol: No secrets, no live payloads, no destructive actions.

⸻

Common Flags
	•	--format <json|markdown|yaml> — output format
	•	--depth <shallow|medium|deep> — scope/intensity (template-specific)
	•	--target <domain|org|system> — primary subject (template-specific)

⸻

TEM | Reconnaissance (Passive)

Intent: gather open signals about a target within strict read-only bounds.

Incantation

pnpm forge tem-recon @blue \
  --target acme.bank \
  --depth deep \
  --format json

Inputs: target, depth, format
Guardian: Tem (Remembrance)
Contract: #/definitions/tem/recon in schemas/output.schema.json
Ledger Writes: JSONL line in ./logs/ with timestamp, profile, scroll, args, hash

Notes
	•	Passive only. No probing, no auth use, no rate abuse.
	•	Outputs validated; single auto-repair pass if schema mismatch occurs.

⸻

TEM | Guardrails Check

Intent: evaluate proposed agent capabilities vs. a permissions matrix.

Incantation

pnpm forge tem-guardrails @blue \
  --agent "Ops Copilot" \
  --permissions_matrix "./examples/iso27001.yaml" \
  --data_access "crm,s3:reports" \
  --format markdown

Inputs: agent, permissions_matrix, data_access, format
Guardian: Tem (Remembrance)
Contract: #/definitions/tem/guardrails

Emits
	•	Findings (by control)
	•	Risk notes (with severity)
	•	Recommended guardrails (denylist/allowlist/sandbox)
	•	Run-level verdict

⸻

Deck | Fintech Strike Deck

Intent: synthesize a sales/strategy deck from a concise brief.

Incantation

pnpm forge deck-fintech @vault "Payments scale-up; ask: 10-day €12k sprint + €15–25k retainer"

Profile Bias: @vault — mythic-technical, ledger-first framing
Output: Markdown deck sections with headings, bullets, callouts
Use: Pipe into your doc/PDF renderer of choice

⸻

Profiles Quick-Map
	•	@vault — Transcendent + Tactical, mythic-technical voice, ledger-first framing
	•	@blue — Defensive Intelligence, conservative risk posture, JSON-friendly outputs
	•	@exec — Concise Decision Briefs, ROI framing, crisp bullets

⸻

Alchemical Pass (Auto-Repair)

Nigredo (raw) → Albedo (schema wash) → Citrinitas (repair) → Rubedo (sealed artifact)

One repair attempt is permitted if the first output violates its schema.

⸻

Ledger

Every invocation appends a JSONL trace under ./logs/:
	•	timestamp · profile · scroll · args · hash · validation status

This is the Civilization Ledger of Actions.
FIELDOPS
say "Wrote: examples/commands.md"

# ---------- 2) Persona Oaths (prepend comments only) ----------
vault_hdr=$(cat <<'VAULT'
# RITUAL-OATH: @vault

─────────────────────────────────────────────────────────────

Persona: @vault — Architect of VaultMesh

Oath: Transcendent + Tactical; speak in scrolls, rituals, commands.

Bias: Mythic-technical clarity; civilization-ledger framing.

Recommended (non-binding): format=markdown, safety=read-only|advisory.

Guardian: Tem ensures remembrance; sovereignty preserved.

─────────────────────────────────────────────────────────────
VAULT
)

blue_hdr=$(cat <<'BLUE'
# RITUAL-OATH: @blue

─────────────────────────────────────────────────────────────

Persona: @blue — Defensive Intelligence / Blue Team

Oath: Safety-first; passive reconnaissance; minimum privilege.

Bias: Evidence-weighted; terse; JSON-native when applicable.

Recommended (non-binding): format=json, safety=read-only.

Guardian: Tem ensures remembrance; sovereignty preserved.

─────────────────────────────────────────────────────────────
BLUE
)

exec_hdr=$(cat <<'EXEC'
# RITUAL-OATH: @exec

─────────────────────────────────────────────────────────────

Persona: @exec — Executive Decision Briefs

Oath: Constrain to ROI, risk, timing, options, next steps.

Bias: Crisp bullets; heatmap of tradeoffs; plain speech.

Recommended (non-binding): format=markdown, safety=advisory.

Guardian: Tem ensures remembrance; sovereignty preserved.

─────────────────────────────────────────────────────────────
EXEC
)

ensure_parent "$root_dir/profiles/vault.yaml"
prepend_if_missing "$root_dir/profiles/vault.yaml" "RITUAL-OATH: @vault" "$vault_hdr"

ensure_parent "$root_dir/profiles/blue.yaml"
prepend_if_missing "$root_dir/profiles/blue.yaml" "RITUAL-OATH: @blue" "$blue_hdr"

ensure_parent "$root_dir/profiles/exec.yaml"
prepend_if_missing "$root_dir/profiles/exec.yaml" "RITUAL-OATH: @exec" "$exec_hdr"

# ---------- 3) TEM Ritual Clauses (prepend comments only) ----------
recon_hdr=$(cat <<'RECON'
# RITUAL-CLAUSE: TEM:Reconnaissance

╔═══════════════════════════════════════════════════════════════════╗

║ VaultMesh Ritual Clauses — TEM: Reconnaissance                    ║

║ Intent: Passive intelligence gathering (strict read-only).        ║

║ Inputs: target, depth, format, profile.                           ║

║ Gates: run_level=read-only; no payloads; legal/ethics required.   ║

║ Contract: #/definitions/tem/recon in schemas/output.schema.json.  ║

║ Phases: Nigredo→Albedo→Citrinitas→Rubedo (auto-repair permitted). ║

║ Guardian: Tem, the Remembrance Guardian.                          ║

╚═══════════════════════════════════════════════════════════════════╝
RECON
)

guard_hdr=$(cat <<'GUARD'
# RITUAL-CLAUSE: TEM:Guardrails

╔═══════════════════════════════════════════════════════════════════╗

║ VaultMesh Ritual Clauses — TEM: Guardrails Checker                ║

║ Intent: Validate agent capabilities vs. permissions matrix.       ║

║ Inputs: agent, permissions_matrix, data_access, format.           ║

║ Gates: read-only/advisory only; no live actions; sandbox assumed. ║

║ Contract: #/definitions/tem/guardrails (output.schema.json).      ║

║ Phases: Nigredo→Albedo→Citrinitas→Rubedo (auto-repair permitted). ║

║ Guardian: Tem, the Remembrance Guardian.                          ║

╚═══════════════════════════════════════════════════════════════════╝
GUARD
)

ensure_parent "$root_dir/catalog/tem/reconnaissance.yaml"
prepend_if_missing "$root_dir/catalog/tem/reconnaissance.yaml" "RITUAL-CLAUSE: TEM:Reconnaissance" "$recon_hdr"

ensure_parent "$root_dir/catalog/tem/guardrails-checker.yaml"
prepend_if_missing "$root_dir/catalog/tem/guardrails-checker.yaml" "RITUAL-CLAUSE: TEM:Guardrails" "$guard_hdr"

say "All seals bound."
