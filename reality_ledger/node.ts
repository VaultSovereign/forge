#!/usr/bin/env node
/**
 * Reality Ledger Node.js Integration
 * Content-addressed, verifiable event storage for VaultMesh template executions
 */

import {
  createHash,
  randomUUID,
  createPrivateKey,
  createPublicKey,
  sign as signDetached,
  verify as verifyDetached,
} from 'crypto';
import { promises as fs, constants as FS_CONSTANTS } from 'fs';
import * as path from 'path';
import stringify from 'safe-stable-stringify';

export interface LedgerEvent {
  id: string;
  ts: string;
  template: string;
  profile: string;
  input: unknown;
  output: unknown;
  hash: string;
  sig?: string;
  operator?: string;
  version?: string;
}

export interface EventInput {
  template: string;
  profile: string;
  args: unknown;
  result: unknown;
  operator?: string;
}

export interface LedgerQueryFilters {
  template?: string;
  profile?: string;
  since?: string;
  limit?: number;
}

const LEDGER_DIR = path.resolve(process.env.REALITY_LEDGER_DIR || './reality_ledger');
const LEDGER_VERSION = '1.0.0';
const SHARD_PREFIX = 'events-';
const SHARD_SUFFIX = '.jsonl';
const SIGNING_KEY = process.env.VAULTMESH_SIGNING_KEY;
const VERIFY_KEY = process.env.VAULTMESH_VERIFY_KEY;
const VERIFY_SOURCE = VERIFY_KEY || SIGNING_KEY;
const SENSITIVE_KEY_PATTERN = /(key|secret|token|password|api|auth)/i;

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function appendLineAtomic(filePath: string, line: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const handle = await fs.open(
    filePath,
    FS_CONSTANTS.O_CREAT | FS_CONSTANTS.O_WRONLY | FS_CONSTANTS.O_APPEND,
    0o600,
  );

  try {
    await handle.appendFile(line, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function shardPathFor(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return path.join(LEDGER_DIR, `${SHARD_PREFIX}${yyyy}-${mm}-${dd}${SHARD_SUFFIX}`);
}

function redactSensitive(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => redactSensitive(item));
  }

  const clone: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clone[key] = typeof val === 'string' && val.length ? '***REDACTED***' : null;
      continue;
    }
    clone[key] = redactSensitive(val);
  }
  return clone;
}

function canonicalEventPayload(
  template: string,
  profile: string,
  input: unknown,
  output: unknown,
): string {
  const normalized = stringify({ template, profile, input, output });
  return typeof normalized === 'string'
    ? normalized
    : JSON.stringify({ template, profile, input, output });
}

function generateEventHash(
  template: string,
  profile: string,
  input: unknown,
  output: unknown,
): { hash: string; normalized: string } {
  const normalized = canonicalEventPayload(template, profile, input, output);
  const hash = createHash('sha256').update(normalized).digest('hex');
  return { hash, normalized };
}

