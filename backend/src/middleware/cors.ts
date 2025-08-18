import cors from 'cors';
import { logger } from '../services/logger';

const allowedOrigins = [
  'http://movemarias.squadsolucoes.com.br',
  'https://movemarias.squadsolucoes.com.br',
  // Ambientes de desenvolvimento
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://10.0.5.206:8080'
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.error(`CORS bloqueou origem: ${origin}`);
      callback(new Error('Bloqueado pelo CORS - Origem não autorizada'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});
