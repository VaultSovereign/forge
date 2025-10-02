VaultMesh Forge — Production Readiness Checklist

Use this document to gate production rollouts. Treat every checkbox as must-pass unless explicitly marked optional.

0. TL;DR — Pilot Go/No-Go
   • AUTH_DEV_BYPASS is OFF in prod environments
   • OIDC/JWT works end-to-end (tokened smoke passes)
   • Monitoring: Prometheus scraping and Grafana dashboards live
   • Rate limits on /v1/api/execute and /guardian/ask
   • Backups & Restore validated for ledger artifacts
   • OpenAPI available to operators, versioned with release
   • CI green: lint/format, build, smoke (bypass + tokened), OpenAPI check
   • Runbooks present and tested for common faults
   • Guardian agent present (not stub) in prod; 503 if missing

⸻

1. Environment & Secrets

Mandatory environment variables (prod)
• AI_CORE_MODE=live
• OIDC_ISSUER=https://<tenant>.<idp>/ (trailing slash)
• OIDC_AUDIENCE=<api-audience> (or set OIDC_CLIENT_ID)
• VMESH_RBAC_PATH=/app/config/rbac.yaml (mounted config)
• CORE_GRPC_ADDR=<host:port> (required in prod; fail-fast if absent)
• PORT=<svc-port> (defaults 3000 for single-port mode)
• CORS_ORIGIN=<ui-origin> (if serving UI from a different origin)
• AUTH_DEV_BYPASS unset (or 0)
• AUTH_DEV_SIGNER unset (or 0)

Optional
• OIDC_JWKS_URL=https://…/keys.json (if IdP JWKS path is non-standard)
• ALLOWED_ORIGINS=http(s)://… (explicit CORS list if needed)

Secrets handling
• Provider keys stored server-side only (BFF env or secret manager)
• No provider tokens in logs or responses (redaction enabled)

⸻

2. Security Posture
   • Auth: /v1/api/\* requires Bearer JWT (no bypass)
   • RBAC: config/rbac.yaml maps roles → actions (templates:read, execute:run, ledger:read)
   • Security headers/CSP enabled (Helmet)
   • frame-ancestors 'none', X-Content-Type-Options nosniff, Referrer-Policy no-referrer
   • TLS/HSTS enforced at the edge (documented)
   • If terminating TLS at the BFF, HSTS is enabled
   • Rate limits:
   • /v1/api/execute
   • /guardian/ask
   • sensible request size limits everywhere
   • SSE hardened: X-Accel-Buffering: no, keepalive heartbeat in stream

⸻

3. Observability & Monitoring

Metrics
• /metrics scraped by Prometheus
• Dashboards:
• guardian_mode (gauge), last update timestamp
• template_runs_total{status} (counter)
• ledger_events_total{type} (counter)
• request latency & error rates per route
• Alert rules for elevated 5xx, auth failures, guardian stuck in stub

Logs
• Structured JSON logs with request IDs
• Token redaction verified
• Log volume + retention documented

Tracing (optional)
• OTLP export toggled for pilots
• Sampling configured

⸻

4. Reliability & Resilience
   • Retry/backoff around LLM/provider calls
   • Circuit breaker around /guardian/ask and /v1/api/execute
   • Dead letter or error queue for failed ledger writes (or clear manual runbook)
   • SSE concurrency bounded; timeouts documented
   • Catalog: caching/indexing (in-memory TTL + optional on-disk index) with ETag/conditional GET

⸻

5. Data, Ledger & Backups
   • Ledger artifacts location documented and mounted (if external)
   • Backup job configured (frequency, destination)
   • Restore procedure tested & documented
   • Integrity: ROOT/receipts verification usable by operators
   • Migration plan to durable DB backend (PG) documented if scaling beyond JSONL

⸻

6. API & Contract
   • OpenAPI docs/openapi/workbench.(yaml|json) generated & versioned with release
   • Dev endpoint /v1/openapi.json disabled in prod (unless explicitly allowed)
   • Frontend contracts pinned to shared types (no drift)

⸻

