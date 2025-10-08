import { Provider, ProviderCall, Result, RetriableError, err, ok } from './types.js';
import { getLogger } from '../lib/logger.js';

interface ProviderSlot {
  provider: Provider;
  weight: number;
  circuitOpenUntil?: number;
  failures: number;
}

export class ProviderManager {
  private readonly log = getLogger({ module: 'provider-manager' });
  private readonly slots: ProviderSlot[] = [];
  constructor(private readonly opts: { baseTimeoutMs?: number } = {}) {}

  register(provider: Provider, weight = 1) {
    this.slots.push({ provider, weight, failures: 0 });
    this.slots.sort((a, b) => b.weight - a.weight);
  }

  private isHealthy(slot: ProviderSlot) {
    const now = Date.now();
    if (slot.circuitOpenUntil && now < slot.circuitOpenUntil) return false;
    return slot.provider.healthy?.() ?? true;
  }

  private backoffMs(failures: number) {
    const base = 300;
    const exp = Math.min(failures, 6);
    const jitter = Math.floor(Math.random() * 250);
    return base * Math.pow(2, exp) + jitter;
  }

  private openCircuit(slot: ProviderSlot) {
    const wait = this.backoffMs(++slot.failures);
    slot.circuitOpenUntil = Date.now() + wait;
    this.log.warn({ provider: slot.provider.name, wait }, 'Circuit open');
  }

  private closeCircuit(slot: ProviderSlot) {
    slot.circuitOpenUntil = undefined;
    slot.failures = 0;
  }

  async call(input: ProviderCall): Promise<Result<string>> {
    const tried: string[] = [];

    for (const slot of this.slots) {
      if (!this.isHealthy(slot)) {
        tried.push(`${slot.provider.name}(circuit-open)`);
        continue;
      }

      const timeoutMs = input.timeoutMs ?? this.opts.baseTimeoutMs ?? 60000;

      try {
        const text = await slot.provider.call({ ...input, timeoutMs });
        this.closeCircuit(slot);
        if (tried.length) {
          this.log.info({ chosen: slot.provider.name, tried }, 'Provider fallback succeeded');
        }
        return ok(text);
      } catch (error) {
        const reason = String(error);
        tried.push(`${slot.provider.name}(${reason})`);
        if (error instanceof RetriableError) {
          this.openCircuit(slot);
          continue;
        }
        this.log.error({ provider: slot.provider.name, err: reason }, 'Provider error (non-retriable)');
        return err(error as Error);
      }
    }

    return err(new Error(`All providers failed: ${tried.join(' -> ')}`));
  }
}
