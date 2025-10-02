import OpenAI from 'openai';

export type ProviderName = 'openai' | 'openrouter' | 'local_ollama';

export interface ProviderConfig {
  provider: ProviderName;
  model: string;
  chat: (model: string, system: string, user: string) => Promise<string>;
}

function envStr(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function createProviderConfig(): ProviderConfig {
  const ollamaHost = envStr('OLLAMA_HOST');
  if (ollamaHost) {
    const defaultModel = envStr('MODEL') || 'llama3.1:70b';
    if (typeof fetch !== 'function') {
      throw new Error(
        'Global fetch API is required for Ollama provider (Node 18+). Set OLLAMA_HOST or upgrade runtime.'
      );
    }

    return {
      provider: 'local_ollama',
      model: defaultModel,
      async chat(model, system, user) {
        const response = await fetch(`${ollamaHost.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || defaultModel,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            stream: false,
            options: { temperature: 0.2 },
          }),
        });
        if (!response.ok) {
          throw new Error(`Ollama chat failed with status ${response.status}`);
        }
        const payload = (await response.json()) as unknown;
        const message = extractOllamaContent(payload);
        return message ?? '';
      },
    };
  }

  const openrouterKey = envStr('OPENROUTER_API_KEY');
  if (openrouterKey) {
    const client = new OpenAI({
      apiKey: openrouterKey,
      baseURL: envStr('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': envStr('OPENROUTER_REFERRER') || 'https://vaultmesh.local',
        'X-Title': envStr('OPENROUTER_APP_TITLE') || 'Forge',
      },
    });
    const defaultModel = envStr('MODEL') || 'meta-llama/llama-3.1-70b-instruct';

    return {
      provider: 'openrouter',
      model: defaultModel,
      async chat(model, system, user) {
        const res = await client.chat.completions.create({
          model: model || defaultModel,
          temperature: 0.2,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        });
        return res.choices?.[0]?.message?.content ?? '';
      },
    };
  }

  const openaiKey = envStr('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error(
      'No provider configured. Set OLLAMA_HOST, OPENROUTER_API_KEY, or OPENAI_API_KEY.'
    );
  }
  const client = new OpenAI({ apiKey: openaiKey });
  const defaultModel = envStr('MODEL') || envStr('FORGE_MODEL') || 'gpt-4o-mini';

  return {
    provider: 'openai',
    model: defaultModel,
    async chat(model, system, user) {
      const res = await client.chat.completions.create({
        model: model || defaultModel,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return res.choices?.[0]?.message?.content ?? '';
    },
  };
}

type OllamaMessage = { content?: unknown } | undefined;
type OllamaResponse = {
  message?: OllamaMessage;
  messages?: OllamaMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractOllamaContent(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const response = payload as OllamaResponse;
  const direct = response.message;
  if (isRecord(direct) && typeof direct.content === 'string') {
    return direct.content;
  }
  const messages = response.messages;
  if (!Array.isArray(messages)) return null;
  const combined = messages
    .map((entry) => (isRecord(entry) && typeof entry.content === 'string' ? entry.content : null))
    .filter((content): content is string => Boolean(content))
    .join('\n');
  return combined.length ? combined : null;
}
