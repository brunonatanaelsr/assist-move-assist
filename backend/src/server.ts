import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Configuração do ambiente
dotenv.config();

// Importação das rotas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import beneficiariasRoutes from './routes/beneficiarias.routes';
import projetosRoutes from './routes/projetos.routes';
import oficinasRoutes from './routes/oficinas.routes';
import formulariosRoutes from './routes/formularios.routes';
import documentosRoutes from './routes/documentos.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import analyticsRoutes from './routes/analytics.routes';

// Middlewares
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticateToken } from './middleware/auth';

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Inicialização do Express
const app = express();

// Configurações de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});
app.use('/api/', limiter);

// Middlewares padrão
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Rotas da API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authenticateToken, userRoutes);
app.use('/api/v1/beneficiarias', authenticateToken, beneficiariasRoutes);
app.use('/api/v1/projetos', authenticateToken, projetosRoutes);
app.use('/api/v1/oficinas', authenticateToken, oficinasRoutes);
app.use('/api/v1/formularios', authenticateToken, formulariosRoutes);
app.use('/api/v1/documentos', authenticateToken, documentosRoutes);
app.use('/api/v1/auditoria', authenticateToken, auditoriaRoutes);
app.use('/api/v1/analytics', authenticateToken, analyticsRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handler de erros
app.use(errorHandler);

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
