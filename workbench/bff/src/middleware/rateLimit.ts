import type { FastifyReply, FastifyRequest } from 'fastify';

interface Bucket {
  tokens: number;
  updated: number;
}

function now() {
  return Date.now();
}

function normalizeIp(ip: unknown) {
  return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
}

/**
 * Tiny in-memory token bucket per IP.
 * Env:
 *  FORGE_RATE_CAP  - refill per minute (default 60)
 *  FORGE_RATE_BURST - initial burst (default 30)
 */
export function rateLimit() {
  const cap = Number(process.env.FORGE_RATE_CAP ?? 60);
  const burst = Number(process.env.FORGE_RATE_BURST ?? 30);
  const buckets = new Map<string, Bucket>();

  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    const ip = normalizeIp(request.ip);
    const bucket = buckets.get(ip) ?? { tokens: burst, updated: now() };
    buckets.set(ip, bucket);

    const current = now();
    const elapsedMinutes = (current - bucket.updated) / 60000;
    bucket.updated = current;
    bucket.tokens = Math.min(cap, bucket.tokens + elapsedMinutes * cap);

    if (bucket.tokens < 1) {
      reply.code(429).send({ ok: false, error: 'rate_limited' });
      return;
    }

    bucket.tokens -= 1;
  };
}
