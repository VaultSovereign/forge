# AI Companion Proxy (Starter)

Minimal Cloud Run proxy that forwards JSON to `cloudaicompanion.googleapis.com` using a service account with least privilege. Includes Cloud Build deploy, budget scaffolding, log-based metric, and optional Cloud Scheduler driver.

## Quickstart

```bash
export PROJECT_ID=your-project
export REGION=europe-west3
export BILLING_ACCOUNT=BILLING-XXXXXX
gcloud config set project $PROJECT_ID

make -C ai-companion-proxy-starter enable
make -C ai-companion-proxy-starter deploy

# Authenticated smoke test (org policy blocks allUsers)
make -C ai-companion-proxy-starter proxy-health-auth

# Optional: budget, alerts, and driver
make -C ai-companion-proxy-starter alerts
make -C ai-companion-proxy-starter budget
make -C ai-companion-proxy-starter driver
```

**Authentication Helpers:**

```bash
make proxy-url             # Print Cloud Run URL
make proxy-token           # Print ID token
make proxy-health-auth     # Authenticated health check
make proxy-who             # Show IAM policy bindings
make proxy-drill           # Run 60-second guardian drill (full health check)
```

**Guardian Drill (Recommended):**

```bash
# Run comprehensive health & auth check
make proxy-drill

# Expected output:
# ✅ Auth enforcement (403 without token)
# ✅ Authenticated access (200 with token)
# ✅ Status: OPERATIONAL
```

Safety: caps `--max-instances`, budgets with 25/50/90% alerts, and proxy logs status+latency for metering. Replace `/<CONFIRMED_METHOD_PATH>` once you confirm the actual AI Companion endpoint in your project.

**Organization Policy Note:** If your org policy blocks `allUsers` (recommended), the service requires authenticated requests with an ID token. See [DEPLOY_GCP.md](../docs/DEPLOY_GCP.md) for full authentication patterns and [OPERATIONS.md](./OPERATIONS.md) for maintenance procedures.

---

## Using from VaultMesh Guardian

Set the Cloud Run URL as `AI_COMPANION_PROXY_URL` and POST to `/invoke` with `{ path, method, body }`. Example helper:

```ts
async function invokeCompanion(path: string, body: any) {
  if (!process.env.AI_COMPANION_PROXY_URL) throw new Error('AI_COMPANION_PROXY_URL not set');
  const r = await fetch(`${process.env.AI_COMPANION_PROXY_URL}/invoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, method: 'POST', body }),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { text }; }
}
```

Then detect intents in your Guardian and forward as needed.

---

## Authenticated Access

**Organization Policy Note:** If your GCP organization blocks `allUsers` (via `constraints/iam.allowedPolicyMemberDomains`), the service requires authentication. This is the recommended security posture.

### Quick Smoke Test (Authenticated)

```bash
# From root directory
make proxy-health

# Or from ai-companion-proxy-starter directory
make proxy-health-auth
```

**Example output:**
```json
{
  "ok": true,
  "base": "https://cloudaicompanion.googleapis.com"
}
```

### Makefile Helpers

```bash
make proxy-url             # Print the Cloud Run URL
make proxy-token           # Print an ID token for authentication
make proxy-health-auth     # Run authenticated health check
```

### Manual Authentication

```bash
# Get the service URL
URL=$(make proxy-url)

# Make authenticated request
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" "$URL/health"
```

### From Code (Node/TypeScript)

```typescript
import {GoogleAuth} from 'google-auth-library';

const audience = process.env.AI_COMPANION_PROXY_URL!;
const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(audience);

// Authenticated request
const {data} = await client.request({ 
  url: `${audience}/health` 
});
console.log(data);
```

See [`docs/DEPLOY_GCP.md`](../docs/DEPLOY_GCP.md) for service-to-service authentication patterns and additional details.

---
