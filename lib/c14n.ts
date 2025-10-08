/**
 * Canonical JSON (c14n) utilities for deterministic hashing and receipts.
 * - Sorts object keys lexicographically (case-sensitive)
 * - Drops `undefined` (like JSON.stringify does)
 * - Normalizes numbers: -0 -> 0, NaN/Infinity -> null
 * - Preserves array order
 *
 * These helpers are dependency-free and safe for Node 22 (ESM).
 */

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

function normalizeNumber(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (Object.is(n, -0)) return 0;
  return n;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as any).constructor === Object
  );
}

/**
 * Recursively produce a canonicalized JSON structure with lexicographically
 * sorted object keys. The resulting value can be stable-stringified.
 */
export function canonicalize(value: unknown): Json {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string') return value as string;
  if (t === 'boolean') return value as boolean;
  if (t === 'number') return normalizeNumber(value as number) as any;

  if (Array.isArray(value)) {
    const res: Json[] = [];
    for (const v of value) {
      res.push(v === undefined ? null : (canonicalize(v) as Json));
    }
    return res;
  }

  if (isPlainObject(value)) {
    const out: Record<string, Json> = {};
    const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const k of keys) {
      const v = (value as Record<string, unknown>)[k];
      if (v === undefined) continue;
      out[k] = canonicalize(v);
    }
    return out;
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

/**
 * Canonical JSON string for stable hashing and receipts.
 */
export function canonicalizeToJSON(value: unknown): string {
  return JSON.stringify(canonicalize(value), null, 0);
}

/**
 * Deeply freeze a JSON-like object to ensure downstream code cannot mutate it
 * after it has been hashed and recorded.
 */
export function deepFreeze<T extends Json>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    if (Array.isArray(obj)) {
      for (const item of obj) deepFreeze(item as any);
    } else {
      for (const k of Object.keys(obj)) {
        // @ts-ignore
        deepFreeze(obj[k]);
      }
    }
  }
  return obj;
}

/**
 * Utility: strict type guard ensuring an arbitrary input is Json.
 * Useful to pin types at module edges.
 */
export function asJson(value: unknown): Json {
  return canonicalize(value);
}

/**
 * Small helper to produce a stable event envelope before hashing.
 * Ensures `payload` is canonical and the envelope is in a standard key order.
 */
export interface CanonicalEventEnvelope<T extends Json = Json> {
  id: string;
  ts: string;
  type: string;
  actor?: string;
  traceId?: string;
  payload: T;
  prev?: string;
  dayRoot?: string;
}

export function stableEventEnvelope<T extends Json>(e: CanonicalEventEnvelope<T>): CanonicalEventEnvelope<T> {
  const payload = deepFreeze(canonicalize(e.payload)) as T;
  const env: CanonicalEventEnvelope<T> = {
    id: e.id,
    ts: e.ts,
    type: e.type,
    actor: e.actor,
    traceId: e.traceId,
    payload,
    prev: e.prev,
    dayRoot: e.dayRoot,
  };
  return env;
}
