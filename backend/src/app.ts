import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { apiRoutes } from './routes/api';
import { initializeWebSocket } from './services/websocket';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const server = createServer(app);

// Middleware de segurança
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api', apiRoutes);

// WebSocket setup
initializeWebSocket(server);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🌐 API base: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Recebido SIGTERM, fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

export default app;
