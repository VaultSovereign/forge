import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type Risk = {
  id: string;
  title: string;
  owner: string;
  likelihood: number;
  impact: number;
  controls: string[];
  next_action?: string;
  notes?: string;
};

type RiskReport = {
  generated_at: string;
  scope: string;
  summary: string;
  risks: Risk[];
};

const LEDGER_DIR = path.resolve(process.cwd(), 'reality_ledger');

function listShards(): string[] {
  try {
    const entries = fs.readdirSync(LEDGER_DIR);
    return entries
      .filter((f) => f.startsWith('events-') && f.endsWith('.jsonl'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function* iterShardLinesReverse(filePath: string, maxBytes = 512 * 1024): Generator<string> {
  try {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const len = Math.min(maxBytes, size);
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buf, 0, len, size - len);
      const lines = buf.toString('utf8').split(/\r?\n/).filter(Boolean).reverse();
      for (const line of lines) {
        yield line;
      }
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // ignore
  }
}

function parseLatestRiskRegister(): RiskReport | null {
  const shards = listShards();
  for (const shard of shards) {
    const p = path.join(LEDGER_DIR, shard);
    for (const line of iterShardLinesReverse(p)) {
      try {
        const evt = JSON.parse(line) as Record<string, unknown> | null;
        if (!evt || typeof evt !== 'object') continue;
        const keyword = (evt as { keyword?: unknown }).keyword;
        if (keyword !== 'operations-risk-register') continue;
        const artifact = (evt as { artifact?: unknown }).artifact as unknown;
        if (artifact && typeof artifact === 'object' && !Array.isArray(artifact)) {
          return artifact as RiskReport;
        }
        if (
          artifact &&
          typeof artifact === 'object' &&
          'raw' in (artifact as Record<string, unknown>) &&
          typeof (artifact as Record<string, unknown>).raw === 'string'
        ) {
          try {
            return JSON.parse((artifact as { raw: string }).raw) as RiskReport;
          } catch {
            // fallthrough
          }
        }
      } catch {
        // skip malformed line
      }
    }
  }
  return null;
}

function evaluatePolicyGate(report: RiskReport): {
  passed: boolean;
  violations: Array<{ id: string; title: string; reason: string }>;
} {
  const violations: Array<{ id: string; title: string; reason: string }> = [];
  for (const r of report.risks || []) {
    const sev = Number(r.likelihood || 0) * Number(r.impact || 0);
    const hasAction = typeof r.next_action === 'string' && r.next_action.trim().length > 0;
    if (sev >= 12 && !hasAction) {
      violations.push({ id: r.id, title: r.title, reason: 'High severity without next_action' });
    }
  }
  return { passed: violations.length === 0, violations };
}

export default async function riskPolicyRoutes(app: FastifyInstance) {
  app.get('/v1/risk/latest', async (_req, reply) => {
    const report = parseLatestRiskRegister();
    if (!report) return reply.code(404).send({ error: 'no_risk_report_found' });
    return { report };
  });

  app.post('/v1/risk/policy-gate', async (req, reply) => {
    const body = (req.body ?? {}) as { report?: RiskReport };
    const report = body.report ?? parseLatestRiskRegister();
    if (!report) return reply.code(404).send({ error: 'no_risk_report_found' });

    const gate = evaluatePolicyGate(report);
    const summary = {
      scope: report.scope,
      generated_at: report.generated_at,
      total: Array.isArray(report.risks) ? report.risks.length : 0,
    };
    return { gate, reportSummary: summary };
  });

  // Export Vault/Reality Ledger receipts for evidence packs.
  // Optional query params: from, to (ISO 8601)
  app.get('/v1/risk/receipts/export', async (req, reply) => {
    const query = (req.query ?? {}) as { from?: string; to?: string };
    const fromTs = query.from ? Date.parse(query.from) : Number.NEGATIVE_INFINITY;
    const toTs = query.to ? Date.parse(query.to) : Number.POSITIVE_INFINITY;

    const shards = listShards();
    const lines: string[] = [];
    for (const shard of shards) {
      const p = path.join(LEDGER_DIR, shard);
      for (const line of iterShardLinesReverse(p)) {
        try {
          const evt = JSON.parse(line) as { ts?: string; keyword?: string } | null;
          if (!evt) continue;
          const ts = evt.ts ? Date.parse(evt.ts) : NaN;
          if (!Number.isFinite(ts) || ts < fromTs || ts > toTs) continue;
          const kw = evt.keyword;
          if (kw === 'operations-risk-register' || kw === 'operations-risk-policy-gate') {
            lines.push(line);
          }
        } catch {
          // skip malformed line
        }
      }
    }

    const bundle = {
      generated_at: new Date().toISOString(),
      count: lines.length,
      lines: lines.reverse(), // chronological order
    };

    reply
      .header('content-type', 'application/json')
      .header('content-disposition', `attachment; filename="risk-receipts-${Date.now()}.json"`)
      .send(bundle);
  });

  // Recompute hash of a specific or latest risk event and compare if stored.
  app.post('/v1/risk/verify', async (req, reply) => {
    const body = (req.body ?? {}) as {
      kind?: 'register' | 'gate';
      event?: unknown;
      line?: string;
      stored_hash?: string;
    };
    const wantKeyword =
      body.kind === 'register'
        ? 'operations-risk-register'
        : body.kind === 'gate'
          ? 'operations-risk-policy-gate'
          : null;

    // Direct event/line override if provided
    if (body.event && typeof body.event === 'object') {
      const obj = body.event as any;
      const stored =
        body.stored_hash ??
        obj?.output_hash ??
        obj?.artifact_hash ??
        obj?.payload_hash ??
        obj?.hash ??
        null;
      const result = await computeVerification(obj, stored);
      return reply.send(result);
    }
    if (typeof body.line === 'string' && body.line.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(body.line) as any;
        const stored =
          body.stored_hash ??
          obj?.output_hash ??
          obj?.artifact_hash ??
          obj?.payload_hash ??
          obj?.hash ??
          null;
        const result = await computeVerification(obj, stored);
        return reply.send(result);
      } catch {
        // fall through to shard scan
      }
    }

    const shards = listShards();
    let found: { raw: string; obj: any } | null = null;

    for (const shard of shards) {
      const p = path.join(LEDGER_DIR, shard);
      for (const line of iterShardLinesReverse(p)) {
        try {
          const evt = JSON.parse(line);
          if (
            evt &&
            typeof evt === 'object' &&
            (evt.keyword === 'operations-risk-register' ||
              evt.keyword === 'operations-risk-policy-gate')
          ) {
            if (!wantKeyword || evt.keyword === wantKeyword) {
              found = { raw: line, obj: evt };
              break;
            }
          }
        } catch {
          /* ignore */
        }
      }
      if (found) break;
    }

    if (!found) {
      return reply.code(404).send({ error: 'no_event_found' });
    }

    async function hashString(s: string) {
      try {
        // Optional dependency; prefer when available
        const mod: any = await import('blake3');
        const out = mod.hash(s);
        return Buffer.from(out).toString('hex');
      } catch {
        const crypto = await import('node:crypto');
        return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
      }
    }

    function stableStringify(o: any): string {
      const seen = new WeakSet();
      const order = (v: any): any => {
        if (v && typeof v === 'object') {
          if (seen.has(v)) return null;
          seen.add(v);
          if (Array.isArray(v)) return v.map(order);
          return Object.keys(v)
            .sort()
            .reduce(
              (acc, k) => {
                (acc as any)[k] = order((v as any)[k]);
                return acc;
              },
              {} as Record<string, unknown>
            );
        }
        return v;
      };
      return JSON.stringify(order(o));
    }

    async function computeVerification(target: any, storedOverride?: string | null) {
      const objHash = await hashString(stableStringify(target));
      let artifactHash: string | null = null;
      const payload = target?.artifact !== undefined ? target.artifact : target?.output;
      if (payload !== undefined) {
        try {
          const obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
          artifactHash = await hashString(stableStringify(obj));
        } catch {
          artifactHash = await hashString(String(payload));
        }
      }
      const stored =
        storedOverride ??
        target?.output_hash ??
        target?.artifact_hash ??
        target?.payload_hash ??
        target?.hash ??
        null;
      const matchesStored =
        stored && (stored === objHash || stored === artifactHash) ? true : false;
      const algo = await (async () => {
        try {
          await import('blake3');
          return 'blake3' as const;
        } catch {
          return 'sha256' as const;
        }
      })();
      return {
        keyword: target.keyword ?? target.template ?? null,
        ts: target.ts ?? null,
        stored_hash: stored,
        recompute: { event_obj_hash: objHash, artifact_hash: artifactHash, algorithm: algo },
        matches_stored: stored ? matchesStored : null,
      };
    }

    const result = await computeVerification(found.obj, null);
    return reply.send(result);
  });

  // List recent risk events (register + gate) with raw JSONL.
  // Query: ?limit=100 (default 50)
  // List recent risk events (register + gate) with raw JSONL and cursor pagination.
  // Query:
  //   limit=number (1..200, default 50)
  //   keyword=register|gate|all (default all)
  //   since_ts=ISO (inclusive lower bound)
  //   before_ts=ISO (exclusive upper bound)  ← page backward in time
  //   cursor=shard:pos                        ← opaque; resumes scan exactly
  //
  // Response:
  //   { items: [...], count, next_cursor?, prev_cursor?, window: { from_ts, to_ts } }
  app.get('/v1/risk/list', async (req, reply) => {
    const q = (req.query ?? {}) as {
      limit?: string;
      keyword?: string;
      since_ts?: string;
      before_ts?: string;
      cursor?: string;
    };

    let limit = Number.parseInt(q.limit ?? '50', 10);
    if (!Number.isFinite(limit)) limit = 50;
    limit = Math.max(1, Math.min(200, limit));

    const wantKeyword =
      q.keyword === 'register'
        ? 'operations-risk-register'
        : q.keyword === 'gate'
          ? 'operations-risk-policy-gate'
          : null;

    const sinceTs = q.since_ts ? Date.parse(q.since_ts) : Number.NEGATIVE_INFINITY;
    const beforeTs = q.before_ts ? Date.parse(q.before_ts) : Number.POSITIVE_INFINITY;

    // Cursor format: "<shardName>:<lineIndexFromEnd>"
    let startShard: string | null = null;
    let startIdxFromEnd = 0;
    if (q.cursor) {
      const m = String(q.cursor).match(/^(.+):(\d+)$/);
      if (m) {
        startShard = m[1];
        startIdxFromEnd = Number(m[2]);
      }
    }

    const shards = listShards(); // newest first
    let shardStartIndex = 0;
    if (startShard) {
      shardStartIndex = Math.max(0, shards.indexOf(startShard));
    }

    const items: Array<{
      ts: string | null;
      keyword: string | null;
      stored_hash: string | null;
      algorithm: 'blake3' | 'sha256' | null;
      event: any;
      raw_line: string;
      _cursor: string;
    }> = [];

    let nextCursor: string | undefined;
    let prevCursor: string | undefined;
    let windowFrom: number | undefined;
    let windowTo: number | undefined;

    outer: for (let si = shardStartIndex; si < shards.length; si++) {
      const shard = shards[si];
      const p = path.join(LEDGER_DIR, shard);
      const lines = Array.from(iterShardLinesReverse(p));
      for (
        let li = startShard && si === shardStartIndex ? startIdxFromEnd : 0;
        li < lines.length;
        li++
      ) {
        const line = lines[li];
        try {
          const obj = JSON.parse(line);
          if (
            !obj ||
            typeof obj !== 'object' ||
            !('keyword' in obj) ||
            (obj.keyword !== 'operations-risk-register' &&
              obj.keyword !== 'operations-risk-policy-gate')
          )
            continue;
          if (wantKeyword && obj.keyword !== wantKeyword) continue;

          const ts = obj.ts ? Date.parse(obj.ts) : NaN;
          if (!Number.isFinite(ts)) continue;
          if (ts < sinceTs || ts >= beforeTs) continue;

          windowFrom = windowFrom === undefined ? ts : Math.min(windowFrom, ts);
          windowTo = windowTo === undefined ? ts : Math.max(windowTo, ts);

          const stored =
            obj.output_hash ?? obj.artifact_hash ?? obj.payload_hash ?? obj.hash ?? null;

          items.push({
            ts: obj.ts ?? null,
            keyword: obj.keyword ?? null,
            stored_hash: stored,
            algorithm: null,
            event: obj,
            raw_line: line,
            _cursor: `${shard}:${li}`,
          });

          if (items.length >= limit) {
            nextCursor = `${shard}:${li + 1}`;
            break outer;
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (items.length > 0) {
      const first = items[0];
      const [fShard, fIdxStr] = first._cursor.split(':');
      const fIdx = Number(fIdxStr);
      if (fIdx > 0) {
        prevCursor = `${fShard}:${Math.max(0, fIdx - 1)}`;
      } else {
        const fShardIdx = shards.indexOf(fShard);
        if (fShardIdx > 0) {
          prevCursor = `${shards[fShardIdx - 1]}:0`;
        }
      }
    }

    const cleaned = items.map(({ _cursor, ...rest }) => rest);

    reply.header('cache-control', 'public, max-age=10, stale-while-revalidate=20');
    const etagBase = JSON.stringify({
      head: cleaned.slice(0, 5),
      count: cleaned.length,
      nextCursor,
      prevCursor,
      sinceTs,
      beforeTs,
      wantKeyword,
    });
    const etag = crypto.createHash('sha1').update(etagBase).digest('hex');
    if (req.headers['if-none-match'] === etag) return reply.code(304).send();
    reply.header('etag', etag);

    return reply.send({
      items: cleaned,
      count: cleaned.length,
      next_cursor: nextCursor,
      prev_cursor: prevCursor,
      window: {
        from_ts: windowFrom ? new Date(windowFrom).toISOString() : null,
        to_ts: windowTo ? new Date(windowTo).toISOString() : null,
      },
    });
  });
}
