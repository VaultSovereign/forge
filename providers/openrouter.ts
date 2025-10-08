import type { Provider, ProviderCall } from '../dispatcher/types.js';
import { RetriableError } from '../dispatcher/types.js';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length ? value.trim() : undefined;
}

async function requestWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenRouterProvider implements Provider {
  public readonly name = 'openrouter';
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(opts: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = opts.apiKey ?? env('OPENROUTER_API_KEY');
    this.baseUrl = opts.baseUrl ?? env('OPENROUTER_BASE_URL') ?? DEFAULT_BASE_URL;
  }

  healthy(): boolean {
    return Boolean(this.apiKey);
  }

  async call(input: ProviderCall): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const timeout = input.timeoutMs ?? 60_000;
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
    };

    const referer = env('OPENROUTER_REFERRER');
    const title = env('OPENROUTER_APP_TITLE');
    if (referer) headers['HTTP-Referer'] = referer;
    if (title) headers['X-Title'] = title;

    const response = await requestWithTimeout(
      `${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          temperature: input.temperature ?? 0,
          max_tokens: input.maxTokens ?? 1_024,
        }),
      },
      timeout,
    );

    if (response.status === 429 || response.status >= 500) {
      throw new RetriableError(`openrouter_http_${response.status}`);
    }

    if (!response.ok) {
      const detail = await safeText(response);
      throw new Error(`openrouter_http_${response.status}: ${detail}`);
    }

    let json: OpenRouterResponse;
    try {
      json = (await response.json()) as OpenRouterResponse;
    } catch (error) {
      throw new Error(`openrouter_invalid_json: ${String(error)}`);
    }

    const choice = json.choices?.[0]?.message?.content;
    if (typeof choice !== 'string' || !choice.trim()) {
      throw new Error('openrouter_empty_response');
    }

    return choice;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch (error) {
    return `<<body read failed: ${String(error)}>>`;
  }
}
