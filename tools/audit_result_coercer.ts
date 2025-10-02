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

function toEvidenceItem(value: any): Evidence {
  if (value && typeof value === 'object') {
    const file = typeof value.file === 'string' ? value.file : '';
    const lines =
      typeof value.lines === 'string'
        ? value.lines
        : typeof value.lines === 'number'
          ? String(value.lines)
          : '';
    const hash = typeof value.hash === 'string' ? value.hash : null;
    return { file, lines, hash };
  }
  if (typeof value === 'string') {
    return { file: value, lines: '', hash: null };
  }
  return { file: '', lines: '', hash: null };
}

export function coerce(result: any) {
  const iso = new Date().toISOString();

  if (!result || typeof result !== 'object') {
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
  if (!result.meta || typeof result.meta !== 'object') result.meta = {};

  result.modules = result.modules.map((module: any) => {
    const mod = module && typeof module === 'object' ? module : {};
    if (!Array.isArray(mod.dependencies)) mod.dependencies = [];
    if (!Array.isArray(mod.strengths)) mod.strengths = [];
    if (!Array.isArray(mod.weaknesses)) mod.weaknesses = [];
    if (!Array.isArray(mod.integration_points)) mod.integration_points = [];

    const tests = mod.tests && typeof mod.tests === 'object' ? mod.tests : {};
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
  result.top_risks = result.top_risks.map(
    (risk: any): Risk => ({
      title: typeof risk?.title === 'string' ? risk.title : '',
      severity: severities.has(risk?.severity) ? risk.severity : 'P3',
      why: typeof risk?.why === 'string' ? risk.why : '',
      where: typeof risk?.where === 'string' ? risk.where : '',
      fix: typeof risk?.fix === 'string' ? risk.fix : '',
    }),
  );

  const efforts = new Set(['S', 'M', 'L']);
  result.top_opportunities = result.top_opportunities.map(
    (opp: any): Opportunity => ({
      title: typeof opp?.title === 'string' ? opp.title : '',
      value: typeof opp?.value === 'string' ? opp.value : '',
      effort: efforts.has(opp?.effort) ? opp.effort : 'S',
      steps: Array.isArray(opp?.steps) ? opp.steps.filter((s: any) => typeof s === 'string') : [],
    }),
  );

  if (!['production-ready', 'pilot-ready', 'research-only'].includes(result.verdict)) {
    result.verdict = 'pilot-ready';
  }

  if (typeof result.meta.auditor !== 'string' || !result.meta.auditor.trim()) {
    result.meta.auditor = 'VaultMesh Auditor';
  }
  if (typeof result.meta.timestamp !== 'string' || !result.meta.timestamp.trim()) {
    result.meta.timestamp = iso;
  }

  return result;
}
