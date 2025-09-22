import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

import apiRoutes from './routes/api';
// WebSocket opcional em runtime
let webSocketServer: any = null;
import feedRoutes from './routes/feed.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';
import { pool } from './config/database';

// Carregar variáveis de ambiente
dotenv.config();

const app: Express = express();
const server = createServer(app);

if (process.env.ENABLE_WS === 'true') {
  try {
     
    const { WebSocketServer } = require('./websocket/server');
    webSocketServer = new WebSocketServer(server, pool);
  } catch (err) {
    logger.warn('WebSocket não inicializado: módulo indisponível');
  }
}

// Middleware de segurança
app.use(helmet());
app.use(compression());

// CORS
const rawCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultLocalOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const mergedOrigins = new Set<string>();
rawCorsOrigins.forEach((origin) => {
  if (origin) mergedOrigins.add(origin);
});

if (process.env.NODE_ENV !== 'production') {
  defaultLocalOrigins.forEach((origin) => mergedOrigins.add(origin));
}

const allowList = mergedOrigins.size > 0 ? Array.from(mergedOrigins) : [];

if (allowList.length === 0) {
  logger.warn('CORS desabilitado por padrão. Defina CORS_ORIGIN com as origens permitidas.');
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      // Permitir chamadas sem header Origin (ex.: ferramentas internas / Postman)
      return callback(null, true);
    }

    if (allowList.length === 0) {
      logger.warn('Requisição bloqueada por CORS (nenhuma origem configurada)', { origin });
      return callback(new Error('CORS bloqueado: configure CORS_ORIGIN')); 
    }

    if (allowList.includes(origin)) {
      return callback(null, true);
    }

    logger.warn('Tentativa de acesso bloqueada por CORS', { origin });
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: 'Muitas tentativas, tente novamente em 1 minuto.',
});

const rateLimitDisabled = process.env.RATE_LIMIT_DISABLE === 'true';

if (!rateLimitDisabled) {
  app.use('/api/', limiter);
} else {
  logger.info('Rate limiting desativado via RATE_LIMIT_DISABLE');
}

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Removido: exposição direta de uploads
// Os arquivos agora são servidos por rotas autenticadas (ex.: /api/feed/images/:filename)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotas
app.use('/api', apiRoutes);
app.use('/api/feed', feedRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

const PORT = process.env.PORT || 3000;

// Trata erro de porta em uso com mensagem amigável
server.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    logger.error(`A porta ${PORT} já está em uso. Feche o processo que está usando a porta ou defina outra porta com PORT=xxxx.`);
  } else {
    logger.error('Erro ao iniciar o servidor:', err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🌐 API base: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM, fechando servidor...');
  if (webSocketServer?.stop) {
    webSocketServer.stop();
  }
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

export { app };
export default app;
