import type { Template, RunArgs } from './types.js';

export type SafetyLevel = 'read-only' | 'advisory' | 'lab-only' | 'restricted';

export interface PreflightResult {
  level: SafetyLevel;
  notes: string[];
}

export function safetyPreflight(t: Template, args: RunArgs): PreflightResult {
  const notes: string[] = [];
  let level: SafetyLevel = 'read-only';

  // Passive-only for recon
  if (t.keyword === 'tem-recon') {
    if (args.scope && String(args.scope).toLowerCase() === 'out-of-scope') {
      throw new Error(
        'Scope is out-of-scope. Deny-by-default. Provide explicit approval to proceed.'
      );
    }
    notes.push('Passive-only enforced. No live probing or scanning.');
  }

  if (t.keyword === 'tem-guardrails') {
    level = 'advisory';
    notes.push('Advisory-only. No enforcement actions will be taken.');
  }

  if (args.lab || args.variant === 'lab') {
    if (!process.env.ROE_TOKEN) {
      throw new Error('Lab-only requested but ROE_TOKEN is missing. Aborting.');
    }
    level = 'lab-only';
    notes.push('Lab isolation banner set. Live payloads denied.');
  }

  return { level, notes };
}
