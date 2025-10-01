# --- FRONTEND BUILD ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY workbench/frontend/package*.json ./
RUN npm ci
COPY workbench/frontend/ ./
RUN npm run build

# --- BACKEND BUILD ---
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY workbench/bff/package*.json ./
RUN npm ci
COPY workbench/bff/ ./
RUN npm run build
RUN npm prune --omit=dev

# --- FINAL IMAGE ---
FROM node:20-alpine

# Install runtime utilities
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S vaultmesh \
    && adduser -S vaultmesh -u 1001 -G vaultmesh

WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package.json ./bff/package.json
COPY --from=backend-builder /app/package-lock.json ./bff/package-lock.json
COPY --from=backend-builder /app/dist ./bff/dist
COPY --from=frontend-builder /app/dist ./bff/public

RUN chown -R vaultmesh:vaultmesh /app
USER vaultmesh

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs http://127.0.0.1:8787/v1/health || exit 1

EXPOSE 8787
CMD ["node", "bff/dist/server.js"]
