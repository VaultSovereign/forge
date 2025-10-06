#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Forge Capsule — Post-create setup"

# Enable corepack for pnpm
corepack enable
pnpm -v || npm i -g pnpm@9

# Git safe directory
git config --global --add safe.directory /workspace || true

# Set up pnpm cache
echo 'export PNPM_HOME=$HOME/.local/share/pnpm' >> ~/.bashrc
echo 'export PATH=$PNPM_HOME:$PATH' >> ~/.bashrc

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile || pnpm install

# Build (best-effort)
echo "🏗️  Building..."
pnpm -w run build || true

# Run tests (best-effort)
echo "🧪 Running tests..."
pnpm -w run test:ci || pnpm -w run test || true

# Create initial witness receipt
echo "🔍 Creating initial witness..."
node ./scripts/witness.js || npx ts-node ./scripts/witness.ts || echo "⚠️  Witness skipped (will run in CI)"

echo "✅ Forge Capsule ready"