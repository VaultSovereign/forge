# VaultMesh - Earth's Civilization Ledger
# Multi-stage build for production-ready container

# syntax=docker/dockerfile:1

# Base stage with pnpm - use specific Alpine version with security patches
FROM node:20.19.5-alpine3.22 AS base
WORKDIR /app

# Update Alpine packages to get latest security patches, then enable pnpm
RUN apk update && apk upgrade --no-cache && \
    corepack enable && corepack prepare pnpm@10.17.0 --activate

# Build stage
FROM base AS builder

# Copy package manifests first for better caching
COPY pnpm-lock.yaml package.json tsconfig.json pnpm-workspace.yaml ./

# Install all dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build project
RUN pnpm run build

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S vaultmesh && \
    adduser -S vaultmesh -u 1001 -G vaultmesh

# Copy package manifests
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/catalog ./catalog
COPY --from=builder /app/profiles ./profiles
COPY --from=builder /app/schemas ./schemas
COPY --from=builder /app/reality_ledger ./reality_ledger

# Create data directories
RUN mkdir -p /app/logs /app/reality_ledger && \
    chown -R vaultmesh:vaultmesh /app

# Switch to non-root user
USER vaultmesh

# Environment variables
ENV NODE_ENV=production
ENV REALITY_LEDGER_COMPACT=1

# Expose health check endpoint (if we add one)
EXPOSE 8080

# --- Health check (fast, non-blocking, ledger-first) ---
# Exits 0 when basic ledger + process health is OK. Provider is optional here.
# Use a compact doctor mode to avoid long model network calls.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "process.env.FORGE_HEALTH='1';" >/dev/null 2>&1 \
   && node dist/cli/index.js doctor --json --skip-provider >/dev/null 2>&1 \
   && echo OK || exit 1

# Default command - can be overridden
CMD ["node", "dist/cli/index.js", "--help"]

# Labels for metadata
LABEL org.opencontainers.image.title="VaultMesh"
LABEL org.opencontainers.image.description="Earth's Civilization Ledger - Sovereign Prompt Orchestration"
LABEL org.opencontainers.image.source="https://github.com/VaultSovereign/vm-forge"
LABEL org.opencontainers.image.licenses="Apache-2.0"
