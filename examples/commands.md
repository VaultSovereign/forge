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
