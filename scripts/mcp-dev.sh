#!/usr/bin/env bash
# Manual development helper for MCP server - not used in CI/CD
# Redundant with package script mcp:dev but uses different build target
set -euo pipefail

export REALITY_LEDGER_COMPACT="${REALITY_LEDGER_COMPACT:-1}"
# Configure one of the providers below before running the server.
# export OPENROUTER_API_KEY="sk-or-..."
# export OLLAMA_HOST="http://localhost:11434"
# export OPENAI_API_KEY="sk-..."

export MODEL="${MODEL:-meta-llama/llama-3.1-70b-instruct}"

node dist/mcp/forge-mcp.js
