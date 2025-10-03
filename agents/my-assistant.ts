// Minimal Guardian assistant wired to Workbench BFF
// ESM, no extra deps
import OpenAI from 'openai';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFile = promisify(_execFile);

const MODEL = process.env.GUARDIAN_MODEL || 'gpt-4o-mini';
const API_BASE = process.env.VM_API_BASE || 'http://localhost:8787'; // BFF base
const PROXY_BASE = (process.env.AI_COMPANION_PROXY_URL || '').replace(/\/$/, '');
const USE_OPENAI = !!process.env.OPENAI_API_KEY; // else tool-only mode

const client = USE_OPENAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : undefined;

// Helper: call Workbench BFF execute endpoint
async function execTemplate(
  templateId: string,
  args: Record<string, unknown> = {},
  profile = 'vault'
) {
  const r = await fetch(`${API_BASE}/v1/api/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ templateId, profile, args }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`execute ${templateId} failed: ${r.status} ${t}`);
  }
  return r.json();
}

// Optional: list templates (for intent mapping or help replies)
async function listTemplates(): Promise<Array<{ id?: string; keyword?: string; name?: string }>> {
  const r = await fetch(`${API_BASE}/v1/api/templates`);
  if (!r.ok) throw new Error(`templates list failed: ${r.status}`);
  const payload = await r.json();
  return Array.isArray(payload) ? payload : [];
}

function extractTemplateNames(list: Array<{ id?: string; keyword?: string; name?: string }>): string[] {
  return list
    .map((t) => t.id || t.keyword || t.name)
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
}

// Optional: call Google AI Companion via Cloud Run proxy (OAuth service account)
async function invokeCompanion(
  path: string,
  body: unknown = {},
  method: string = 'POST',
  query?: Record<string, string> | string
): Promise<unknown> {
  if (!PROXY_BASE) {
    throw new Error('AI_COMPANION_PROXY_URL not set');
  }
  const payload: Record<string, unknown> = { path, method: method.toUpperCase(), body };
  if (query) payload.query = query;
  // Try to attach an ID token if the service is private
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  let idToken = process.env.AI_COMPANION_ID_TOKEN;
  if (!idToken) {
    try {
      const { stdout } = await execFile('gcloud', [
        'auth',
        'print-identity-token',
        `--audiences=${PROXY_BASE}`,
      ]);
      idToken = (stdout || '').trim();
    } catch {
      // no gcloud or not logged in; proceed without token
    }
  }
  if (idToken) headers['authorization'] = `Bearer ${idToken}`;
  const r = await fetch(`${PROXY_BASE}/invoke`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { text };
  }
  if (!r.ok) {
    throw new Error(`companion invoke failed: ${r.status}`);
  }
  return data;
}

// ---- The required entry point the Guardian route loads ----
export async function askGuardian(input: string) {
  const q = (input || '').trim();

  // 1) Tool-first: allow explicit "run <template> ..."
  const m = q.match(/^run\s+([a-z0-9\-_.:]+)(?:\s+(.+))?$/i);
  if (m) {
    const templateId = m[1];
    let args: Record<string, unknown> = {};
    try {
      if (m[2]) args = JSON.parse(m[2]);
    } catch (_e) {
      // Ignore non-JSON trailing text; treat as no-args
    }
    const out = await execTemplate(templateId, args);
    return {
      outputText: `✔ Ran ${templateId}.\n\n\`\`\`json\n${JSON.stringify(out, null, 2)}\n\`\`\``,
      events: [{ type: 'template.run', templateId, args }],
    };
  }

  // 2) Companion proxy path: "companion [method] <path> {json?}"
  const mc = q.match(/^companion(?:\s+(get|post|put|delete|patch))?\s+(\S+)(?:\s+(.+))?$/i);
  if (mc) {
    const method = (mc[1] || 'POST').toUpperCase();
    const proxyPath = mc[2];
    let body: Record<string, unknown> = {};
    try {
      if (mc[3]) body = JSON.parse(mc[3]);
    } catch {
      // ignore, use empty body
    }
    const out = await invokeCompanion(proxyPath, body, method);
    return {
      outputText: `✔ Companion ${method} ${proxyPath}.\n\n\`\`\`json\n${JSON.stringify(out, null, 2)}\n\`\`\``,
      events: [{ type: 'companion.invoke', method, path: proxyPath }],
    };
  }

  // 2a) Gemini code-execution (Vertex shortcut): "gemini vertex code <task>"
  const mv = q.match(/^gemini\s+vertex\s+code\s+(.+)$/i);
  if (mv) {
    const task = mv[1].trim();
    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const pexec = promisify(execFile);
      const args = ['scripts/gemini-code-exec.mjs', '--json', '--vertex', '--prompt', task];
      if (process.env.GEMINI_VERTEX_LOCATION) {
        args.push('--location', process.env.GEMINI_VERTEX_LOCATION);
      }
      if (process.env.GOOGLE_CLOUD_PROJECT) {
        args.push('--project', process.env.GOOGLE_CLOUD_PROJECT);
      }
      const { stdout } = await pexec('node', args, { env: process.env });
      const parsed = JSON.parse(stdout);
      return {
        outputText:
          `✔ Gemini (Vertex) code-exec ok.\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``,
        events: [{ type: 'gemini.code', provider: 'vertex', model: parsed?.model }],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { outputText: `Gemini (Vertex) code-exec failed: ${msg}`, events: [] };
    }
  }

  // 2b) Gemini code-execution: "gemini code <task>"
  const mg = q.match(/^gemini\s+code\s+(.+)$/i);
  if (mg) {
    const task = mg[1].trim();
    try {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const pexec = promisify(execFile);
      const { stdout } = await pexec('node', ['scripts/gemini-code-exec.mjs', '--json', '--prompt', task], {
        env: process.env,
      });
      const parsed = JSON.parse(stdout);
      return {
        outputText: `✔ Gemini code-exec ok.\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``,
        events: [{ type: 'gemini.code', model: parsed?.model }],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { outputText: `Gemini code-exec failed: ${msg}`, events: [] };
    }
  }

  // 2) Help path
  if (/help|what can you do|capabilities/i.test(q)) {
    let names: string[] = [];
    try {
      const tpl = await listTemplates();
      names = extractTemplateNames(tpl);
    } catch (_e) {
      // tolerate failures; keep static examples
    }
    const examples = [
      'run tem-recon {"target":"example.com"}',
      'run tem-vision {"subject":"Q3 security review"}',
      'gemini code sum of first 50 primes',
      'gemini vertex code sum of first 50 primes',
      'companion POST /<CONFIRMED_METHOD_PATH> {"prompt":"tick"}',
    ];
    const header = 'I can run VaultMesh templates via Workbench.';
    const available = names.length
      ? `\nAvailable now (${names.length}): ${names.slice(0, 20).join(', ')}${
          names.length > 20 ? ' …' : ''
        }`
      : '';
    return {
      outputText: `${header}\nTry:\n- ${examples.join('\n- ')}${available}`,
      events: [{ type: 'help' }],
    };
  }

  // 3) LLM path (only if you set OPENAI_API_KEY). Good for summaries / UX glue.
  if (USE_OPENAI) {
    const sys =
      'You are the VaultMesh Guardian. Be concise, safe, and operational. ' +
      'Prefer running templates when the user asks to "run <template> {json}".';
    const res = await client!.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: q },
      ],
    });
    const text = res.choices?.[0]?.message?.content ?? 'Agent responded.';
    return { outputText: text, events: [] };
  }

  // 4) If no LLM key, fall back to tool guidance
  return {
    outputText:
      'Guardian is in tool-only mode. Provide commands like:\n' +
      '• run tem-recon {"target":"example.com"}\n' +
      '• run tem-vision {"subject":"Q3 security review"}\n' +
      'Or set OPENAI_API_KEY to enable chat.',
    events: [],
  };
}