function signEvent(normalized: string): string | undefined {
  if (!SIGNING_KEY) {
    return undefined;
  }

  try {
    const key = createPrivateKey(SIGNING_KEY);
    const signature = signDetached(null, Buffer.from(normalized), key);
    return signature.toString('base64');
  } catch (error) {
    console.error(
      '[reality_ledger] signing failed:',
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

function verifySignature(normalized: string, signature?: string): boolean {
  if (!VERIFY_SOURCE || !signature) {
    return true;
  }

  try {
    const key = VERIFY_KEY
      ? createPublicKey(VERIFY_KEY)
      : createPublicKey(createPrivateKey(SIGNING_KEY!));
    return verifyDetached(null, Buffer.from(normalized), key, Buffer.from(signature, 'base64'));
  } catch (error) {
    console.error(
      '[reality_ledger] signature verification failed:',
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

function isShardFile(fileName: string): boolean {
  return fileName.startsWith(SHARD_PREFIX) && fileName.endsWith(SHARD_SUFFIX);
}

async function listShardFiles(): Promise<string[]> {
  try {
    await ensureDir(LEDGER_DIR);
    const entries = await fs.readdir(LEDGER_DIR);
    return entries.filter(isShardFile).sort().reverse();
  } catch (error) {
    console.error(
      '[reality_ledger] listShardFiles failed:',
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

async function readShard(fileName: string): Promise<LedgerEvent[]> {
  const filePath = path.join(LEDGER_DIR, fileName);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    const events: LedgerEvent[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as LedgerEvent;
        events.push(parsed);
      } catch (err) {
        console.warn('[reality_ledger] skipping malformed ledger line:', err);
      }
    }
    return events;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(
        '[reality_ledger] readShard failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
    return [];
  }
}

async function iterAllEvents(): Promise<LedgerEvent[]> {
  const shards = await listShardFiles();
  const events: LedgerEvent[] = [];

  for (const shard of shards.reverse()) {
    const shardEvents = await readShard(shard);
    events.push(...shardEvents);
  }

  return events;
}

export async function appendEvent(eventInput: EventInput): Promise<string> {
  const id = randomUUID();
  const timestamp = new Date();
  const ts = timestamp.toISOString();
  const safeArgs = redactSensitive(eventInput.args ?? {});
  const { hash, normalized } = generateEventHash(
    eventInput.template,
    eventInput.profile,
    safeArgs,
    eventInput.result,
  );
  const sig = signEvent(normalized);

  const event: LedgerEvent = {
    id,
    ts,
    template: eventInput.template,
    profile: eventInput.profile,
    input: safeArgs,
    output: eventInput.result,
    hash,
    sig,
    operator: eventInput.operator ?? 'unknown',
    version: LEDGER_VERSION,
  };

  const shardPath = shardPathFor(timestamp);
  await appendLineAtomic(shardPath, `${stringify(event)}\n`);

  return id;
}

export async function getEvent(eventId: string): Promise<LedgerEvent | null> {
  const shards = await listShardFiles();

  for (const shard of shards) {
    const events = await readShard(shard);
    for (const event of events) {
      if (event.id === eventId) {
        return event;
      }
    }
  }

  return null;
}

export async function verifyEvent(eventId: string): Promise<boolean> {
  const event = await getEvent(eventId);
  if (!event) {
    return false;
  }

  const { hash, normalized } = generateEventHash(
    event.template,
    event.profile,
    event.input,
    event.output,
  );
  if (hash !== event.hash) {
    return false;
  }

  return verifySignature(normalized, event.sig);
}

export async function queryLedger(filters: LedgerQueryFilters = {}): Promise<LedgerEvent[]> {
  const shards = await listShardFiles();
  const results: LedgerEvent[] = [];
  const limit = filters.limit ?? 25;
  const since = filters.since ? new Date(filters.since).toISOString() : undefined;

  for (const shard of shards) {
    const events = await readShard(shard);
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      if (filters.template && event.template !== filters.template) {
        continue;
      }
      if (filters.profile && event.profile !== filters.profile) {
        continue;
      }
      if (since && event.ts < since) {
        continue;
      }

      results.push(event);
      if (results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}

export async function getLedgerStats(): Promise<{
  totalEvents: number;
  templates: string[];
  profiles: string[];
  dateRange: { earliest: string; latest: string } | null;
}> {
  const events = await iterAllEvents();

  if (events.length === 0) {
    return {
      totalEvents: 0,
      templates: [],
      profiles: [],
      dateRange: null,
    };
  }

  const templates = Array.from(new Set(events.map((event) => event.template))).sort();
  const profiles = Array.from(new Set(events.map((event) => event.profile))).sort();
  const timestamps = events.map((event) => event.ts).sort();

  return {
    totalEvents: events.length,
    templates,
    profiles,
    dateRange: {
      earliest: timestamps[0],
      latest: timestamps[timestamps.length - 1],
    },
  };
}

export async function listShards(): Promise<string[]> {
  return listShardFiles();
}
