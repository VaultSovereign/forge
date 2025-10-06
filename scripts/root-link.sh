#!/usr/bin/env bash
# root-link.sh — link prev_root → new_root (daily)
set -Eeuo pipefail
repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cur="${repo}/receipts/ROOT.txt"
last="${repo}/receipts/LAST_ROOT.txt"
[[ -f "$cur" ]] || { echo "missing receipts/ROOT.txt"; exit 2; }
new="$(grep '^root:' "$cur" | awk '{print $2}')"
prev="$(test -f "$last" && cat "$last")"
dir="${repo}/receipts/links/$(date +%F)"; mkdir -p "$dir"
ts="$(date -Iseconds)"
printf '{"ts":"%s","prev_root":"%s","new_root":"%s"}\n' "$ts" "${prev:-}" "$new" > "${dir}/${ts//:/-}.json"
echo "$new" > "$last"
echo "[link] ${prev:-<none>} -> ${new}"