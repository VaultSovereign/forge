// Centralized per-route rate limit helper (keeps route files tidy)
export function limitCfg(
  envMaxVar: string,
  envWinVar: string,
  defMax: number,
  defWindow: string
) {
  const max = Number(process.env[envMaxVar] ?? defMax);
  const timeWindow = (process.env[envWinVar] ?? defWindow) as string;
  return { config: { rateLimit: { max, timeWindow } } } as const;
}

