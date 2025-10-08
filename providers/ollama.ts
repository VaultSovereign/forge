import type { Provider, ProviderCall } from '../dispatcher/types.js';
import { RetriableError } from '../dispatcher/types.js';

const DEFAULT_HOST = 'http://127.0.0.1:11434';

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

interface OllamaChoice {
  message?: { content?: string };
}

interface OllamaResponse {
  choices?: OllamaChoice[];
  message?: { content?: string };
  messages?: Array<{ content?: string }>;
}

export class OllamaProvider implements Provider {
  public readonly name = 'ollama';
  private readonly host: string;

  constructor(host?: string) {
    this.host = host ?? env('OLLAMA_HOST') ?? DEFAULT_HOST;
  }

  healthy(): boolean {
    return Boolean(this.host);
  }

  async call(input: ProviderCall): Promise<string> {
    const timeout = input.timeoutMs ?? 60_000;
    const response = await requestWithTimeout(
      `${this.host.replace(/\/$/, '')}/api/chat`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          stream: false,
          options: {
            temperature: input.temperature ?? 0,
            num_predict: input.maxTokens ?? 1_024,
          },
        }),
      },
      timeout,
    );

    if (response.status >= 500) {
      throw new RetriableError(`ollama_http_${response.status}`);
    }

    if (!response.ok) {
      const detail = await safeText(response);
      throw new Error(`ollama_http_${response.status}: ${detail}`);
    }

    let json: OllamaResponse;
    try {
      json = (await response.json()) as OllamaResponse;
    } catch (error) {
      throw new Error(`ollama_invalid_json: ${String(error)}`);
    }

    const direct = json.message?.content ?? json.choices?.[0]?.message?.content;
    if (typeof direct === 'string' && direct.trim()) {
      return direct;
    }

    const combined = (json.messages ?? [])
      .map((entry) => (typeof entry.content === 'string' ? entry.content : ''))
      .filter(Boolean)
      .join('\n');

    if (combined.trim()) {
      return combined;
    }

    throw new Error('ollama_empty_response');
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch (error) {
    return `<<body read failed: ${String(error)}>>`;
  }
}
