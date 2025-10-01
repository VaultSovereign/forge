import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  CORS_ORIGIN: z.string().optional(),
  DEV_NO_AUTH: z.enum(['0', '1']).default('1'),
  OIDC_ISSUER: z.string().optional(),
  OIDC_AUDIENCE: z.string().optional(),
  OIDC_JWKS_URL: z.string().optional(),
  SECRETS_PROVIDER: z.enum(['env']).default('env'),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().optional(),
  CORE_GRPC_ADDR: z.string().optional(),
  CORE_TLS: z.enum(['insecure', 'tls', 'mtls']).default('insecure'),
  CORE_TLS_CA: z.string().optional(),
  CORE_TLS_CERT: z.string().optional(),
  CORE_TLS_KEY: z.string().optional(),
  LEDGER_DIR: z.string().default('./reality_ledger'),
  STATIC_DIR: z.string().optional()
});

export const env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[workbench-bff] Invalid environment:');
    for (const issue of parsed.error.issues) {
      console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const values = parsed.data;
  const corsList = values.CORS_ORIGIN?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [
    'http://localhost:5173'
  ];

  return {
    ...values,
    CORS_LIST: corsList
  };
})();
