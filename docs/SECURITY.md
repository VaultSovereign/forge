<<<<<<< HEAD

# Security Overview

VaultMesh Workbench enforces JWT-based auth (OIDC), declarative RBAC, and sensible defaults for local/dev. This document summarizes the security‑relevant env flags, RBAC mapping, and quick tests.

---

## Auth (OIDC / JWT)

- Verification: issuer (`OIDC_ISSUER`) and audience (`OIDC_AUDIENCE` or `OIDC_CLIENT_ID`)
- JWKS: discovered via `OIDC_ISSUER/.well-known/jwks.json` or set `OIDC_JWKS_URL`
- Bypass (dev‑only): `AUTH_DEV_BYPASS=1` (should be off in prod)
- Dev signer (CI/local only): `AUTH_DEV_SIGNER=1` exposes:
  - `GET /dev/jwks.json` — ephemeral JWKS
  - `POST /v1/dev/token` — mints short‑lived RS256 tokens

Example claim (dev signer):

```json
{
  "sub": "local-ci",
  "https://vaultmesh/roles": ["operator"]
}
```

---

## RBAC (roles → actions)

- Mapping: `workbench/bff/config/rbac.yaml`
- Default roles:
  - operator: `templates:read`, `templates:write`, `execute:run`, `ledger:read`
  - auditor: `templates:read`, `ledger:read`
  - template-author: `templates:read`, `templates:write`
- Where to find roles in JWT: `RBAC_ROLES_CLAIM` (default: `https://vaultmesh/roles`)

Negative test (auditor → 403 on execute):

```bash
TOKEN_AUD=$(curl -s -X POST -H "content-type: application/json" \
  -d '{"sub":"aud","roles":["auditor"]}' \
  http://localhost:3000/v1/dev/token | jq -r .token)

curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_AUD" \
  http://localhost:3000/v1/api/execute    # 403
```

---

## OpenAPI / Docs exposure

- OpenAPI JSON: `/v1/openapi.json`
  - Dev: always on
  - Prod: set `EXPOSE_OPENAPI=1`
- Docs (Markdown): `/docs/OPENAPI.md` (served statically)
  - BFF: set `EXPOSE_DOCS=1` to serve `/docs/*`
  - Frontend: set `VITE_EXPOSE_DOCS=1`; override URL with `VITE_DOCS_URL`

---

## Environment summary (prod posture)

- `AUTH_DEV_BYPASS=0` (unset or 0)
- `AUTH_DEV_SIGNER` unset (or 0)
- `OIDC_ISSUER`, `OIDC_AUDIENCE` set
- `RBAC_ROLES_CLAIM` set (if not default)
- `EXPOSE_OPENAPI` off unless intentionally exposing `/v1/openapi.json`
- `EXPOSE_DOCS` off unless serving `/docs/*`
- `CORE_GRPC_ADDR` required in production
- Rate‑limit chatty endpoints: `/v1/api/execute`, `/guardian/ask` (recommended)

---

## Quick tests

Sanity (OpenAPI JSON):

```bash
curl -fsS http://localhost:3000/v1/openapi.json | jq .info
```

Secured list (mint + call):

```bash
TOKEN=$(curl -s -X POST -H "content-type: application/json" \
  -d '{"sub":"local-ci","roles":["operator","auditor"]}' \
  http://localhost:3000/v1/dev/token | jq -r .token)

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/v1/api/templates | jq .
```

=======

# Security Overview (Placeholder)

Security posture, auth, RBAC, and environment flags.

## Authentication

- Define auth modes (bypass vs tokened)

## RBAC

- Roles and permissions overview

## Environment Flags

- `EXPOSE_OPENAPI=1` — expose API spec in prod

## Quick Tests

- Verify auth-required endpoints return 401/403 without credentials

> > > > > > > origin/main

---

## Secrets Redaction

Sensitive fields are redacted before writing to the ledger and should not appear in console output.

- Recognized key patterns (case-insensitive, applied recursively):
  - `apiKey`, `token`, `password`, `secret`, `authorization`, `auth`, `bearer`, `clientSecret`
- Redaction replaces values with `***REDACTED***` (or `null` when empty), preserving the surrounding structure.

Quick check (ledger redaction via tests):

```bash
pnpm vitest -t "redacts"
```

### Org Policy Safety Net (recommended)
Prevents accidental `allUsers` grants on any service.

```bash
# Require an Org Admin or Folder Admin context if set higher than project
gcloud org-policies set-policy <<'POLICY'
name: projects/$(gcloud config get-value project)/policies/iam.allowedPolicyMemberDomains
spec:
  rules:
  - denyAll: true
POLICY
```

(If your org enforces allowed domains differently, adjust accordingly. The goal: no public members.)
