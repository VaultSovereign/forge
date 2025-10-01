# Portal Dashboard - Smoke Test Guide

## Overview
This guide shows how to verify that both the BFF (Backend-for-Frontend) and React frontend are running correctly in Replit.

## Services Running

When you click "Run", the following services start automatically:
- **BFF Server**: Node.js/Fastify server on port 8787
- **Frontend**: React/Vite dev server on port 5000

## Verification Steps

### 1. Check Frontend is Accessible
The Replit webview automatically shows the frontend on port 5000.

**Expected**: You should see the Portal Dashboard UI loading in the browser.

### 2. Verify BFF Status Endpoint
The BFF provides a health check endpoint.

**Test**: In a new terminal or using curl:
```bash
curl http://localhost:8787/v1/health
```

**Expected Response**:
```json
{"status":"ok"}
```

### 3. Check Templates API
The templates endpoint lists available VaultMesh templates.

**Test**:
```bash
curl http://localhost:8787/v1/api/templates
```

**Expected**: JSON array of template objects with fields like `id`, `name`, `version`, etc.

### 4. Run a Template via Frontend
1. In the frontend UI, find the templates list
2. Select any template (e.g., "DORA ICT Risk Framework")
3. Click "Run" or "Execute"
4. Fill in any required parameters
5. Submit the form

**Expected**: 
- The template executes successfully
- Results are displayed in the UI
- A new entry appears in the Reality Ledger

### 5. Verify Ledger Events
Check that the template execution was recorded in the ledger.

**Test**:
```bash
curl http://localhost:8787/v1/api/ledger/events?limit=10
```

**Expected**: JSON array showing recent events, including your template execution.

## Package Manager Fallback

The system automatically uses pnpm if available, otherwise falls back to npm:
- ✅ Tries pnpm first (faster, uses workspace features)
- ✅ Falls back to npm if pnpm setup fails (sandbox restrictions)

You don't need to do anything - this is handled automatically.

## Port Configuration

| Service  | Port | Environment Variable | Access |
|----------|------|---------------------|---------|
| Frontend | 5000 | PORT=5000 | Replit webview |
| BFF      | 8787 | PORT=8787 | http://localhost:8787 |

The frontend proxies `/v1/*` requests to the BFF automatically.

## Troubleshooting

### Frontend not loading?
1. Check logs: Click on "Portal Dashboard" workflow to see output
2. Verify Vite started on port 5000
3. Look for any error messages

### BFF not responding?
1. Check BFF logs for errors
2. Verify it started on port 8787: `netstat -tuln | grep 8787`
3. Check environment variables are set correctly

### Template execution fails?
1. Ensure you have the required API keys (OPENAI_API_KEY, etc.)
2. Check BFF logs for detailed error messages
3. Verify the reality_ledger directory exists and is writable

## Success Criteria

✅ Frontend loads on port 5000  
✅ BFF /v1/health returns {"status":"ok"}  
✅ Templates list loads successfully  
✅ Can execute a template and see results  
✅ Ledger records the execution event  

If all checks pass, your Portal Dashboard is working correctly!
