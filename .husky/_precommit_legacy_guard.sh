#!/usr/bin/env bash
set -euo pipefail

# Only scan staged changes to keep it fast
FILES=$(git diff --cached --name-only --diff-filter=ACMRT | grep -E '\.(md|svg|json|sh|ya?ml)$' || true)
[ -z "$FILES" ] && exit 0

# Prefer ripgrep; fall back to grep -R
if command -v rg >/dev/null 2>&1; then
  if rg -n -S 'VaultSovereign/vaultmesh-ai|vaultmesh-ai' $FILES; then
    echo "❌ Legacy reference found in staged files. Replace 'vaultmesh-ai' → 'forge'."
    echo "Hint: run locally: rg -n -S 'vaultmesh-ai' ."
    exit 1
  fi
else
  if grep -RInE 'VaultSovereign/vaultmesh-ai|vaultmesh-ai' $FILES; then
    echo "❌ Legacy reference found in staged files. Replace 'vaultmesh-ai' → 'forge'."
    echo "Hint: install ripgrep for better output: https://github.com/BurntSushi/ripgrep"
    exit 1
  fi
fi

exit 0
