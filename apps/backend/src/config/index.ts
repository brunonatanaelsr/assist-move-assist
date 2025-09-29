import path from 'path';
import { env } from './env';

const parseCorsOrigin = (originList?: string) => {
  if (!originList) {
    return undefined;
  }

  const parsedOrigins = originList
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (parsedOrigins.length === 0) {
    return undefined;
  }

  if (parsedOrigins.length === 1 && parsedOrigins[0] === '*') {
    return '*';
  }

  return parsedOrigins;
};

const config = {
  // Configurações do servidor
  server: {
    port: env.PORT || 3001,
    env: env.NODE_ENV,
  },

  // Configurações do PostgreSQL
  database: {
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  },

  // Configurações do Redis
  redis: {
    host: env.REDIS_HOST || 'localhost',
    port: env.REDIS_PORT || 6379,
  },

  // Configurações do JWT
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET || env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRY || '1h',
    refreshExpiresIn: env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Configurações do WebSocket
  websocket: {
    path: '/ws',
    cors: {
      origin: parseCorsOrigin(env.CORS_ORIGIN),
      methods: ['GET', 'POST'],
    },
  },

  // Configurações de upload
  upload: {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    destination: path.resolve(__dirname, '../../uploads'),
  },

  // Configurações de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.resolve(__dirname, '../../logs/app.log'),
  },

  // Configurações de cors
  cors: {
    origin: parseCorsOrigin(env.CORS_ORIGIN),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Configurações de Email (SMTP)
  email: {
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: env.SMTP_PORT || 587,
    secure: Boolean(env.SMTP_SECURE) || env.SMTP_PORT === 465,
    user: env.SMTP_USER || '',
    password: env.SMTP_PASS || '',
    fromName: env.SMTP_FROM_NAME || 'Assist Move Assist',
    fromEmail: env.SMTP_FROM_EMAIL || env.SMTP_USER || 'no-reply@example.com',
  },
};

export { config };
