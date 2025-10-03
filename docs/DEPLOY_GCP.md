# VaultMesh AI — GCP Deployment Guide (Workbench + CLI)

This guide deploys:

- **Workbench** (Fastify BFF + SPA) as a container
- **CLI** image for batch jobs
- Builds via **Cloud Build**, stores images in **Artifact Registry**, runs on **Cloud Run**

> Prereqs: `gcloud` auth; a GCP project with Artifact Registry + Cloud Run APIs enabled.

## 1) IAM Setup (Critical - Run First)

Cloud Build needs permissions to read source from GCS, push images to Artifact Registry, and deploy to Cloud Run:

```bash
# Set helper variables
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

# 1) Grant Cloud Build SA permissions to read/write storage and push to Artifact Registry
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# 2) Grant Compute Engine default SA permissions (used by Cloud Build workers)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# 3) Allow Cloud Build to deploy to Cloud Run
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# 4) Allow Cloud Build to use your runtime service account on deploy
# (Replace with your actual runtime SA name if different)
gcloud iam service-accounts add-iam-policy-binding \
  "vaultmesh-workbench-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

**Why these permissions?**
- `roles/storage.admin` - Cloud Build SA reads uploaded source and writes build artifacts
- `roles/artifactregistry.writer` - Push Docker images to Artifact Registry
- `roles/storage.objectViewer` - Compute Engine SA reads source during build
- `roles/logging.logWriter` - Write build logs to Cloud Logging
- `roles/run.admin` - Deploy services to Cloud Run
- `roles/iam.serviceAccountUser` - Use the runtime service account for deployed services

## 2) Repository Setup

```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com
gcloud artifacts repositories create vaultmesh \
  --repository-format=docker --location=europe-west3 --description="VaultMesh images"
```

## 2.5) Region & Network (Germany)

- Region: europe-west3 (Frankfurt). Set `REGION=europe-west3` for builds and deploys.
- Network: For controlled egress, use a dedicated VPC + Cloud NAT in the same region.
- Serverless egress: Add a Serverless VPC Access connector and set Cloud Run egress to use it when needed.
- Workstation alignment: Use the same VPC/NAT as your sovereign workstation or a sibling VPC with Cloud NAT. Keep ingress auth-only (no `allUsers`).

Terraform pointers (add to `infra/gcp` if you want this fully managed):
- `google_compute_network` (custom), `google_compute_subnetwork` (REGION=europe-west3)
- `google_compute_router` + `google_compute_router_nat` (NAT all subnet ranges)
- `google_vpc_access_connector` (e.g., 10.8.0.0/28)
- Update Cloud Run template to use the connector and set `ingress`/invoker IAM as required.


## 3) Build & push images (Cloud Build)

`cloudbuild.yaml` already builds workbench and cli images. Run:

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=europe-west3,_REPO=vaultmesh
```

Images land under:
• `europe-west3-docker.pkg.dev/<PROJECT>/vaultmesh/workbench:<sha>`
• `europe-west3-docker.pkg.dev/<PROJECT>/vaultmesh/cli:<sha>`

## 4) Deploy Workbench to Cloud Run

### VPC Connector + NAT (egress via fixed IP)

When outbound egress must use a fixed IP, attach the Serverless VPC Access connector and route all traffic through Cloud NAT:

```bash
gcloud run deploy vaultmesh-workbench   --region=europe-west3   --image="$IMAGE"   --service-account="vaultmesh-workbench-sa@$(gcloud config get-value project).iam.gserviceaccount.com"   --vpc-connector="$VPC_CONNECTOR"   --vpc-egress=all-traffic   --port=8787 --timeout=900
```


SSE note: Cloud Run supports SSE; ensure clients use HTTP/2 and we set `X-Accel-Buffering: no` (already in BFF).

```bash
IMAGE="europe-west3-docker.pkg.dev/$(gcloud config get-value project)/vaultmesh/workbench:$(git rev-parse --short HEAD)"

gcloud run deploy vaultmesh-workbench \
  --image="$IMAGE" \
  --service-account="vaultmesh-workbench-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --region=europe-west3 \
  --platform=managed \
  --port=8787 \
  # For Vertex AI, you no longer need to pass an API key as an env var.
  --set-env-vars="NODE_ENV=production,AUTH_DEV_BYPASS=0" \
  --set-env-vars="CORS_ORIGIN=https://your-domain" \
  --set-env-vars="LEDGER_DIR=/var/ledger" \
  --timeout=900 --memory=1Gi --cpu=1
```

If using Secret Manager, mount provider keys via `--update-secrets` (recommended).

## 5) Verify health & SSE

```bash
curl -fsS https://<run-url>/v1/api/health | jq .
curl -fsSN "https://<run-url>/v1/api/execute/stream?templateId=demo.echo&args=%7B%22message%22%3A%22hi%22%7D" | head -n 10
```

