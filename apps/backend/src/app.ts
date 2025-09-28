import type { Express } from 'express';
import express from 'express';
import morgan from 'morgan';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';

import apiRoutes from './routes/api';
// WebSocket opcional em runtime
let webSocketServer: any = null;
import feedRoutes from './routes/feed.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';
import { pool } from './config/database';
import { env } from './config/env';
import { applySecurityMiddleware } from './middleware/security.middleware';

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

// Middleware de segurança e sanitização
applySecurityMiddleware(app);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

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

app.get('/api/csrf-token', (req, res) => {
  res.status(200).json({ csrfToken: res.locals.csrfToken });
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
