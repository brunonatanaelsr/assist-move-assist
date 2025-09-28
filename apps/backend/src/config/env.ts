import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import type { StringValue } from 'ms';
import type { SignOptions } from 'jsonwebtoken';

/**
 * Converts string based environment variables to booleans following Node.js conventions.
 */
const booleanFromEnv = z
  .preprocess((value) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return undefined;
  }, z.boolean());

const envFile = process.env.ENV_FILE || '.env';
dotenvConfig({ path: path.resolve(__dirname, '../../', envFile) });

const defaultsForTests = {
  JWT_SECRET: 'test-secret',
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_DB: 'postgres',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'postgres',
  FRONTEND_URL: 'http://localhost:5173'
} as const;

const jwtExpirySchema = z
  .union([
    z.coerce.number(),
    z
      .string()
      .trim()
      .regex(
        /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y)$/i,
        'JWT_EXPIRY deve seguir o formato 15m, 2h, 1d, etc.'
      )
      .transform((value) => value.replace(/\s+/g, '').toLowerCase() as StringValue)
  ])
  .default('24h')
  .transform((value): SignOptions['expiresIn'] => value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatório'),
  JWT_EXPIRY: jwtExpirySchema,
  JWT_REFRESH_SECRET: z.string().optional(),
  AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  RATE_LIMIT_DISABLE: booleanFromEnv.default(false),
  ENABLE_WS: booleanFromEnv.default(false),
  CORS_ORIGIN: z.string().optional(),
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL é obrigatório'),
  POSTGRES_HOST: z.string().min(1, 'POSTGRES_HOST é obrigatório'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB é obrigatório'),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER é obrigatório'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD é obrigatório'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: booleanFromEnv.optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional()
});

const baseEnv = {
  ...((process.env.NODE_ENV || '').toLowerCase() === 'test' ? defaultsForTests : {}),
  ...process.env
};

const parsedEnv = envSchema.safeParse(baseEnv);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Variáveis de ambiente inválidas:\n${formattedErrors}`);
}

export type Env = z.infer<typeof envSchema>;

/**
 * Aplicação das variáveis de ambiente validadas. Caso alguma configuração obrigatória não esteja
 * definida o processo é interrompido imediatamente evitando que a API suba em um estado inválido.
 */
export const env: Env = parsedEnv.data;
