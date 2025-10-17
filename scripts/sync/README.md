# Repository Synchronization Guide

## Context

The local `forge` repository and `github.com/VaultSovereign/vm-forge` (origin/main) have diverged completely—no common ancestor commits. This guide walks you through the synchronization ritual.

## Automated Sync Script

Location: `scripts/sync/push_to_remote.sh`

### What It Does

1. **Pre-flight checks**: Verifies clean git state and pnpm@10.17.0
2. **Creates sync branch**: `sync/align-local-with-remote`
3. **Merges remote**: Uses `--allow-unrelated-histories`
4. **Resolves conflicts**: Prefers LOCAL (your refined forge) content
5. **Verification suite**: Runs install, format, lint, build, test
6. **Replit purge check**: Ensures no Replit remnants
7. **Ready to push**: Branch created, verified, ready for PR

### Usage

```bash
# From forge repository root
./scripts/sync/push_to_remote.sh

# After script completes successfully:
git push -u origin sync/align-local-with-remote

# Then create PR on GitHub
```

## Manual Steps After Automation

### 1. Add GHCR Badge (Optional)

If the remote has a GHCR badge you want to preserve, manually add it to the top of `README.md`:

```markdown
[![ghcr](https://img.shields.io/badge/GHCR-forge-blue)](https://github.com/VaultSovereign/vm-forge/pkgs/container/forge)
```

### 2. Review Merge Commit

```bash
# See what changed
git log origin/main..HEAD

# See file-level changes
git diff origin/main..HEAD --stat

# Review specific files if needed
git diff origin/main..HEAD -- README.md
```

### 3. Create Pull Request

**Title**: `sync: merge remote GHCR/CI improvements with local forge refinements`

**Body Template**:

```markdown
## Summary

Merges divergent histories between local refined forge and remote origin/main.

- **Strategy**: Prefer local (forge) content for core functionality
- **Preserved**: Remote GHCR workflows and CI improvements where applicable
- **Added**: 271+ files missing from remote (workbench, agents, tests, docs)

## Key Changes

### From Local (Forge)

- ✅ Complete Replit purification (docs, CI guardrails, hooks)
- ✅ Workbench application (BFF + frontend)
- ✅ Agent system (guardian, runner)
- ✅ Test infrastructure (6/6 passing)
- ✅ Quality tooling (.eslintrc, .prettierrc, .husky)
- ✅ pnpm@10.17.0 standardization
- ✅ Build configs (vitest, pnpm-workspace)
- ✅ Enhanced documentation (DRILLS, runbooks)

### From Remote (Origin)

- ✅ GHCR publishing workflows (preserved)
- ✅ Release automation (preserved)
- ✅ Container documentation (merged)

## Verification

All checks passing locally:

- [x] `pnpm install --frozen-lockfile` ✅
- [x] `pnpm format:check` ✅
- [x] `pnpm lint` ✅
- [x] `pnpm build` ✅
- [x] `pnpm test` (6/6 tests) ✅
- [x] `pnpm --prefix workbench/bff run build` ✅
- [x] `pnpm --prefix workbench/frontend run build` ✅
- [x] Replit purge verification ✅

## Breaking Changes

- **Node.js**: Now requires >=20.11.1
- **Package Manager**: Now requires pnpm@10.17.0 (enforced via .npmrc)
- **Replit**: No longer supported (local development only)

## Post-Merge Actions

- [ ] Confirm dist/ policy (currently ignored per .gitignore)
- [ ] Verify .env excluded from commits
- [ ] Update GHCR badge in README if needed
- [ ] Test CI passes on GitHub Actions

## Review Notes

- This merge uses `--allow-unrelated-histories` (unavoidable)
- Conflict resolution prefers local content systematically
- Remote GHCR workflows preserved where they don't conflict
- All 271+ missing files now synchronized

---

**Civilization Ledger Entry**: Repository synchronization complete. All changes auditable via Reality Ledger.
```

## Troubleshooting

### If Script Fails at Merge

```bash
# Manually complete merge
git status  # See conflicted files

# For each conflict, prefer local:
git checkout --ours <file>

# Or prefer remote:
git checkout --theirs <file>

# Stage and continue
git add -A
git commit
```

### If Tests Fail

```bash
# Check what's failing
pnpm test --reporter=verbose

# Common issues:
# 1. Missing dependencies: pnpm install
# 2. Format issues: pnpm format:write
# 3. Lint issues: pnpm lint:fix
```

### If Replit Check Fails

```bash
# Find remnants
grep -RIn --exclude-dir=.git --exclude-dir=node_modules -E '\breplit\b' .

# Remove them manually, then:
git add -A
git commit --amend --no-edit
```

## Safety Guarantees

- ✅ Local work preserved (271+ files)
- ✅ Remote GHCR workflows preserved
- ✅ Full test suite passes
- ✅ Replit purge verified
- ✅ Build outputs ignored (no dist/ versioning)
- ✅ Secrets excluded (.env in .gitignore)

## Timeline Estimate

- Script execution: 5-10 minutes
- Manual review: 15-30 minutes
- PR creation: 5 minutes
- CI validation: 10-15 minutes
- **Total**: ~30-60 minutes

---

**🜄 Tem Witnesses**: All actions recorded in Reality Ledger.
