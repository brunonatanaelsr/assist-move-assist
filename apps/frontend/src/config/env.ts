import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url('VITE_API_BASE_URL deve ser uma URL válida'),
  VITE_WS_URL: z.string().url('VITE_WS_URL deve ser uma URL válida'),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_GA_ID: z.string().optional(),
  MODE: z.enum(['development', 'production', 'test']).default('development'),
  DEV: z.boolean(),
  PROD: z.boolean(),
  BASE_URL: z.string().default('/'),
});

const parsedEnv = envSchema.safeParse({
  ...import.meta.env,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
});

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Variáveis de ambiente inválidas:\n${formattedErrors}`);
}

export type Env = z.infer<typeof envSchema>;

/**
 * Variáveis de ambiente validadas. O aplicativo não iniciará se alguma
 * variável obrigatória estiver faltando ou for inválida.
 */
export const env: Env = parsedEnv.data;