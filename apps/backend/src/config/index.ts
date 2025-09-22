import dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
  },

  // Configurações do PostgreSQL
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'movemarias',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  },

  // Configurações do Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  // Configurações do JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: '1h',
    refreshExpiresIn: '7d',
  },

  // Configurações do WebSocket
  websocket: {
    path: '/ws',
    cors: {
      origin: '*',
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
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Configurações de Email (SMTP)
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Assist Move Assist',
    fromEmail: process.env.SMTP_FROM_EMAIL || (process.env.SMTP_USER || 'no-reply@example.com'),
  },
};

export { config };
