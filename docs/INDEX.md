# Forge Docs Index

Quick links:

- Run Modes: README_RUN_MODES.md
- Production Checklist: PROD_CHECKLIST.md
- Operations Runbook: OPERATIONS_RUNBOOK.md
- Security Overview: SECURITY.md
- API Reference: OPENAPI.md
- Full Sitemap: SITEMAP.md

## Run Modes Shortcuts (Makefile)

Internal (served by BFF at /docs):

- Single‑port preview: `make docs:internal-preview`
- Dev duo: `make docs:internal-dev`

External (e.g., GitHub Pages):

- Single‑port preview: `make docs:external DOCS_URL=https://mydomain/docs`
- Dev duo: `make docs:external-dev DOCS_URL=https://mydomain/docs`

Notes

- API link appears when `import.meta.env.DEV` or `VITE_EXPOSE_OPENAPI=1`; server route gated by `EXPOSE_OPENAPI=1` (or dev).
- Docs link appears when `VITE_EXPOSE_DOCS=1`. Default is `/docs/OPENAPI.md`; override with `VITE_DOCS_URL`.
