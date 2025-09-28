import type { Express, RequestHandler } from 'express';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import hpp from 'hpp';

import type { Env } from '../config/env';
import { env as defaultEnv } from '../config/env';
import { logger } from '../services/logger';

export type SecurityEnvConfig = Pick<Env, 'NODE_ENV' | 'CORS_ORIGIN' | 'CORS_ALLOWED_HEADERS' | 'RATE_LIMIT_DISABLE'>;

export interface SecurityMiddlewareOptions {
  env?: Partial<SecurityEnvConfig>;
  corsOptions?: Parameters<typeof cors>[0];
  jsonLimit?: string;
  urlencodedLimit?: string;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  rateLimitMessage?: string;
  rateLimitPath?: string;
  skipRateLimit?: boolean;
}

export interface SecurityMiddlewareBundle {
  env: SecurityEnvConfig;
  corsOptions: Parameters<typeof cors>[0];
  globalMiddlewares: RequestHandler[];
  rateLimitMiddleware: RequestHandler;
  shouldApplyRateLimit: boolean;
  rateLimitPath: string;
}

const DEFAULT_JSON_LIMIT = '10mb';
const DEFAULT_URLENCODED_LIMIT = '10mb';
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_MESSAGE = 'Muitas tentativas, tente novamente em 15 minutos.';

const baseEnvConfig: SecurityEnvConfig = {
  NODE_ENV: defaultEnv.NODE_ENV,
  CORS_ORIGIN: defaultEnv.CORS_ORIGIN,
  RATE_LIMIT_DISABLE: defaultEnv.RATE_LIMIT_DISABLE
};

const parseCorsOrigin = (env: SecurityEnvConfig): boolean | string | RegExp | (string | RegExp)[] => {
  const rawOrigins = env.CORS_ORIGIN
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (env.NODE_ENV === 'production' && (!rawOrigins || rawOrigins.length === 0)) {
    throw new Error('CORS_ORIGIN deve ser definido em produção e conter pelo menos uma origem.');
  }

  if (!rawOrigins || rawOrigins.length === 0) {
    return true;
  }

  if (rawOrigins.length === 1 && rawOrigins[0] === '*') {
    return true;
  }

  return rawOrigins;
};

export const createSecurityMiddleware = (
  options: SecurityMiddlewareOptions = {}
): SecurityMiddlewareBundle => {
  const effectiveEnv: SecurityEnvConfig = {
    ...baseEnvConfig,
    ...options.env,
    CORS_ORIGIN: options.env?.CORS_ORIGIN ?? baseEnvConfig.CORS_ORIGIN
  };

  const defaultAllowedHeaders: string[] = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token'
  ];
  const additionalAllowedHeaders = defaultEnv.CORS_ALLOWED_HEADERS
    ?.split(',')
    .map((header) => header.trim())
    .filter((header) => header.length > 0);

  const allowedHeaders = Array.from(new Set([
    ...defaultAllowedHeaders,
    ...(additionalAllowedHeaders || [])
  ]));

  const corsOptions = options.corsOptions ?? {
    origin: parseCorsOrigin(effectiveEnv),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders
  };

  const jsonLimit = options.jsonLimit ?? DEFAULT_JSON_LIMIT;
  const urlencodedLimit = options.urlencodedLimit ?? DEFAULT_URLENCODED_LIMIT;

  const globalMiddlewares: RequestHandler[] = [
    helmet(),
    compression(),
    cors(corsOptions),
    express.json({ limit: jsonLimit }),
    express.urlencoded({ extended: true, limit: urlencodedLimit }),
    mongoSanitize({ replaceWith: '_' }) as unknown as RequestHandler,
    xssClean(),
    hpp()
  ];

  const rateLimitMiddleware = rateLimit({
    windowMs: options.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    max: options.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX,
    message: options.rateLimitMessage ?? DEFAULT_RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false
  });

  const shouldApplyRateLimit = !(options.skipRateLimit ?? effectiveEnv.RATE_LIMIT_DISABLE);

  return {
    env: effectiveEnv,
    corsOptions,
    globalMiddlewares,
    rateLimitMiddleware,
    shouldApplyRateLimit,
    rateLimitPath: options.rateLimitPath ?? '/api/'
  };
};

export const applySecurityMiddleware = (
  app: Express,
  options: SecurityMiddlewareOptions = {}
): SecurityMiddlewareBundle => {
  const bundle = createSecurityMiddleware(options);

  bundle.globalMiddlewares.forEach((middleware) => {
    app.use(middleware);
  });

  if (bundle.shouldApplyRateLimit) {
    app.use(bundle.rateLimitPath, bundle.rateLimitMiddleware);
  } else {
    logger.info('Rate limiting desativado via RATE_LIMIT_DISABLE');
  }

  return bundle;
};

export default applySecurityMiddleware;

