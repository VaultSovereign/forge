import type { Provider, ProviderCall } from '../dispatcher/types.js';
import { RetriableError } from '../dispatcher/types.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

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

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAIProvider implements Provider {
  public readonly name = 'openai';
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(opts: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = opts.apiKey ?? env('OPENAI_API_KEY');
    this.baseUrl = opts.baseUrl ?? env('OPENAI_BASE_URL') ?? DEFAULT_BASE_URL;
  }

  healthy(): boolean {
    return Boolean(this.apiKey);
  }

  async call(input: ProviderCall): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const timeout = input.timeoutMs ?? 60_000;
    const response = await requestWithTimeout(
      `${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
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
      throw new RetriableError(`openai_http_${response.status}`);
    }

    if (!response.ok) {
      const detail = await safeText(response);
      throw new Error(`openai_http_${response.status}: ${detail}`);
    }

    let json: OpenAIChatResponse;
    try {
      json = (await response.json()) as OpenAIChatResponse;
    } catch (error) {
      throw new Error(`openai_invalid_json: ${String(error)}`);
    }

    const choice = json.choices?.[0]?.message?.content;
    if (typeof choice !== 'string' || !choice.trim()) {
      throw new Error('openai_empty_response');
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
