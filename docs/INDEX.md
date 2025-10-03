# 📚 Forge Docs Index

The Polis scroll library — start here to navigate all documentation.

---

## 🌌 Gateway Scrolls
- [CIVILIZATION_COVENANT.md](CIVILIZATION_COVENANT.md) — Polis constitution, Five Pillars, Creed  
- [VaultMesh_Mandala.svg](VaultMesh_Mandala.svg) — Interactive mandala (visual architecture)  
- [README.md](../README.md) — Entry scroll, install/build/test  

---

## ⚙️ Operations
- [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) — Day-to-day ops  
- [OPERATIONS.md](../ai-companion-proxy-starter/OPERATIONS.md) — Proxy guardian ops  
- [OPERATOR_CARD.md](../ai-companion-proxy-starter/OPERATOR_CARD.md) — One-page ops card  
- [PROD_CHECKLIST.md](PROD_CHECKLIST.md) — Deployment readiness checklist  

---

## 🛡️ Security & Guardianship
- [SECURITY.md](SECURITY.md) — Security overview  
- [GUARDIAN_ALERTING.md](GUARDIAN_ALERTING.md) — Slack + CI alerting rituals  
- [RECEIPTS.md](RECEIPTS.md) — Receipts schema + Merkle roots  
- [INCIDENT_2025-10-03_SLACK_WEBHOOK.md](INCIDENT_2025-10-03_SLACK_WEBHOOK.md) — Incident template  
- [SECURITY_CHECKLIST_SLACK_WEBHOOK.md](SECURITY_CHECKLIST_SLACK_WEBHOOK.md) — Rotation checklist  

---

## 📊 Development
- [README_RUN_MODES.md](README_RUN_MODES.md) — Run modes explained  
- [dev-workflow.html](dev-workflow.html) — Dev loop reference  
- [WORKBENCH.md](WORKBENCH.md) — Visual workbench architecture  
- [OPENAPI.md](OPENAPI.md) — API reference  
- [SITEMAP.md](SITEMAP.md) — Full sitemap  

---

## 🎨 Mandala Guides
- [MANDALA.md](MANDALA.md) — Comprehensive visual guide  
- [MANDALA_QUICKREF.md](MANDALA_QUICKREF.md) — Operator cheat sheet  
- [MANDALA_EXPORT.md](MANDALA_EXPORT.md) — Export options (PNG/WebP)  
- [MANDALA_CI.md](MANDALA_CI.md) — CI/CD integration guide  

---

## 🧪 Drills
- [Guardian Deploy Drill](./DRILLS/GUARDIAN_DEPLOY_DRILL.html)
- [Guardian Destroy Drill](./DRILLS/GUARDIAN_DESTROY_DRILL.html)
- [Guardian Ledger Visualizer](./DRILLS/GUARDIAN_LEDGER.html)

---

## ⚡ Run Modes Shortcuts (Makefile)

**Internal (served by BFF at `/docs`):**
- `make docs:internal-preview` — single-port preview  
- `make docs:internal-dev` — dev duo  

**External (e.g., GitHub Pages):**
- `make docs:external DOCS_URL=https://mydomain/docs`  
- `make docs:external-dev DOCS_URL=https://mydomain/docs`  

**Notes:**
- API link exposed when `import.meta.env.DEV` or `VITE_EXPOSE_OPENAPI=1`  
- Docs link exposed when `VITE_EXPOSE_DOCS=1` (default `/docs/OPENAPI.md`)  

---

## 🚀 Quick Start
- [basics.html](basics.html) — Orientation  
- [quickstart.html](quickstart.html) — Install, build, test, run  
- [troubleshooting.html](troubleshooting.html) — Common fixes  

---

**Steel sung. The Polis library is whole.**
