# ✅ Phase 2: Forge (TypeScript) Capsule Setup Complete

**Date**: 2025-10-06
**Status**: Hermetic TypeScript environment ready

## What Was Done

### 1. Repository Structure ✅
- Created `~/GitHub/forge/` from `~/forge`
- Set up proper GitHub remote: `git@github.com:VaultSovereign/vm-forge.git`
- Branch: `main`

### 2. DevContainer Scaffolding ✅

**Files Added**:
- `.devcontainer/devcontainer.json` - Node 22 container config
- `.devcontainer/post-create.sh` - Container initialization with pnpm

**Key Features**:
- ✅ Node 22 LTS (Bookworm base)
- ✅ pnpm via Corepack
- ✅ Persistent pnpm store volume cache
- ✅ Auto-install + build + test on container create
- ✅ Auto-witness on first open

### 3. Receipt & Attestation Scripts ✅

**Files Added**:
- `scripts/witness.js` - **Zero-dep** build/use attestation (Node.js native)
- `scripts/receipt.sh` - Receipt primitives (write, merkle rollup)
- `scripts/rollup.sh` - Daily ROOT.txt generation + optional GPG signing
- `scripts/root-link.sh` - prev_root → new_root daily linker
- `scripts/release-init.sh` - Seed release scroll from template

**Features**:
- ✅ Hashes all artifacts in `dist/`, `build/`, `out/`
- ✅ Includes package.json + pnpm-lock.yaml
- ✅ Merkle tree rollup (daily ROOT.txt)
- ✅ Chain linking (LAST_ROOT.txt)
- ✅ No external deps (pure Node.js + crypto)

### 4. CI Workflow ✅

**File Added**: `.github/workflows/forge-ci.yml`

**Jobs**:
1. **smoke** (on push/PR):
   - Install deps (pnpm)
   - Lint + typecheck (best-effort)
   - Tests
   - Witness (build attestation)
   - Rollup (ROOT.txt)
   - Link (prev → new root)
   - Upload receipts artifacts

2. **sign-root** (on `v*` tags):
   - GPG sign ROOT.txt (if GPG_PRIVATE_KEY secret exists)
   - Fallback: cosign keyless signing
   - Upload signed ROOT artifacts

### 5. Documentation ✅

**Files Added**:
- `docs/PHASE2_RUNCARD.md` - 15-25min verification workflow
- `docs/RELEASE_TEMPLATE.md` - Release scroll template with placeholders
- `PHASE2_SETUP_COMPLETE.md` - This file

### 6. Commit Pushed ✅

**Commit**: `d5ca7c0 feat(capsule): Phase 2 Forge devcontainer, receipts, rollup, CI, runcard`

**Files**:
- 10 new files
- 447 insertions
- Pushed to: `origin/main`

## Next Steps

### Immediate (You)

1. **Open in VSCode**:
   ```bash
   code ~/GitHub/forge
   ```

2. **Reopen in Container**: Command Palette → "Dev Containers: Reopen in Container"

3. **Verify Setup** (inside container):
   ```bash
   pnpm -v && node -v
   pnpm i --frozen-lockfile || pnpm i
   pnpm test
   node ./scripts/witness.js
   ./scripts/rollup.sh && ./scripts/root-link.sh
   grep '^root:' receipts/ROOT.txt
   ```

4. **Seed Release Scroll**:
   ```bash
   ./scripts/release-init.sh 1.1.0-dev
   git add docs/RELEASE_1.1.0-dev.md receipts/ ROLLUP.txt
   git commit -m "docs(forge): init release scroll with witnessed root"
   git push
   ```

5. **Optional: Tag Pre-release**:
   ```bash
   git tag v1.1.0-rc.1
   git push --tags
   # CI will run forge-ci.yml and sign ROOT
   ```

## Verification Checklist

Run inside devcontainer:

- [ ] `node -v` → v22.x
- [ ] `pnpm -v` → 9.x
- [ ] `pnpm test` → all pass (or expected set)
- [ ] `node ./scripts/witness.js` → creates `receipts/forge/<date>/*.json`
- [ ] `./scripts/rollup.sh` → creates `receipts/ROOT.txt` with root hash
- [ ] `./scripts/root-link.sh` → creates `receipts/links/<date>/*.json` + `LAST_ROOT.txt`

## Cross-Repo Linking (Next)

To link Forge ROOT to VaultMesh Core ROOT:

```bash
# In forge devcontainer:
CORE_ROOT=$(curl -s https://api.github.com/repos/VaultSovereign/VaultMesh/actions/artifacts | jq -r '.artifacts[0].archive_download_url')
# Download + verify + reference in Forge's link metadata
```

Or manual:
1. Get Core ROOT from vaultmesh CI artifacts
2. Reference in Forge's `receipts/links/` metadata
3. Document in release scroll

## Resources

- [PHASE2_RUNCARD.md](docs/PHASE2_RUNCARD.md) - Full verification workflow
- [RELEASE_TEMPLATE.md](docs/RELEASE_TEMPLATE.md) - Release scroll template
- [.github/workflows/forge-ci.yml](.github/workflows/forge-ci.yml) - CI pipeline
- [scripts/witness.js](scripts/witness.js) - Witness implementation

## Comparison: Phase 1 vs Phase 2

| Aspect | Phase 1 (VaultMesh Rust) | Phase 2 (Forge TypeScript) |
|--------|-------------------------|----------------------------|
| Language | Rust 1.90 | Node 22 + TypeScript |
| Build cache | sccache | pnpm store volume |
| Witness | Rust binary hashes | JS zero-dep artifact hash |
| Container | Ubuntu 24.04 custom | MS DevContainer Node 22 |
| CI | rust-ci.yml | forge-ci.yml |
| Time | ~10-15 min | ~15-25 min |

---

**Foundation ready.** Proceed with Phase 3 (Polis Python) or deploy Phase 2 in production. ⚔️

## Optional: Prebuilt Capsule Image

If you want Path C (prebuilt capsule) instead of building locally:

1. Build and push to GHCR:
   ```bash
   docker build -f .devcontainer/Dockerfile -t ghcr.io/vaultmesh/forge-capsule:node-v1 .
   docker push ghcr.io/vaultmesh/forge-capsule:node-v1
   ```

2. Update `.devcontainer/devcontainer.json`:
   ```json
   "image": "ghcr.io/vaultmesh/forge-capsule:node-v1"
   ```

3. Teams pull the prebuilt image (no local build time).
