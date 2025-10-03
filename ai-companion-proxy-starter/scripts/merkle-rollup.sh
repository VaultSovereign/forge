#!/usr/bin/env bash
set -euo pipefail
DIR="${DIR:-ai-companion-proxy-starter/artifacts/drills}"
OUT="${OUT:-ai-companion-proxy-starter/artifacts/roots}"
mkdir -p "$OUT"
DAY="$(date -u +%Y-%m-%d)"
DAY_ID="$(date -u +%Y%m%d)"

mapfile -t FILES < <(ls -1 "$DIR"/proxy-guardian-*.json 2>/dev/null | grep "$DAY_ID" || true)
[ ${#FILES[@]} -eq 0 ] && { echo "no receipts for $DAY"; exit 0; }

hash_file() {
  if command -v b3sum >/dev/null 2>&1; then b3sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'
  else echo "UNAVAILABLE"; fi
}

LEAVES=()
for f in "${FILES[@]}"; do LEAVES+=("$(hash_file "$f")"); done

level=("${LEAVES[@]}")
while [ ${#level[@]} -gt 1 ]; do
  next=()
  for ((i=0;i<${#level[@]};i+=2)); do
    a="${level[i]}"; b="${level[i+1]:-${level[i]}}"
    if command -v b3sum >/dev/null 2>&1; then
      h=$(printf '%s%s' "$a" "$b" | b3sum | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
      h=$(printf '%s%s' "$a" "$b" | shasum -a 256 | awk '{print $1}')
    else
      h="UNAVAILABLE"
    fi
    next+=("$h")
  done
  level=("${next[@]}")
done

ROOT="${level[0]}"
echo "{\"day\":\"$DAY\",\"root\":\"$ROOT\",\"count\":${#FILES[@]}}" > "$OUT/root-$DAY.json"
echo "🌳 Merkle root for $DAY: $ROOT (count=${#FILES[@]}) -> $OUT/root-$DAY.json"
