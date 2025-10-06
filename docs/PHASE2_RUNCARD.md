# Phase 2: Forge (TypeScript) — Verification Runcard

**Duration**: ~15–25 minutes
**Environment**: VS Code DevContainer

## Devcontainer
1. Open repo: `code ~/GitHub/forge`
2. Command Palette → **Dev Containers: Reopen in Container**

## Sanity
```bash
pnpm -v && node -v
pnpm i --frozen-lockfile || pnpm i
```

## Tests + Lint
```bash
pnpm test
pnpm run -r typecheck || true
pnpm run -r lint || true
```

## Attestation
```bash
node ./scripts/witness.js           # emits receipts/forge/<date>/…json
./scripts/rollup.sh                 # writes receipts/ROOT.txt (signs if GPG_SIGN=1)
./scripts/root-link.sh              # prev_root → new_root link
grep '^root:' receipts/ROOT.txt
```

## Acceptance
- [ ] tests pass (or expected set)
- [ ] rollup produced ROOT.txt (non-empty unless intentional)
- [ ] link JSON written + LAST_ROOT updated
- [ ] CI summary shows root; artifacts uploaded
- [ ] on tag: signed ROOT present (.asc or .sig)

## Ship It (v1.1.0-dev)

```bash
# Seed release scroll
./scripts/release-init.sh 1.1.0-dev

# Commit receipts
git add docs/RELEASE_1.1.0-dev.md receipts/ ROLLUP.txt
git commit -m "docs(forge): init release scroll with witnessed root"

# Push
git push -u origin <your-branch>

# Create PR to main
# Title: "Phase 2: Forge TypeScript capsule (devcontainer + receipts + rollup)"
```

## Optional: Pre-release Tag

```bash
# Tag release candidate
git tag v1.1.0-rc.1
git push --tags

# Wait for CI (forge-ci.yml)

# Download & verify artifacts
gh release download v1.1.0-rc.1
gpg --verify receipts/ROOT.txt.asc receipts/ROOT.txt || \
  cosign verify-blob --signature receipts/ROOT.txt.sig receipts/ROOT.txt
```

## Troubleshooting

**Tests fail?**
- Check Node version: `node -v` (should be 22.x)
- Update deps: `pnpm update`

**witness.js fails?**
- Run build manually: `pnpm -w run build`
- Check dist/ or build/ directories exist

**ROOT.txt empty or missing?**
- Re-run `./scripts/rollup.sh`
- Check `receipts/forge/` for *.json files

**Link fails?**
- First run: LAST_ROOT.txt won't exist (expected)
- Second run: should link prev → new

---

**Next**: Phase 3 — Polis Python capsule
