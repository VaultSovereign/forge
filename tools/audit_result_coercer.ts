export type Risk = {
  title: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  why: string;
  where: string;
  fix: string;
};
export type Opportunity = {
  title: string;
  value: string;
  effort: 'S' | 'M' | 'L';
  steps: string[];
};
export type Evidence = { file: string; lines?: string; hash?: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toEvidenceItem(value: unknown): Evidence {
  if (isRecord(value)) {
    const file = typeof value.file === 'string' ? value.file : '';
    const linesValue = value.lines;
    const lines =
      typeof linesValue === 'string'
        ? linesValue
        : typeof linesValue === 'number'
          ? String(linesValue)
          : '';
    const hash = typeof value.hash === 'string' ? value.hash : null;
    return { file, lines, hash };
  }
  if (typeof value === 'string') {
    return { file: value, lines: '', hash: null };
  }
  return { file: '', lines: '', hash: null };
}

export function coerce(result: unknown) {
  const iso = new Date().toISOString();

  if (!isRecord(result)) {
    return {
      map: [],
      modules: [],
      top_risks: [],
      top_opportunities: [],
      verdict: 'pilot-ready',
      meta: { auditor: 'VaultMesh Auditor', timestamp: iso },
    };
  }

  if (!Array.isArray(result.map)) result.map = [];
  if (!Array.isArray(result.modules)) result.modules = [];
  if (!Array.isArray(result.top_risks)) result.top_risks = [];
  if (!Array.isArray(result.top_opportunities)) result.top_opportunities = [];
  if (!isRecord(result.meta)) result.meta = {};

  result.modules = (result.modules as unknown[]).map((module) => {
    const mod: Record<string, unknown> = isRecord(module) ? { ...module } : {};
    if (!Array.isArray(mod.dependencies)) mod.dependencies = [];
    if (!Array.isArray(mod.strengths)) mod.strengths = [];
    if (!Array.isArray(mod.weaknesses)) mod.weaknesses = [];
    if (!Array.isArray(mod.integration_points)) mod.integration_points = [];

    const tests = isRecord(mod.tests) ? mod.tests : {};
    mod.tests = {
      status: typeof tests.status === 'string' ? tests.status : 'unknown',
      coverage:
        typeof tests.coverage === 'string' || typeof tests.coverage === 'number'
          ? String(tests.coverage)
          : 'unknown',
    };

    if (!Array.isArray(mod.governance)) mod.governance = [];
    if (!Array.isArray(mod.evolution)) mod.evolution = [];

    const evidence = Array.isArray(mod.evidence) ? mod.evidence : [];
    mod.evidence = evidence.map(toEvidenceItem);

    return mod;
  });

  const severities = new Set(['P0', 'P1', 'P2', 'P3']);
  result.top_risks = (result.top_risks as unknown[]).map((risk): Risk => {
    const riskRecord = isRecord(risk) ? risk : {};
    const severity = severities.has(riskRecord.severity as string)
      ? (riskRecord.severity as Risk['severity'])
      : 'P3';
    return {
      title: typeof riskRecord.title === 'string' ? riskRecord.title : '',
      severity,
      why: typeof riskRecord.why === 'string' ? riskRecord.why : '',
      where: typeof riskRecord.where === 'string' ? riskRecord.where : '',
      fix: typeof riskRecord.fix === 'string' ? riskRecord.fix : '',
    };
  });

  const efforts = new Set(['S', 'M', 'L']);
  result.top_opportunities = (result.top_opportunities as unknown[]).map((opp): Opportunity => {
    const opportunity = isRecord(opp) ? opp : {};
    const effort = efforts.has(opportunity.effort as string)
      ? (opportunity.effort as Opportunity['effort'])
      : 'S';
    const rawSteps = Array.isArray(opportunity.steps) ? opportunity.steps : [];
    const steps = (rawSteps as unknown[]).filter(
      (step): step is string => typeof step === 'string'
    );
    return {
      title: typeof opportunity.title === 'string' ? opportunity.title : '',
      value: typeof opportunity.value === 'string' ? opportunity.value : '',
      effort,
      steps,
    };
  });

  const verdict = typeof result.verdict === 'string' ? result.verdict : '';
  if (!['production-ready', 'pilot-ready', 'research-only'].includes(verdict)) {
    result.verdict = 'pilot-ready';
  }

  const meta = result.meta as Record<string, unknown>;
  if (typeof meta.auditor !== 'string' || !meta.auditor.trim()) {
    meta.auditor = 'VaultMesh Auditor';
  }
  if (typeof meta.timestamp !== 'string' || !meta.timestamp.trim()) {
    meta.timestamp = iso;
  }
  result.meta = meta;

  return result;
}
