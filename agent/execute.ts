import Ajv from 'ajv';

import { searchCodex, getDoc } from '../tools/codex.js';
import { runForge } from '../tools/forge.js';
import { appendRealityEvent } from '../tools/ledger.js';

import { ExecReportSchema } from './schemas.js';

type RunLevel = 'read-only' | 'advisory' | 'lab-only';

type Budget = {
  steps: number;
  tokens: number;
  seconds: number;
};

type ExecutionConfig = {
  budget: Budget;
  runLevel: RunLevel;
};

type PlanStep = {
  id: string;
  tool: 'codex.search' | 'codex.get' | 'forge.run' | 'ledger.append';
  input: Record<string, unknown>;
  if?: string;
  saveAs?: string;
};

type PlannerPlan = {
  goal: string;
  steps: PlanStep[];
};

type ExecutionResult = {
  id: string;
  tool?: PlanStep['tool'];
  result?: unknown;
  skipped?: boolean;
  reason?: string;
};

const ajv = new Ajv({ allErrors: true });
const validateReport = ajv.compile(ExecReportSchema);

const SCROLL_ALLOWLIST = new Set([
  'tem-recon',
  'tem-vision',
  'tem-sonic',
  'consciousness-template',
]);

export async function executePlan(plan: PlannerPlan, cfg: ExecutionConfig) {
  const start = Date.now();
  const results: ExecutionResult[] = [];
  const bag: Record<string, unknown> = {};
  const allowedTools = new Set<PlanStep['tool']>([
    'codex.search',
    'codex.get',
    'forge.run',
    'ledger.append',
  ]);

  for (const [index, step] of plan.steps.entries()) {
    if (index >= cfg.budget.steps) break;
    const elapsedSeconds = (Date.now() - start) / 1000;
    if (elapsedSeconds >= cfg.budget.seconds) break;

    if (!allowedTools.has(step.tool)) {
      throw new Error(`Tool not allowed: ${step.tool}`);
    }

    if (step.if) {
      const snapshot = JSON.stringify(results);
      if (!snapshot.includes(step.if)) {
        results.push({ id: step.id, skipped: true, reason: 'condition false' });
        continue;
      }
    }

    let outcome: unknown;

    if (step.tool === 'codex.search') {
      const query = String(step.input?.query ?? '');
      const k = Number(step.input?.k ?? 8);
      outcome = await searchCodex(query, k);
    } else if (step.tool === 'codex.get') {
      const docId = String(step.input?.id ?? '');
      outcome = await getDoc(docId);
    } else if (step.tool === 'forge.run') {
      const scroll = String(step.input?.scroll ?? '');
      if (!scroll) throw new Error(`forge.run requires scroll (step ${step.id})`);
      if (!SCROLL_ALLOWLIST.has(scroll)) throw new Error(`scroll not allowed: ${scroll}`);
      const profile = String(step.input?.profile ?? '@blue');
      const args = {
        ...(step.input?.args || {}),
      } as Record<string, unknown> & { run_level?: string };
      args.run_level ??= cfg.runLevel;
      outcome = await runForge(scroll, profile, args);
    } else if (step.tool === 'ledger.append') {
      const payload = { ...(step.input ?? {}), run_level: cfg.runLevel } as Record<string, unknown>;
      await appendRealityEvent(process.cwd(), payload);
      outcome = { ok: true };
    }

    const record: ExecutionResult = { id: step.id, tool: step.tool, result: outcome };
    results.push(record);

    if (step.saveAs) {
      bag[step.saveAs] = outcome;
    }
  }

  const report = { goal: plan.goal, ok: true, results };
  if (!validateReport(report)) {
    const firstError = ajv.errorsText(validateReport.errors, { separator: '; ' });
    throw new Error(`Execution report failed schema validation: ${firstError}`);
  }

  return report;
}
