# Forge API Dashboard

A zero-build dashboard served directly from the BFF to test health, template discovery, ledger inspection, and SSE execution flows without rebuilding the React frontend.

## Start the dashboard

```bash
node workbench/bff/src/server.port8787.dashboard.ts
open http://localhost:8787/dev/dashboard
```

## Cards

- **Health** – pings `/health`.
- **Templates** – fetches `/v2/templates`.
- **Ledger (Last Event)** – calls `/v1/ledger/last?day=YYYY-MM-DD` (defaults to today).
- **SSE Run & Bind** – streams `/v3/run/stream` and shows the progress and final ledger hash.

## Notes

- Built for environments like Replit or Codespaces where the dashboard expects port `8787`.
- Works alongside the proof gate workflow for rapid demos.
- Styles are intentionally minimal; no external assets are loaded.
