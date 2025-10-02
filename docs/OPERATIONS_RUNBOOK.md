VaultMesh Forge — Operations Runbook

This runbook provides step-by-step operational responses for common VaultMesh Forge incidents. It assumes the production checklist (docs/PROD_CHECKLIST.md) has been followed.

⸻

1. Authentication Misconfiguration (401 storms)

Symptoms
	•	All API calls return 401 missing_bearer or 401 invalid_token.
	•	Users cannot access templates or execute operations.

Diagnosis

kubectl logs deploy/forge-bff | grep 'invalid_token'
curl -i https://forge.example.com/v1/api/templates

Resolution
	1.	Check OIDC_ISSUER, OIDC_AUDIENCE, OIDC_JWKS_URL env vars.
	2.	Verify issuer ends with / and JWKS URL is accessible:

curl -fsS $OIDC_JWKS_URL | jq .


	3.	Confirm RBAC mapping claim path in config/rbac.yaml matches tokens.
	4.	If AUTH_DEV_BYPASS=1 is set in prod, remove and restart BFF.

⸻

2. Catalog Missing or Empty

Symptoms
	•	/v1/api/templates returns [].
	•	Dashboard shows “0 templates”.

Diagnosis

ls -la /app/catalog

Resolution
	1.	Ensure VMESH_CATALOG_ROOT points to mounted catalog path.
	2.	Validate YAML/JSON syntax in catalog files.
	3.	Run catalog linter:

node scripts/catalog-lint.mjs /app/catalog


	4.	If large catalog, verify caching index service is running.

⸻

3. Ledger Write Failures

Symptoms
	•	/v1/api/execute returns 500.
	•	Logs show ledger append error or disk full.

Diagnosis

df -h /app/artifacts
ls -la /app/artifacts/ledger/

Resolution
	1.	Check disk space; expand volume if full.
	2.	Verify permissions on ledger directory.
	3.	Attempt manual append test:

node scripts/journal_append.mjs --test


	4.	If corrupt shard, move to quarantine and restore from backup.

⸻

4. Guardian Unavailable

Symptoms
	•	/guardian/ask returns 503 with guardian_unavailable.
	•	Dashboard shows x-guardian-mode: stub.

Diagnosis

curl -i https://forge.example.com/guardian/ask

Resolution
	1.	Ensure Guardian agent binary is installed and on PATH.
	2.	If running in container, mount agent path and set GUARDIAN_MODE=agent.
	3.	If intentionally stubbed, confirm GUARDIAN_MODE=stub is set.
	4.	In prod, stub mode is not permitted; escalate if agent cannot be restored.

⸻

5. SSE Flooding or Resource Pressure

Symptoms
	•	High memory usage.
	•	Many open /v1/tick/stream connections.
	•	Clients report SSE disconnects.

Diagnosis

netstat -an | grep ESTABLISHED | grep 3000
kubectl top pods | grep forge-bff

Resolution
	1.	Confirm max SSE clients; scale replicas if needed.
	2.	Add SSE_MAX_CLIENTS env var to cap concurrent streams.
	3.	Restart BFF if runaway connections do not drain.

⸻

6. Secret Rotation

Procedure
	1.	Rotate secret in provider (e.g., OpenAI, OpenRouter).
	2.	Update value in secret manager or env injection.
	3.	Restart BFF pods:

kubectl rollout restart deploy/forge-bff


	4.	Validate by issuing test request:

curl -H "Authorization: Bearer $TOKEN" /v1/api/execute


⸻

7. Upgrade / Rollback

Upgrade
	1.	Pull new container image (tagged with git SHA).
	2.	Run make smoke on staging with both bypass and tokened auth.
	3.	Deploy to prod with canary strategy.
	4.	Monitor /metrics for error rate increase.

Rollback
	1.	Use previous image tag.
	2.	Validate ledger integrity:

node reality_ledger/verify.js --root artifacts/ledger


	3.	Redeploy.

⸻

8. Monitoring & Dashboards

Key Prometheus Metrics
	•	guardian_mode gauge
	•	template_runs_total{status}
	•	ledger_events_total{type}
	•	http_requests_total{route,status}
	•	http_request_duration_seconds_bucket

Dashboards
	•	Guardian mode one-hot panel
	•	Template runs rate + error %
	•	Ledger event throughput
	•	SSE client connections

⸻

9. Incident Communication
	•	Slack channel: #vaultmesh-ops
	•	PagerDuty escalation: VaultMesh On-Call SRE
	•	Status page update if user-visible impact > 15 min

⸻

Appendix

Common Commands

# Health
curl -fsS /v1/health | jq .

# Tokened smoke (local)
make tokened-smoke

# BFF logs
kubectl logs deploy/forge-bff -f


⸻

⚠️ Note: This runbook will evolve as monitoring and operational maturity increase. Update after every incident post-mortem.
