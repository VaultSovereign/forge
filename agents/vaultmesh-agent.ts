// agents/vaultmesh-agent.ts
// Minimal VaultMesh Agent using OpenAI Agents SDK (TypeScript)

import { Agent, tool, handoff } from '@openai/agents';
import { z } from 'zod';

const VM_API_BASE = process.env.VITE_API_BASE || 'http://localhost:8787'; // Replit secrets → VITE_API_BASE

// ---- Tools (wrap your BFF endpoints) ----

const listTemplates = tool({
  name: 'list_templates',
  description: 'List available execution templates in VaultMesh.',
  parameters: z.object({}),
  execute: async () => {
    const r = await fetch(`${VM_API_BASE}/templates`);
    if (!r.ok) throw new Error(`list_templates failed: ${r.status}`);
    return await r.json();
  },
});

const listLedger = tool({
  name: 'list_ledger',
  description: 'Fetch recent Reality Ledger entries.',
  parameters: z.object({
    limit: z.number().int().min(1).max(200).default(25),
  }),
  execute: async ({ limit }) => {
    const r = await fetch(`${VM_API_BASE}/ledger?limit=${limit}`);
    if (!r.ok) throw new Error(`list_ledger failed: ${r.status}`);
    return await r.json();
  },
});

const runTemplate = tool({
  name: 'run_template',
  description: 'Execute a template with JSON args; emits a new ledger event.',
  parameters: z.object({
    id: z.string().min(1),
    args: z.record(z.any()).default({}),
  }),
  execute: async ({ id, args }) => {
    const r = await fetch(`${VM_API_BASE}/run/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`run_template failed: ${r.status}`);
    return await r.json();
  },
});

const verifyStatus = tool({
  name: 'verify_status',
  description: 'Check BFF/Portal health and latest Merkle root if available.',
  parameters: z.object({}),
  execute: async () => {
    const r = await fetch(`${VM_API_BASE}/status`);
    if (!r.ok) throw new Error(`verify_status failed: ${r.status}`);
    return await r.json();
  },
});

// ---- Specialist "Runner" agent ----

export const runnerAgent = new Agent({
  name: 'VaultMesh Runner',
  instructions: [
    'You execute VaultMesh templates safely and report structured results.',
    'Always echo back: template id, args, status, and resulting ledger id if present.',
    'Do not guess arguments; if missing, ask for the minimal fields, then call the tool.',
  ].join(' '),
  tools: [runTemplate, listLedger],
});

// ---- Triage/root agent with handoff to Runner ----

export const triageAgent = new Agent({
  name: 'VaultMesh Guardian',
  instructions: [
    'You are the Guardian of the Reality Ledger.',
    'Understand the user request, then either: (a) list info, (b) verify health, or (c) hand off execution.',
    'Prefer tools for facts; do not hallucinate ledger rows or templates.',
  ].join(' '),

  // lightweight utilities available to the Guardian
  tools: [listTemplates, listLedger, verifyStatus],

  // delegate execution to the Runner when needed
  handoffs: [
    handoff({
      name: 'transfer_to_runner',
      description: 'Hand off when the user wants to run a template or re-run a failed one.',
      agent: runnerAgent,
    }),
  ],
});

// ---- Helper to run a single turn (Node/SSR / Replit Task) ----

export async function askGuardian(input: string, model = 'gpt-4.1') {
  const res = await triageAgent.run({
    model,
    // Provide a concise, auditable prompt for the ledger world
    input,
  });
  return res;
}
