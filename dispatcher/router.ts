#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import YAML from 'yaml';
import minimist from 'minimist';
import crypto from 'node:crypto';
import { expand } from './expander.js';
import { safetyPreflight } from './safety.js';
import { ensureConforms } from './ensureConforms.js';
import { createProviderConfig } from './modelProvider.js';
import { appendRealityEvent } from './realityLedger.js';
import type { Template, Profile, RunArgs } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const providerConfig = createProviderConfig();
const defaultModelName = providerConfig.model;
const providerName = providerConfig.provider;

const ledgerEligibleKeywords = new Set(['tem-vision', 'tem-sonic', 'consciousness-template']);

const SENSITIVE_KEY_PATTERN = /(key|secret|token|password)/i;

function redactSensitiveArgs<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveArgs(item)) as unknown as T;
  }

  const clone: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clone[key] = typeof val === 'string' && val.length ? '***REDACTED***' : null;
      continue;
    }
    clone[key] = redactSensitiveArgs(val);
  }

  return clone as T;
}

function hash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function loadYAML(p: string) {
  const txt = await fs.readFile(p, 'utf8');
  return YAML.parse(txt);
}

export interface TemplateListing {
  id: string;
  keyword: string;
  title?: string;
  path: string;
}

async function findTemplate(
  projectRoot: string,
  keyword: string,
): Promise<{ tpl: Template; path: string }> {
  const family = keyword.split('-')[0];
  const familyDir = path.join(projectRoot, 'catalog', family);
  const files = await fs.readdir(familyDir);
  for (const f of files) {
    if (!f.endsWith('.yaml')) continue;
    const full = path.join(familyDir, f);
    const y = await loadYAML(full);
    if (y.keyword === keyword) return { tpl: y, path: full };
  }
  throw new Error(`Template for keyword '${keyword}' not found in ${familyDir}`);
}