7. CI/CD Gates
   • lint & format (ESLint/Prettier) pass
   • Build (FE + BFF) pass
   • workbench-smoke (health curl) pass
   • smoke script (auth-dev-bypass) pass (non-prod only)
   • smoke script (tokened auth) pass (local JWT signer + JWKS)
   • OpenAPI generate/validate pass
   • Security: SBOM, secret scanning, dependency audit pass

Recommended: make workbench-smoke required in branch protection.

⸻

8. Runbooks (Operators)

Provide markdown runbooks (link here) for:
• Auth misconfiguration (401 storms)
• Catalog missing/bad (empty templates, 5xx on list)
• Ledger write failures (disk full, permissions)
• Guardian unavailable (x-guardian-mode header, 503 policy)
• SSE flooding or resource pressure (how to drain/reset)
• Rotate secrets (provider keys, OIDC config)
• Upgrade/rollback procedure with data integrity verification

⸻

9. Smoke Tests (Manual)

Bypass (non-prod only)

AUTH_DEV_BYPASS=1 PORT=3000 node workbench/bff/dist/server.js &
PORT=3000 ./scripts/smoke-workbench.sh
kill %1

Tokened (prod-like)

AUTH_DEV_SIGNER=1 OIDC_ISSUER=http://127.0.0.1/ OIDC_AUDIENCE=vaultmesh-dev \
OIDC_JWKS_URL=http://127.0.0.1:3000/dev/jwks.json PORT=3000 \
node workbench/bff/dist/server.js &

TOKEN=$(curl -fsS -X POST -H 'content-type: application/json' \
 -d '{"sub":"local-ci","roles":["operator","auditor"]}' \
 http://127.0.0.1:3000/v1/dev/token | jq -r .token)

AUTH_HEADER="Authorization: Bearer $TOKEN" PORT=3000 ./scripts/smoke-workbench.sh
kill %1

RBAC assertion (should be 403 for auditor on execute)

TOKEN_AUD=$(curl -fsS -X POST -H 'content-type: application/json' \
 -d '{"sub":"aud","roles":["auditor"]}' \
 http://127.0.0.1:3000/v1/dev/token | jq -r .token)

curl -f -s -o /dev/null -H "Authorization: Bearer $TOKEN_AUD" \
 http://127.0.0.1:3000/v1/api/templates # 200
curl -s -w "%{http_code}\n" -o /dev/null -H "Authorization: Bearer $TOKEN_AUD" \
 http://127.0.0.1:3000/v1/api/execute # 403 expected

⸻

10. Deployment Modes

Single-port (recommended)
• BFF serves SPA + API on PORT
• Reverse proxy (NGINX/Traefik) terminates TLS; CSP/CORS set appropriately

Dev duo (HMR)
• BFF on BFF_PORT
• Vite on VITE_DEV_PORT, proxy /v1, /guardian, /metrics
• Not used in prod

Makefile helpers:

make preview # builds + single-port serve on PORT (default 3000)
make dev2 # shows duo instructions (keeps existing dev intact)
make smoke # AUTH_DEV_BYPASS=1 smoke
make tokened-smoke # dev signer + JWT + JWKS verification
make kill # clears stuck BFF processes

⸻

11. Performance & Scale (Pilot Targets)
    • Template list latency p50/p95 recorded
    • Execute latency p50/p95 recorded
    • SSE stability under N concurrent clients
    • Catalog cache hit rate > X% (set threshold)
    • Error rate < Y% during pilot (set threshold)

⸻

12. Sign-off
    • Security lead reviewed & signed
    • SRE/Ops lead reviewed & signed
    • Product owner reviewed & signed
    • Rollback plan validated

⸻

Appendix: Known flags
• AUTH_DEV_BYPASS (dev-only; off in prod)
• AUTH_DEV_SIGNER (dev/CI for tokened smoke)
• AI_CORE_MODE=mock|live
• OIDC_ISSUER, OIDC_AUDIENCE, OIDC_JWKS_URL
• CORE_GRPC_ADDR (required in prod)
• VMESH_RBAC_PATH

⸻
