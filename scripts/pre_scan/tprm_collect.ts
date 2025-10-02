#!/usr/bin/env ts-node

/**
 * VaultMesh — TPRM Prescan Collector
 * Expand evidence_paths globs + questionnaires into a JSON bundle
 * to pass into the dora.tprm.v1 template.
 */

import fs from 'fs';
import path from 'path';

// @ts-ignore - fast-glob doesn't have separate types package
import fg from 'fast-glob';
import YAML from 'yaml';

interface Args {
  vendor_name: string;
  criticality: string;
  business_services?: string[];
  data_categories?: string[];
  regions?: string[];
  evidence_paths?: string[];
  questionnaires?: string[];
  notes?: string;
}

// Tiny arg parser (expect JSON file or stdin)
const argFile = process.argv[2];
if (!argFile) {
  console.error('Usage: tprm_collect.ts <args.json>');
  process.exit(1);
}
const raw = fs.readFileSync(argFile, 'utf8');
const args: Args = JSON.parse(raw);

// Expand evidence globs
function collectEvidence(patterns: string[]): Record<string, string> {
  const results: Record<string, string> = {};
  for (const pat of patterns) {
    const files = fg.sync(pat, { dot: true });
    for (const f of files) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        // Keep only the first ~20 lines for context
        const excerpt = content.split(/\r?\n/).slice(0, 20).join('\n');
        results[f] = excerpt;
      } catch (e) {
        results[f] = `ERROR reading: ${(e as Error).message}`;
      }
    }
  }
  return results;
}

// Load questionnaires (JSON or YAML)
function collectQuestionnaires(files: string[]): Record<string, any> {
  const results: Record<string, any> = {};
  for (const f of files) {
    try {
      const text = fs.readFileSync(f, 'utf8');
      if (f.endsWith('.json')) {
        results[f] = JSON.parse(text);
      } else if (f.endsWith('.yaml') || f.endsWith('.yml')) {
        results[f] = YAML.parse(text);
      } else {
        results[f] = text;
      }
    } catch (e) {
      results[f] = { error: (e as Error).message };
    }
  }
  return results;
}

const evidence = collectEvidence(args.evidence_paths ?? []);
const questionnaires = collectQuestionnaires(args.questionnaires ?? []);

const bundle = {
  vendor_name: args.vendor_name,
  criticality: args.criticality,
  business_services: args.business_services ?? [],
  data_categories: args.data_categories ?? [],
  regions: args.regions ?? [],
  notes: args.notes ?? '',
  evidence,
  questionnaires,
  collected_at: new Date().toISOString(),
};

console.log(JSON.stringify(bundle, null, 2));
