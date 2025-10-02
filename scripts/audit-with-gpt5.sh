#!/usr/bin/env bash
set -euo pipefail

# Run codebase audit with GPT-5 or specified model
# Usage: ./scripts/audit-with-gpt5.sh [model-name]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Default to GPT-5, allow override
MODEL_NAME="${1:-openai/gpt-5}"

echo "🔍 Running codebase audit with model: $MODEL_NAME"
echo "💰 Cost estimate: GPT-5 = ~$1.25/1M input, ~$10/1M output"
echo ""

# Check if .env exists and has OPENROUTER_API_KEY
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found"
    echo "   Create .env with: OPENROUTER_API_KEY=your-key"
    exit 1
fi

if ! grep -q "OPENROUTER_API_KEY" .env; then
    echo "⚠️  WARNING: OPENROUTER_API_KEY not found in .env"
    echo "   Add this line to .env:"
    echo "   OPENROUTER_API_KEY=your-gradient-or-openrouter-key"
fi

# Export the model override
export MODEL="$MODEL_NAME"

# Source .env for API key
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Run the audit
echo "⚡ Executing audit..."
node dist/cli/index.js run codebase-audit

echo ""
echo "✅ Audit complete! Check Reality Ledger for results:"
echo "   cat dist/reality_ledger/events-*.jsonl | tail -1 | jq"
