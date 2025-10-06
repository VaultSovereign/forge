#!/usr/bin/env bash
# receipt.sh — receipt & merkle primitives (portable)
set -Eeuo pipefail

hash_cmd() {
  if command -v b3sum >/dev/null 2>&1; then echo b3sum
  elif command -v sha256sum >/dev/null 2>&1; then echo sha256sum
  else echo "shasum -a 256"; fi
}

vm_receipt_write() {
  local type="$1" payload="$2"
  [[ -f "$payload" ]] || { echo "no payload: $payload" >&2; return 2; }
  local repo ts day dir out H
  repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  ts="$(date -Iseconds)"; day="${ts%%T*}"
  dir="${repo}/receipts/${type}/${day}"; mkdir -p "$dir"
  out="${dir}/${ts//:/-}.json"; cp "$payload" "$out"
  H="$(hash_cmd)"; digest="$($H "$out" | awk '{print $1}')"
  printf '%s  %s  %s  %s\n' "$ts" "$type" "$digest" "${out#${repo}/}" >> "${repo}/ROLLUP.txt"
  printf '%s\n' "$out"
}

vm_merkle_rollup() {
  local repo day H root rootfile
  repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  day="${1:-$(date +%F)}"
  H="$(hash_cmd)"
  mapfile -t files < <(find "${repo}/receipts" -type f -name '*.json' -path "*/${day}/*" | sort)
  if [[ "${#files[@]}" -eq 0 ]]; then
    root="$(printf '' | $H | awk '{print $1}')"
  else
    mapfile -t leaves < <(for f in "${files[@]}"; do $H "$f" | awk '{print $1}'; done)
    merkle_level(){ local -a in=("$@"); local i; for((i=0;i<${#in[@]};i+=2)); do
      local a="${in[i]}"; local b="${in[i+1]:-${in[i]}}"
      printf '%s' "$a$b" | xxd -r -p 2>/dev/null | $H | awk '{print $1}'
    done; }
    current=("${leaves[@]}")
    while ((${#current[@]}>1)); do mapfile -t current < <(merkle_level "${current[@]}"); done
    root="${current[0]}"
  fi
  mkdir -p "${repo}/receipts"
  rootfile="${repo}/receipts/ROOT.txt"
  {
    echo "date: ${day}"
    echo "algo: ${H}"
    echo "count: ${#files[@]}"
    echo "root: ${root}"
    echo "ts: $(date -Iseconds)"
  } > "${rootfile}"
  echo "${rootfile}"
}