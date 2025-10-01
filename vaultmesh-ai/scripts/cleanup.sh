#!/usr/bin/env bash
set -euo pipefail

echo "🜄 Sweeping backup relics..."
find . -type f -name '*.bak' -print -delete
echo "⚔️  All .bak relics swept."
