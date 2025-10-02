import Ajv from 'ajv';
import { createProviderConfig } from '../dispatcher/modelProvider.js';
import { PlanSchema } from './schemas.js';

type Constraints = Record<string, unknown>;

type PlannerPlan = {
  goal: string;
  steps: Array<{
    id: string;
    tool: 'codex.search' | 'codex.get' | 'forge.run' | 'ledger.append';
    input: Record<string, unknown>;
    if?: string;
    saveAs?: string;
  }>;
};

const ajv = new Ajv({ allErrors: true });
const validatePlan = ajv.compile(PlanSchema);

export async function planTask(goal: string, constraints: Constraints = {}): Promise<PlannerPlan> {
  if (!goal.trim()) {
    throw new Error('Planner goal is required');
  }

  const provider = createProviderConfig();
  const systemPrompt =
    `You are a planner for a sovereign personal agent.\n` +
    `Return ONLY strict JSON matching {"goal": string, "steps": [{"id": string, "tool": string, "input": object, "if"?: string, "saveAs"?: string}]}.\n` +
    `Allowed tools: codex.search, codex.get, forge.run, ledger.append.\n` +
    `Keep plans compact (≤ 6 steps) and default to read-only actions.`;
  const userPrompt = `Goal: ${goal}\nConstraints: ${JSON.stringify(constraints)}`;

  const raw = await provider.chat(provider.model, systemPrompt, userPrompt);

  let plan: unknown;
  try {
    plan = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Planner returned non-JSON response: ${(error as Error).message}`);
  }

  if (!validatePlan(plan)) {
    const firstError = ajv.errorsText(validatePlan.errors, { separator: '; ' });
    throw new Error(`Planner response failed schema validation: ${firstError}`);
  }

  return plan as PlannerPlan;
}
