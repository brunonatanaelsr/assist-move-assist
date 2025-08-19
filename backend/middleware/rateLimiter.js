const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Configuração do Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
});

// Handler para erros do Redis
redisClient.on('error', (err) => {
  logger.error('Erro na conexão Redis:', err);
});

// Configurações base do rate limit
const baseLimiter = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    status: 'error',
    message: 'Muitas requisições deste IP, por favor tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  // Função de log personalizada
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit excedido para IP ${req.ip}`);
    res.status(429).json(options.message);
  },
};

// Rate limit para rotas de autenticação
const authLimiter = rateLimit({
  ...baseLimiter,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 tentativas
  message: {
    status: 'error',
    message: 'Muitas tentativas de login. Por favor, tente novamente em 1 hora.'
  }
});

// Rate limit para API geral
const apiLimiter = rateLimit(baseLimiter);

// Rate limit para uploads
const uploadLimiter = rateLimit({
  ...baseLimiter,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 uploads por hora
  message: {
    status: 'error',
    message: 'Limite de uploads excedido. Por favor, tente novamente mais tarde.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter
};
