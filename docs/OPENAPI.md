# Workbench API — OpenAPI Reference

This API reference is sourced from `docs/openapi/workbench.yaml` and describes the Workbench BFF (`/v1/*`) including templates, execute (REST + SSE), ledger, health, guardian, and metrics.

- Source spec: `docs/openapi/workbench.yaml`
- Suggested viewers: Redocly, Swagger UI, VS Code OpenAPI extension

## Quick View Options

- VS Code: install an OpenAPI viewer and open `docs/openapi/workbench.yaml`
- Local Redoc (example):
  ```bash
  npx redoc-cli serve docs/openapi/workbench.yaml --watch
  ```
- Swagger UI (Docker):
  ```bash
  docker run -p 8080:8080 -e SWAGGER_JSON=/spec/workbench.yaml \
    -v $(pwd)/docs/openapi:/spec swaggerapi/swagger-ui
  # then open http://localhost:8080
  ```

## Sanity Check

- Health:
  ```bash
  curl -fsS http://127.0.0.1:8787/v1/health | jq .
  ```
- SSE ticks:
  ```bash
  curl -Ns http://127.0.0.1:8787/v1/tick/stream | head -n 5
  ```
- Templates:
  ```bash
  curl -fsS http://127.0.0.1:8787/v1/api/templates | jq . | head -n 20
  ```

## Notes
- In development, `AUTH_DEV_BYPASS=1` allows testing without a token.
- For production-like tests, enable the dev signer and mint a short‑lived JWT, then call the APIs with `Authorization: Bearer <token>`.

