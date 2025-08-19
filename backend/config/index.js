const path = require('path');
require('dotenv').config();

const config = {
  // Configurações do Servidor
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
  },

  // Configurações do PostgreSQL
  database: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
    },
    
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  },

  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Configurações de CORS
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.CORS_ORIGIN]
      : ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
  },

  // Redis (se usado)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM
  },

  // Upload de arquivos
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'),
    path: process.env.UPLOAD_PATH || path.join(__dirname, '../uploads'),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../logs/app.log')
  },

  // SSL/TLS (para produção)
  ssl: process.env.NODE_ENV === 'production' ? {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH
  } : null
};

// Validação de configurações críticas
const requiredConfigs = {
  'JWT_SECRET': config.jwt.secret,
  'POSTGRES_HOST': config.database.host,
  'POSTGRES_DB': config.database.database,
  'POSTGRES_USER': config.database.user,
  'POSTGRES_PASSWORD': config.database.password
};

Object.entries(requiredConfigs).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Configuração obrigatória não encontrada: ${key}`);
  }
});

module.exports = config;
