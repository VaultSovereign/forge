#!/usr/bin/env ts-node
/**
 * VaultMesh — ICT Risk Prescan Collector
 * Expands evidence patterns and aggregates simple metrics for scoring.
 *
 * Usage (stdin/out via VM env in the template):
 *   npx ts-node scripts/pre_scan/ict_risk_collect.ts <args.json>
 *
 * Behavior:
 * - Determines DORA applicability and microenterprise flag from org_type
 * - Expands file patterns for policies/assets/incidents/third_parties/tests
 * - Counts items; attempts to classify "major" incidents when JSON has { severity: "major" }
 */

import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

type Input = {
  org_name: string;
  org_type?: string;
  regions?: string[];
  assets?: string[];
  policies?: string[];
  incidents?: string[]; // file patterns
  third_parties?: string[];
  tests?: string[];
  notes?: string;
};

const argsPath = process.argv[2];
if (!argsPath) {
  console.error('Usage: ict_risk_collect.ts <args.json>');
  process.exit(1);
}
const input: Input = JSON.parse(fs.readFileSync(argsPath, 'utf8'));

function applicability(orgType?: string) {
  if (orgType === 'microenterprise') return { applicable: true, micro: true };
  if (!orgType || orgType === 'other') return { applicable: false, micro: false };
  return { applicable: true, micro: false };
}

function countFromPatterns(patterns?: string[]) {
  if (!patterns?.length) return 0;
  return fg.sync(patterns, { dot: true }).length;
}

function classifyIncidents(patterns?: string[]) {
  let incidents_count = 0;
  let major_incidents = 0;
  if (!patterns?.length) return { incidents_count, major_incidents };
  const files = fg.sync(patterns, { dot: true });
  for (const f of files) {
    incidents_count += 1;
    try {
      if (path.extname(f).toLowerCase() === '.json') {
        const raw = fs.readFileSync(f, 'utf8');
        const data = JSON.parse(raw);
        // Allow both single-object and array-of-objects incident files
        const entries = Array.isArray(data) ? data : [data];
        for (const e of entries) {
          if (e && typeof e === 'object' && String(e.severity || '').toLowerCase() === 'major') {
            major_incidents += 1;
          }
        }
      }
    } catch {
      // ignore malformed files
    }
  }
  return { incidents_count, major_incidents };
}

const { applicable, micro } = applicability(input.org_type);

const result: Record<string, unknown> = {
  dora_applicable: applicable,
  microenterprise: micro,
  collected_at: new Date().toISOString(),
};

if (applicable) {
  result.assets_count = countFromPatterns(input.assets);
  result.policies_count = countFromPatterns(input.policies);
  const i = classifyIncidents(input.incidents);
  result.incidents_count = i.incidents_count;
  result.major_incidents = i.major_incidents;
  result.third_parties_count = countFromPatterns(input.third_parties);
  result.tests_count = countFromPatterns(input.tests);
}

process.stdout.write(JSON.stringify(result, null, 2));