**Note on authentication:** If your organization policy prevents unauthenticated access (recommended for production), use an identity token:

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://<run-url>/v1/api/health | jq .
```

## 6) Security & scaling notes

    •	Auth: enable OIDC; set `AUTH_DEV_BYPASS=0`. Validate JWT in BFF.
    •	SSE: already sets `Cache-Control: no-cache`, `Connection: keep-alive`, retry hints.
    •	Autoscaling: start with `--max-instances=3`, add later as needed.
    •	Ledger: store on a durable volume or forward events to a storage backend (GCS bucket) if desired.

---

> ### Auth-only Cloud Run (recommended)
> We do **not** use `--allow-unauthenticated`. Access is enforced by IAM:
> - Only approved service accounts have `roles/run.invoker`.
> - Anonymous/public callers receive 401/403.
> - Terraform owns invoker bindings via `google_cloud_run_v2_service_iam_binding`.
> - One-time cleanup if previously public:
>   ```bash
>   gcloud run services remove-iam-policy-binding <SERVICE> \
>     --region=<REGION> --member=allUsers --role=roles/run.invoker || true
>   ```


## Authenticated Access (Organization Policy Enforcement)

If your organization policy (`constraints/iam.allowedPolicyMemberDomains`) blocks `allUsers`, services **cannot be made public**. This is expected and desirable for security.

### A) Human/Operator Access (CLI)

Use an identity token for authenticated requests:

```bash
# Get service URL
AUD=$(gcloud run services describe ai-companion-proxy --region=europe-west3 \
  --format='value(status.url)')

# Make authenticated request
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" "$AUD/health"
```

### B) Service-to-Service Access (GCP → GCP)

1. **Grant Invoker Role** to the calling service account:

```bash
PROJECT_ID=$(gcloud config get-value project)
CALLER_SA="my-caller@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud run services add-iam-policy-binding ai-companion-proxy \
  --region=europe-west3 \
  --member="serviceAccount:${CALLER_SA}" \
  --role="roles/run.invoker"
```

2. **Fetch ID Token** from metadata service (Cloud Run / GCE / GKE):

```bash
AUD="https://ai-companion-proxy-2llr4a5w3a-ew.a.run.app"
ID_TOKEN=$(curl -s -H "Metadata-Flavor: Google" \
  "http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=${AUD}&format=full")
curl -H "Authorization: Bearer ${ID_TOKEN}" "${AUD}/health"
```

### C) Node/TypeScript (ADC; local or server)

```typescript
import {GoogleAuth} from 'google-auth-library';

const audience = 'https://ai-companion-proxy-2llr4a5w3a-ew.a.run.app';
const auth = new GoogleAuth();
const client = await auth.getIdTokenClient(audience);

const {data} = await client.request({ url: `${audience}/health` });
console.log(data);
```

### Makefile Helpers

For convenience, the `ai-companion-proxy-starter` Makefile includes authenticated access helpers:

```bash
# From the ai-companion-proxy-starter directory
make proxy-url             # Print the Cloud Run URL
make proxy-token           # Print an ID token
make proxy-health-auth     # Run authenticated health check
make proxy-who             # Show IAM policy bindings

# From the root directory (shortcuts)
make proxy-health          # Runs proxy-health-auth
make proxy-who             # Show who has access
```

**Examples:**

```bash
$ make proxy-health
{
  "ok": true,
  "base": "https://cloudaicompanion.googleapis.com"
}

$ make proxy-who
ROLE                    MEMBERS
roles/run.invoker       serviceAccount:caller@project.iam.gserviceaccount.com
```

### Verification & Troubleshooting

**Quick Verify (1-minute drill):**

```bash
# 1) Test all helpers
make proxy-url
make proxy-token
make proxy-health

# 2) Negative test (should return 403 without token)
AUD=$(make -C ai-companion-proxy-starter proxy-url | tail -n1)
curl -i "$AUD/health" | head -n20
# Expected: HTTP/2 403 Forbidden
```

**Common Issues:**

- **401/403 error** → Ensure you're using an ID token. For user accounts: `gcloud auth print-identity-token`
- **403 for service account** → Run the invoker binding command above, then redeploy caller with that SA
- **Region mismatch** → Confirm `--region=europe-west3` is used consistently
- **Empty proxy-who output** → No explicit bindings yet; service uses default permissions
```

### Public Access (Not Recommended)

To allow public access, an Organization Admin must relax `constraints/iam.allowedPolicyMemberDomains` to permit `allUsers`. Most organizations keep this blocked for security. 

**Safer alternatives:**
- Put Cloud Run behind API Gateway or Global HTTP(S) Load Balancer with Identity Platform (OIDC)
- Keep auth-only and front with an authenticated edge service for browser calls

---

## 7) Additional Security & Scaling Notes
    •	Autoscaling: start with `--max-instances=3`, add later as needed.
    •	Ledger: store on a durable volume or forward events to a storage backend (GCS bucket) if desired.

---

### Budget & Egress IP Guard

Budget alert (monthly, example $50):

```bash
BILLING=$(gcloud beta billing accounts list --format='value(name)' | head -1)
gcloud beta billing budgets create   --billing-account="$BILLING"   --display-name="Run+NAT"   --budget-amount=50   --threshold-rule=percent=0.5   --threshold-rule=percent=0.9
```

Egress IP proof (NAT path)

```bash
# Public IP seen by the internet (from Cloud Run shell: curl container → ifconfig.me)
curl -s https://ifconfig.me; echo

# Expected NAT IP(s)
gcloud compute addresses list   --filter="name~nat AND region:europe-west3"   --format="table(name,address)"
```
