#!/usr/bin/env bash
# release-init.sh — seed a release scroll from template
set -Eeuo pipefail
repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ver="${1:?usage: release-init.sh <version>}"
tpl="${repo}/docs/RELEASE_TEMPLATE.md"
out="${repo}/docs/RELEASE_${ver}.md"
caps="$(jq -r 'try .image // empty' "${repo}/.devcontainer/devcontainer.json" 2>/dev/null || true)"
[[ -z "$caps" ]] && caps="node22-devcontainer"
root="$(test -f "${repo}/receipts/ROOT.txt" && grep '^root:' "${repo}/receipts/ROOT.txt" | awk '{print $2}' || echo "<ROOT_HASH>")"
head="$(git -C "$repo" rev-parse --short=12 HEAD 2>/dev/null || echo worktree)"
ts="$(date -Iseconds)"
sed -e "s/{{VERSION}}/${ver}/g" \
    -e "s/{{ROOT_HASH}}/${root}/g" \
    -e "s|{{CAPSULE}}|${caps}|g" \
    -e "s/{{GIT_HEAD}}/${head}/g" \
    -e "s/{{TIMESTAMP}}/${ts}/g" \
    "$tpl" > "$out"
echo "[release.init] wrote ${out}"