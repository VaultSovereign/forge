export function getProviderKey(): {
  provider: 'openai' | 'openrouter' | 'ollama' | 'none';
  token?: string;
  host?: string;
} {
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: 'openrouter', token: process.env.OPENROUTER_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', token: process.env.OPENAI_API_KEY };
  }
  if (process.env.OLLAMA_HOST) {
    return { provider: 'ollama', host: process.env.OLLAMA_HOST };
  }
  return { provider: 'none' };
}
