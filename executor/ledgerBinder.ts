import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { TemplateExecutor, type ExecOptions, type ExecResult } from '../dispatcher/executeTemplate.js';
import {
  asJson,
  canonicalizeToJSON,
  stableEventEnvelope,
  type CanonicalEventEnvelope,
  type Json,
} from '../lib/c14n.js';
import { sha256 } from '../lib/hash.js';
import { getLogger } from '../lib/logger.js';

export interface BindOptions extends ExecOptions {
  /**
   * Directory for day-sharded JSONL files (defaults to ./ledger)
   */
  ledgerDir?: string;
  /**
   * Optional actor label for the envelope
   */
  actor?: string;
  /**
   * Trace identifier for cross-system correlation
   */
  traceId?: string;
  /**
   * Optional previous hash for same-day chain
   */
  prev?: string;
}

export interface BindResult {
  ok: boolean;
  exec: ExecResult;
  day: string;
  hash?: string;
  file?: string;
  error?: string;
}

const log = getLogger({ module: 'ledger-binder' });

function isoNow(): string {
  return new Date().toISOString();
}

function dayOf(ts: string): string {
  return ts.slice(0, 10);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function appendCanonical(
  ledgerDir: string,
  envelope: CanonicalEventEnvelope<Json>,
): Promise<{ file: string; hash: string; day: string }> {
  const json = canonicalizeToJSON(envelope);
  const hash = sha256(json);
  const day = dayOf(envelope.ts);
  const file = path.join(ledgerDir, `events-${day}.jsonl`);
  await ensureDir(ledgerDir);
  const entry = { ...envelope, hash };
  await fs.appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8');
  return { file, hash, day };
}

/**
 * Execute a template and atomically bind the result into the Reality Ledger.
 */
export async function executeAndBind(opts: BindOptions): Promise<BindResult> {
  const executor = new TemplateExecutor();
  const ts = isoNow();
  const traceId = opts.traceId ?? crypto.randomUUID();
  const actor = opts.actor ?? 'forge';
  const ledgerDir = opts.ledgerDir ?? path.resolve('ledger');

  const result = await executor.exec({
    keyword: opts.keyword,
    args: opts.args,
    model: opts.model,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });

  const payload = asJson({
    ok: result.ok,
    templateId: result.templateId ?? opts.keyword,
    output: result.output ?? null,
    meta: result.meta ?? {},
    error: result.error ?? null,
    args: opts.args ?? {},
    model: opts.model ?? null,
  });

  const envelope = stableEventEnvelope({
    id: crypto.randomUUID(),
    ts,
    type: 'forge.execution',
    actor,
    traceId,
    payload,
    prev: opts.prev,
  });

  try {
    const { file, hash, day } = await appendCanonical(ledgerDir, envelope);
    log.info({ type: envelope.type, id: envelope.id, day, file, hash }, 'ledger append');
    return { ok: true, exec: result, day, hash, file };
  } catch (error) {
    const err = String(error);
    log.error({ err }, 'ledger append failed');
    return { ok: false, exec: result, day: dayOf(ts), error: err };
  }
}
