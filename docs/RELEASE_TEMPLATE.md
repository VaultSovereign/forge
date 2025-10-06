# Forge — Release {{VERSION}}

**Root:** {{ROOT_HASH}}
**Capsule:** {{CAPSULE}}

## Essence
Short, high-signal summary.

## Highlights
- Item 1
- Item 2
- Item 3

## Verification
```bash
gpg --verify receipts/ROOT.txt.asc receipts/ROOT.txt
# or
cosign verify-blob --signature receipts/ROOT.txt.sig receipts/ROOT.txt
```

## Operator Rituals
```bash
pnpm i --frozen-lockfile || pnpm i
pnpm test
node ./scripts/witness.js
./scripts/rollup.sh
grep '^root:' receipts/ROOT.txt
```

## Provenance
- Git HEAD: {{GIT_HEAD}}
- Timestamp: {{TIMESTAMP}}