// Minimal Gemini Code Execution via OAuth/ADC (no API key)
// Usage:
//   node scripts/gemini-code-exec.mjs --prompt "sum of first 50 primes" [--model gemini-2.5-flash] [--json]
//   ADC: run `gcloud auth application-default login` and ensure the Generative Language API is enabled.

import minimist from 'minimist';
import { execFile as _execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(_execFile);

function envProject() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    null
  );
}

async function getProjectId() {
  const existing = envProject();
  if (existing) return existing;
  try {
    const { stdout } = await execFile('gcloud', ['config', 'get-value', 'project']);
    const v = (stdout || '').trim();
    if (v && v !== '(unset)') return v;
  } catch {}
  throw new Error('PROJECT_ID not found. Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project <id>');
}

async function getAccessTokenADC() {
  // Prefer ADC via gcloud helper; works with OAuth user creds or service accounts.
  try {
    const { stdout } = await execFile('gcloud', [
      'auth',
      'application-default',
      'print-access-token',
    ]);
    const token = (stdout || '').trim();
    if (!token) throw new Error('empty');
    return token;
  } catch (e) {
    throw new Error('Could not obtain ADC access token. Run: gcloud auth application-default login');
  }
}

function buildBodyAi(prompt) {
  return {
    tools: [{ code_execution: {} }],
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };
}

function extractParts(payload) {
  const c = payload?.candidates?.[0];
  const parts = c?.content?.parts || [];
  const out = [];
  for (const p of parts) {
    if (p?.text) out.push({ type: 'text', text: p.text });
    // ai.google.dev REST uses snake_case
    if (p?.executable_code?.code) out.push({ type: 'code', code: p.executable_code.code });
    if (p?.code_execution_result?.output) out.push({ type: 'output', output: p.code_execution_result.output });
    // client SDKs may camelCase; handle just in case
    if (p?.executableCode?.code) out.push({ type: 'code', code: p.executableCode.code });
    if (p?.codeExecutionResult?.output) out.push({ type: 'output', output: p.codeExecutionResult.output });
  }
  return out;
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['prompt', 'model', 'location', 'project'],
    boolean: ['json', 'vertex'],
    alias: { p: 'prompt', m: 'model', l: 'location' },
    default: { model: 'gemini-2.5-flash', location: 'us-central1', vertex: false },
  });

  const prompt = argv.prompt || argv._.join(' ').trim();
  if (!prompt) {
    console.error('Usage: node scripts/gemini-code-exec.mjs --prompt "<task>" [--model gemini-2.5-flash] [--json]');
    process.exit(2);
  }

  const model = argv.model || 'gemini-2.5-flash';
  const token = await getAccessTokenADC();
  const projectId = argv.project || (await getProjectId());

  const useVertex = !!argv.vertex;
  const url = useVertex
    ? `https://${argv.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/locations/${encodeURIComponent(argv.location)}/publishers/google/models/${encodeURIComponent(
        model
      )}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = buildBodyAi(prompt);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(useVertex ? {} : { 'x-goog-user-project': projectId }),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { text }; }
  if (!res.ok) {
    console.error('Gemini API error:', res.status, text);
    process.exit(1);
  }

  const parts = extractParts(data);
  if (argv.json) {
    console.log(
      JSON.stringify(
        { provider: useVertex ? 'vertex' : 'ai.google.dev', model, location: argv.location, projectId, prompt, parts },
        null,
        2
      )
    );
    return;
  }

  for (const part of parts) {
    if (part.type === 'text') console.log(part.text);
    if (part.type === 'code') console.log('CODE:\n' + part.code);
    if (part.type === 'output') console.log('OUT:\n' + part.output);
  }
}

// Only auto-run outside test
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  main().catch((e) => {
    console.error(e?.stack || String(e));
    process.exit(1);
  });
}