async function listTemplatesInternal(projectRoot: string): Promise<TemplateListing[]> {
  const catalogDir = path.join(projectRoot, 'catalog');
  const entries: TemplateListing[] = [];
  const families = await fs.readdir(catalogDir, { withFileTypes: true }).catch(() => []);
  for (const family of families) {
    if (!family.isDirectory()) continue;
    const familyDir = path.join(catalogDir, family.name);
    const files = await fs.readdir(familyDir);
    for (const file of files) {
      if (!file.endsWith('.yaml')) continue;
      const absolute = path.join(familyDir, file);
      try {
        const tpl = (await loadYAML(absolute)) as Template & { id?: string };
        if (!tpl || !tpl.keyword) continue;
        entries.push({
          id: (tpl as any).id || tpl.keyword,
          keyword: tpl.keyword,
          title: tpl.title,
          path: absolute,
        });
      } catch (err) {
        console.error(
          '[dispatcher] Failed to load template',
          absolute,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  return entries;
}

async function loadProfile(projectRoot: string, name?: string): Promise<Profile> {
  const n = name || 'vault';
  const p = path.join(projectRoot, 'profiles', `${n}.yaml`);
  try {
    const y = await loadYAML(p);
    return y as Profile;
  } catch (_e) {
    throw new Error(`Profile '${n}' not found at ${p}`);
  }
}

function normalizeArgs(rawFlags: any, tpl: Template, profile: Profile, notes: string): RunArgs {
  const args: RunArgs = {};
  // defaults from template
  for (const [k, spec] of Object.entries(tpl.inputs || {})) {
    if (spec && typeof spec === 'object' && 'default' in spec) {
      // @ts-ignore
      args[k] = spec.default;
    }
  }
  // profile defaults override
  for (const [k, v] of Object.entries(profile.defaults || {})) {
    // @ts-ignore
    args[k] = v;
  }
  // flags override
  for (const [k, v] of Object.entries(rawFlags || {})) {
    // minimist uses camelCase for long flags sometimes; accept as-is
    if (k === 'format') args['output_format'] = v as any;
    else args[k] = v;
  }
  if (notes && notes.length) args['brief'] = args['brief'] || notes;

  // validate enums + required
  for (const [k, spec] of Object.entries(tpl.inputs || {})) {
    const val = (args as any)[k];
    if (spec.required && (val === undefined || val === null || val === '')) {
      throw new Error(`Missing required input: ${k}`);
    }
    if (spec.type === 'enum' && spec.values && val != null) {
      if (!spec.values.map(String).includes(String(val))) {
        throw new Error(`Invalid value '${val}' for '${k}'. Allowed: ${spec.values.join(', ')}`);
      }
    }
  }

  return args;
}

function enrichContext(tpl: Template, args: RunArgs, profile: Profile) {
  const ctx = {
    ...args,
    purpose: tpl.purpose,
    quality_checklist: tpl.quality_checklist || [],
    profile: profile,
  };
  return ctx;
}

async function expandPrompt(tpl: Template, args: RunArgs, ctx: any) {
  let sys = expand(tpl.prompt.system, ctx);
  let usr = expand(tpl.prompt.user, ctx);

  // Auto-enrichment hooks
  const wantsJSON = (args.output_format || '').toLowerCase() === 'json';
  if (wantsJSON && !usr.toLowerCase().includes('strict json')) {
    usr += `

Respond in strict JSON conforming to ${tpl.outputs.schema_ref}.
No additional commentary.`;
  }

  // Exec profile prelude
  if (ctx.profile && ctx.profile.voice && ctx.profile.voice.toLowerCase().includes('executive')) {
    usr =
      `Provide a concise executive summary first (<= 8 lines), followed by full details.\n\n` + usr;
  }

  return { system: sys, user: usr };
}

async function callLLM(system: string, user: string, modelOverride: string): Promise<string> {
  return providerConfig.chat(modelOverride, system, user);
}

async function loadSchema(projectRoot: string, ref: string): Promise<any> {
  // ref example: "../schemas/output.schema.json#/definitions/tem/recon"
  const [rel, pointer] = ref.split('#');
  const p = path.resolve(projectRoot, 'schemas', path.basename(rel || 'output.schema.json'));
  const json = JSON.parse(await fs.readFile(p, 'utf8'));
  if (!pointer) return json;
  const parts = pointer.replace(/^\//, '').split('/');
  let node: any = json;
  for (const seg of parts) {
    if (!(seg in node)) throw new Error(`Schema pointer not found: ${pointer}`);
    node = node[seg];
  }
  return node;
}

async function writeAudit(projectRoot: string, rec: any) {
  const logDir = path.join(projectRoot, 'logs');
  await fs.mkdir(logDir, { recursive: true });
  const line = JSON.stringify(rec);
  await fs.appendFile(path.join(logDir, 'audit.jsonl'), line + '\n', 'utf8');
}

export async function runKeyword(opts: {
  projectRoot: string;
  keyword: string;
  profileName?: string | null;
  flags?: any;
  notes?: string;
}) {
  const { projectRoot, keyword, profileName, flags = {}, notes = '' } = opts;
  const { tpl } = await findTemplate(projectRoot, keyword);
  const profile = await loadProfile(projectRoot, profileName || undefined);
  const args = normalizeArgs(flags, tpl, profile, notes);
  const ctx = enrichContext(tpl, args, profile);

  const pre = safetyPreflight(tpl, args);

  const prompt = await expandPrompt(tpl, args, ctx);
  const checksum = hash(JSON.stringify(prompt));

  const requestedModel =
    typeof args.model === 'string' && args.model.trim() ? args.model.trim() : defaultModelName;
  const llmRaw = await callLLM(prompt.system, prompt.user, requestedModel);

  let output: any = llmRaw;
  let ok = true;

  // Validate if JSON requested
  if ((args.output_format || '').toLowerCase() === 'json') {
    const schema = await loadSchema(projectRoot, tpl.outputs.schema_ref);
    const res = await ensureConforms(llmRaw, schema);
    if (!res.ok) {
      // Attempt a single auto-repair
      const repair = await callLLM(
        `You are a strict JSON repairer. You ONLY output valid JSON that conforms to a provided JSON Schema. Never include commentary.`,
        `JSON Schema (as JSON):\n\n${JSON.stringify(schema)}\n\n---\nOriginal model output:\n${llmRaw}\n\nReturn ONLY repaired JSON that conforms.`,
        requestedModel,
      );
      const res2 = await ensureConforms(repair, schema);
      if (!res2.ok) {
        ok = false;
        output = {
          error: 'Schema validation failed after repair',
          first_errors: res.errors,
          repair_attempt: repair,
        };
      } else {
        output = res2.value;
      }
    } else {
      output = res.value;
    }
  }

  const record = {
    ts: new Date().toISOString(),
    operator: 'local',
    keyword: tpl.keyword,
    version: tpl.version,
    inputs_hash: hash(JSON.stringify(args)),
    prompt_hash: checksum,
    profile: profileName || 'vault',
    safety_level: pre.level,
    provider: providerName,
    model: requestedModel,
    output_hash: hash(typeof output === 'string' ? output : JSON.stringify(output)),
  };
  await writeAudit(projectRoot, record);

  if (ledgerEligibleKeywords.has(tpl.keyword)) {
    try {
      const eventId = `${record.inputs_hash}:${record.output_hash}`;
      await appendRealityEvent(projectRoot, {
        event_id: eventId,
        ts: record.ts,
        keyword: tpl.keyword,
        profile: profileName || 'vault',
        provider: providerName,
        model: requestedModel,
        run_level: pre.level,
        input_hash: record.inputs_hash,
        output_hash: record.output_hash,
        args: redactSensitiveArgs(args),
        artifact: typeof output === 'string' ? { raw: output } : output,
      });
    } catch (err) {
      console.error(
        '[forge] reality ledger append failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Footer (for markdown)
  if ((args.output_format || '').toLowerCase() === 'markdown' && profile.defaults?.footer) {
    if (typeof output === 'string') {
      output += `\n\n${profile.defaults.footer}`;
    }
  }

  if (!ok) {
    throw new Error(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
  }
  return output;
}

export async function listTemplates(projectRoot: string): Promise<TemplateListing[]> {
  return listTemplatesInternal(projectRoot);
}
