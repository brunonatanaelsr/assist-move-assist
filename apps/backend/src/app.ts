import type { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import apiRoutes from './routes/api';
// WebSocket opcional em runtime
let webSocketServer: any = null;
import feedRoutes from './routes/feed.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';
import { pool } from './config/database';
import { env } from './config/env';

const app: Express = express();
const server = createServer(app);

if (env.ENABLE_WS) {
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
const isProduction = env.NODE_ENV === 'production';
const parsedCorsOrigins = env.CORS_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

if (isProduction && (!parsedCorsOrigins || parsedCorsOrigins.length === 0)) {
  throw new Error('CORS_ORIGIN deve ser definido em produção e conter pelo menos uma origem.');
}

const corsOriginOption = (() => {
  if (parsedCorsOrigins && parsedCorsOrigins.length > 0) {
    return parsedCorsOrigins.length === 1 && parsedCorsOrigins[0] === '*' ? true : parsedCorsOrigins;
  }

  return true;
})();

const corsOptions = {
  origin: corsOriginOption,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos.',
});

const rateLimitDisabled = env.RATE_LIMIT_DISABLE;

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
    environment: env.NODE_ENV
  });
});

// Rotas
app.use('/api', apiRoutes);
app.use('/api/feed', feedRoutes);

// Documentação OpenAPI/Swagger (apenas em desenvolvimento)
if (env.NODE_ENV === 'development') {
  const { docsRouter } = require('./openapi/docs');
  app.use('/api/docs', docsRouter);
}

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

const PORT = env.PORT || 3000;

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
  if (env.NODE_ENV === 'development') {
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  }
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
