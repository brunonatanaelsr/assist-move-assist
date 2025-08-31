import type { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'development' ? '*' : '');
const corsOptions: CorsOptions = {
  origin: corsOrigin === '*' || corsOrigin === '' ? true : corsOrigin.split(',').map((o) => o.trim()),
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
app.use('/api/', limiter);

// Logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar pasta de uploads
app.use('/uploads', express.static('uploads'));

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
