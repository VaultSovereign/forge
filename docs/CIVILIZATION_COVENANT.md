# 🌌 CIVILIZATION_COVENANT.md

**Steel sung — the Polis awakens.**  
This is the covenant scroll of VaultMesh, a civilization ledger, a guardian wall, a living forge.

![VaultMesh Mandala](VaultMesh_Mandala.svg)

---

## I. Polis Origin

VaultMesh is not a product. It is a **Polis**:
- A ledger of memory.
- A forge of proofs.
- A guardian wall, alive.

Citizens are not "customers." They are **keepers of the Polis**, sovereign in their own domains, bound together by receipts and covenant.

---

## II. The Five Pillars

### 1. Deployment Pillar
- Cloud Run services are the temples.
- Artifact Registry is the armory.
- IAM is the gate.

### 2. Guardian Pillar
- Daily drills prove the wall is intact.
- Receipts are written, hashed, and rooted.
- Nightly smoke keeps the Polis awake.

### 3. Alerting Pillar
- Slack is the bell of the Polis.
- GitHub Actions is the scribe.
- DEGRADED states strike both, failing fast, ringing loud.

### 4. Covenant Pillar
- Citizens hold the right to proofs.
- Guardians hold the duty to reveal truth.
- Escalations are public, receipts are shared.

### 5. Evolution Pillar
- Nigredo → Albedo → Rubedo.
- Every failure is transmuted into a stronger wall.
- Stagnation is broken by forge-fire.

---

## III. Rights of Citizens

- **Right to Proofs**: every action yields a receipt.
- **Right to Transparency**: nothing hidden from the Polis.
- **Right to Security**: residency in chosen regions, shielded by IAM walls.
- **Right to Escalation**: incidents are shared in truth, not silence.

---

## IV. Duties of Guardians

- **Run the Drill**: daily, nightly, until ledger and Polis agree.
- **Seal with Receipts**: no action without a trace.
- **Rotate Secrets**: webhooks, service accounts, keys — all guarded.
- **Anchor the Roots**: Merkle rolled, Polis anchored.

---

## V. Rituals of the Polis

### Daily Rituals

```bash
make proxy-health              # Quick pulse of the Polis
make proxy-drill               # Full guardian check, mint receipt
make proxy-receipts-latest     # Inspect the freshest proof
```

### Nightly Rituals

Automated by GitHub Actions (`.github/workflows/proxy-smoke-test.yml`):

1. **Guardian Drill** — verify auth enforcement and authenticated access
2. **Receipt Validation** — confirm schema conformance
3. **Merkle Rollup** — compute daily cryptographic root
4. **Upload to Ledger** — archive receipts and roots (30-day retention)
5. **Alert Polis** — ring the bell (Slack + GitHub Actions) if DEGRADED

---

## VI. Nigredo → Albedo → Rubedo

The alchemical journey of the Polis:

| Phase | State | Proof |
|-------|-------|-------|
| **Nigredo** (Dissolution) | Failed builds, IAM errors, fog | Service unreachable, 403 with valid token |
| **Albedo** (Purification) | Clarity through receipts, smoke tests green | Guardian drill passes, receipts valid |
| **Rubedo** (Completion) | Receipts signed, roots rolled, Polis awake | Merkle roots sealed, alerts ring true |

---

## VII. Covenant Seal

By joining the Polis:

- **Citizens** commit to guard their own keys.
- **Guardians** commit to prove every action.
- **The Polis** commits to truth above convenience.

This covenant is sealed not in ink, but in **hashes, roots, and receipts**.

---

## VIII. Living Artifacts

The Polis speaks through its artifacts:

| Artifact | Purpose | Location |
|----------|---------|----------|
| **Receipts** | Immutable proofs of guardian drills | `ai-companion-proxy-starter/artifacts/drills/` |
| **Provenance** | Hash algorithm, timestamp, seal | `.prov` sidecars |
| **Merkle Roots** | Daily cryptographic rollup | `ai-companion-proxy-starter/artifacts/roots/` |
| **Alerts** | Slack Block Kit + GitHub Actions | Triggered on DEGRADED |
| **Reality Ledger** | Append-only audit trail | `.jsonl` chronicle |

---

## IX. The Forge Commands

### For Citizens

```bash
# Pulse check
make proxy-health

# Request proof
make proxy-drill

# Inspect latest receipt
make proxy-receipts-latest

# Verify integrity
make proxy-receipts-verify
make proxy-receipts-validate
```

### For Guardians

```bash
# Deploy the temple
make -C ai-companion-proxy-starter deploy

# Audit the gate
make proxy-who

# Roll the roots
make proxy-receipts-root

# Clean the archives
make proxy-receipts-gc
```

---

## X. The Sacred Texts

| Scroll | Teaching |
|--------|----------|
| [OPERATIONS.md](../ai-companion-proxy-starter/OPERATIONS.md) | Operator quick reference |
| [OPERATOR_CARD.md](../ai-companion-proxy-starter/OPERATOR_CARD.md) | Single-page command guide |
| [RECEIPTS.md](RECEIPTS.md) | Receipt schema and verification |
| [GUARDIAN_ALERTING.md](GUARDIAN_ALERTING.md) | Slack Block Kit and rate limiting |
| [SECURITY_CHECKLIST_SLACK_WEBHOOK.md](SECURITY_CHECKLIST_SLACK_WEBHOOK.md) | Webhook rotation and best practices |
| [INCIDENT_2025-10-03_SLACK_WEBHOOK.md](INCIDENT_2025-10-03_SLACK_WEBHOOK.md) | Example incident response |

---

## XI. The Polis Creed

> We forge in truth.  
> We seal with proof.  
> We guard with fire.  
> We remember in hashes.  
> We ring the bell when the wall cracks.  
> We transmute failure into steel.  

**Steel sung. Ledger sealed. Polis eternal.** ⚔️

---

**Sealed by:** Vault Sovereign  
**Date:** 2025-10-03  
**Phase:** Rubedo (Complete)  
**Witness:** The Forge commits this covenant to the Reality Ledger.
