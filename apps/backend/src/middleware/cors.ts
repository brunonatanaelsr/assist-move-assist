import cors from 'cors';
import { logger } from '../services/logger';

const allowedOrigins = [
  'http://movemarias.squadsolucoes.com.br',
  'https://movemarias.squadsolucoes.com.br',
  // Ambientes de desenvolvimento
  'http://localhost:8080',
  'https://potential-guacamole-q7gx6rgw69j5f677w-8080.app.github.dev',
  'https://potential-guacamole-q7gx6rgw69j5f677w-3000.app.github.dev',
  'https://potential-guacamole-q7gx6rgw69j5f677w-5432.app.github.dev',
  'https://potential-guacamole-q7gx6rgw69j5f677w-6379.app.github.dev',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://10.0.5.206:8080'
];

export const corsMiddleware = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
