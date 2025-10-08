import type { FastifyInstance } from 'fastify';

const DASHBOARD_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forge API Dashboard</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 16px; background: #f8fafc; color: #0f172a; }
      h1 { margin: 0 0 8px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
      .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); }
      code, pre { background: #f1f5f9; padding: 4px 6px; border-radius: 4px; }
      pre { white-space: pre-wrap; overflow: auto; max-height: 220px; }
      button { padding: 6px 10px; border-radius: 8px; border: 1px solid #cbd5f5; background: #e2e8f0; cursor: pointer; }
      input, textarea { width: 100%; padding: 6px 8px; border: 1px solid #cbd5f5; border-radius: 8px; font-family: monospace; background: #fff; }
      .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .badge { display: inline-block; padding: 2px 6px; border-radius: 999px; font-size: 12px; background: #e2e8f0; color: #0f172a; }
      .ok { background: #bbf7d0; color: #166534; }
      .err { background: #fecaca; color: #991b1b; }
      textarea { min-height: 140px; }
      #sse-log { height: 260px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>Forge API Dashboard</h1>
    <p>Served directly by the BFF for quick operational checks without rebuilding the React frontend.</p>

    <div class="grid">
      <div class="card">
        <h3>Health</h3>
        <div id="health-status" class="badge">unknown</div>
        <pre id="health-json"></pre>
        <div class="row"><button onclick="pingHealth()">Ping /health</button></div>
      </div>

      <div class="card">
        <h3>Templates</h3>
        <div id="tpl-count" class="badge">?</div>
        <pre id="tpl-json"></pre>
        <div class="row"><button onclick="listTemplates()">GET /v2/templates</button></div>
      </div>

      <div class="card">
        <h3>Ledger (Last Event)</h3>
        <div id="ledger-has" class="badge">?</div>
        <pre id="ledger-json"></pre>
        <div class="row">
          <input id="ledger-day" placeholder="YYYY-MM-DD (optional)" />
          <button onclick="ledgerLast()">GET /v1/ledger/last</button>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>SSE Run &amp; Bind</h3>
      <div class="row">
        <input id="keyword" placeholder="keyword (e.g., guardrails-check)" value="guardrails-check" />
        <input id="model" placeholder="model (optional)" value="" />
        <button onclick="runSse()">Run</button>
        <div id="sse-status" class="badge">idle</div>
      </div>
      <label for="args">Args (JSON)</label>
      <textarea id="args">{"templateYaml":"id:x\nversion:1.0.0\nkeyword:test\ninputs:[]\nprompts:{system:\"ok\",user:\"hi\"}"}</textarea>
      <pre id="sse-log" style="margin-top:8px;"></pre>
    </div>

    <script>
      async function pingHealth() {
        const output = document.getElementById('health-json');
        const badge = document.getElementById('health-status');
        try {
          const response = await fetch('/health');
          const json = await response.json();
          output.textContent = JSON.stringify(json, null, 2);
          badge.textContent = json.ok ? 'ok' : 'error';
          badge.className = 'badge ' + (json.ok ? 'ok' : 'err');
        } catch (error) {
          output.textContent = String(error);
          badge.textContent = 'error';
          badge.className = 'badge err';
        }
      }

      async function listTemplates() {
        const output = document.getElementById('tpl-json');
        const badge = document.getElementById('tpl-count');
        try {
          const response = await fetch('/v2/templates');
          const json = await response.json();
          output.textContent = JSON.stringify(json, null, 2);
          badge.textContent = String(json.count ?? '?');
          badge.className = 'badge ok';
        } catch (error) {
          output.textContent = String(error);
          badge.textContent = 'error';
          badge.className = 'badge err';
        }
      }

      async function ledgerLast() {
        const output = document.getElementById('ledger-json');
        const badge = document.getElementById('ledger-has');
        const dayInput = document.getElementById('ledger-day');
        try {
          const url = new URL('/v1/ledger/last', window.location.origin);
          if (dayInput.value.trim()) {
            url.searchParams.set('day', dayInput.value.trim());
          }
          const response = await fetch(url);
          const json = await response.json();
          output.textContent = JSON.stringify(json, null, 2);
          const hasEvent = Boolean(json.hasFile && json.last);
          badge.textContent = hasEvent ? 'has event' : 'no event';
          badge.className = 'badge ' + (hasEvent ? 'ok' : 'err');
        } catch (error) {
          output.textContent = String(error);
          badge.textContent = 'error';
          badge.className = 'badge err';
        }
      }

      let eventSource;
      function runSse() {
        const status = document.getElementById('sse-status');
        const log = document.getElementById('sse-log');
        const keyword = document.getElementById('keyword').value.trim() || 'guardrails-check';
        const model = document.getElementById('model').value.trim();
        const args = document.getElementById('args').value;
        if (eventSource) {
          eventSource.close();
        }
        const url = new URL('/v3/run/stream', window.location.origin);
        url.searchParams.set('keyword', keyword);
        if (model) {
          url.searchParams.set('model', model);
        }
        if (args) {
          url.searchParams.set('args', args);
        }

        eventSource = new EventSource(url);
        status.textContent = 'connecting';
        status.className = 'badge';
        log.textContent = '';

        eventSource.onopen = () => {
          status.textContent = 'open';
          status.className = 'badge ok';
        };
        eventSource.onerror = () => {
          status.textContent = 'error';
          status.className = 'badge err';
        };
        eventSource.addEventListener('progress', (event) => append('progress', event.data));
        eventSource.addEventListener('done', (event) => {
          append('done', event.data);
          eventSource.close();
          status.textContent = 'closed';
          status.className = 'badge';
        });
        eventSource.addEventListener('error', (event) => append('error', event.data));
        eventSource.onmessage = (event) => append('message', event.data);

        function append(type, data) {
          let pretty = data;
          try {
            pretty = JSON.stringify(JSON.parse(data), null, 0);
          } catch (err) {
            pretty = String(data ?? err);
          }
          log.textContent += `[${new Date().toISOString()}] ${type}: ${pretty}\n`;
          log.scrollTop = log.scrollHeight;
        }
      }
    </script>
  </body>
</html>`;

export default async function registerDevDashboard(app: FastifyInstance) {
  app.get('/dev/dashboard', async (_, reply) => {
    reply.type('text/html').send(DASHBOARD_HTML);
  });
}
