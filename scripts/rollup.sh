#!/usr/bin/env bash
# rollup.sh — produce daily ROOT.txt and optionally sign
set -Eeuo pipefail
repo="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
. "${repo}/scripts/receipt.sh"
rootfile="$(vm_merkle_rollup)"
echo "[rollup] wrote ${rootfile}"
if [[ "${GPG_SIGN:-0}" == "1" ]] && command -v gpg >/dev/null 2>&1; then
  gpg --batch --yes --armor --output "${rootfile}.asc" --detach-sign "${rootfile}"
  echo "[rollup] signed ${rootfile} -> ${rootfile}.asc"
fi