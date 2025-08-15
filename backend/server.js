const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");

// Importar utilitários personalizados
const { successResponse, errorResponse } = require("./utils/responseFormatter");
const { formatArrayDates, formatObjectDates } = require("./utils/dateFormatter");
const { corsMiddleware, corsErrorHandler } = require("./middleware/cors");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para rate limiting
app.set("trust proxy", 1);

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'movemarias',
  password: process.env.POSTGRES_PASSWORD || '15002031',
  
  // Configurações do pool
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  
  // SSL para produção
  ssl: process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false 
  } : false,
});

// Teste de conexão do banco
pool.connect()
  .then(client => {
    console.log('✅ Conexão com PostgreSQL estabelecida');
    client.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com PostgreSQL:', err);
    process.exit(1);
  });

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela
  message: errorResponse("Muitas requisições. Tente novamente em alguns minutos."),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS
app.use(corsMiddleware);
app.use(corsErrorHandler);

// Middleware básico
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Importar e usar routers modulares
const authRouter = require('./routes/auth');
const beneficiariasRouter = require('./routes/beneficiarias');
const oficinasRouter = require('./routes/oficinas');
const projetosRouter = require('./routes/projetos');
const participacoesRouter = require('./routes/participacoes');
const mensagensRouter = require('./routes/mensagens');
const dashboardRouter = require('./routes/dashboard');
const relatoriosRouter = require('./routes/relatorios');
const declaracoesRouter = require('./routes/declaracoes');
const auditoriaRouter = require('./routes/auditoria');
const configuracoesRouter = require('./routes/configuracoes');
const documentosRouter = require('./routes/documentos');

// Usar routers
app.use('/api/auth', authRouter);
app.use('/api/beneficiarias', beneficiariasRouter);
app.use('/api/oficinas', oficinasRouter);
app.use('/api/projetos', projetosRouter);
app.use('/api/participacoes', participacoesRouter);
app.use('/api/mensagens', mensagensRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/declaracoes', declaracoesRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/configuracoes', configuracoesRouter);
app.use('/api/documentos', documentosRouter);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Verificar conexão e contar registros principais
    const usersCount = await client.query('SELECT COUNT(*) FROM usuarios WHERE ativo = true');
    const beneficiariasCount = await client.query('SELECT COUNT(*) FROM beneficiarias WHERE ativo = true');
    const oficinasCount = await client.query('SELECT COUNT(*) FROM oficinas WHERE ativo = true');
    
    client.release();
    
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        status: 'connected',
        type: 'PostgreSQL',
        users: parseInt(usersCount.rows[0].count),
        beneficiarias: parseInt(beneficiariasCount.rows[0].count),
        oficinas: parseInt(oficinasCount.rows[0].count)
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      }
    };
    
    res.json(healthInfo);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  if (err.code === '23505') { // Violação de unique constraint
    return res.status(409).json(errorResponse('Dados duplicados. Verifique os campos únicos.'));
  }
  
  if (err.code === '23503') { // Violação de foreign key
    return res.status(400).json(errorResponse('Referência inválida. Verifique os dados relacionados.'));
  }
  
  res.status(500).json(errorResponse('Erro interno do servidor'));
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json(errorResponse('Endpoint não encontrado'));
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de PRODUÇÃO rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Segurança: Helmet, Rate Limiting, CORS habilitados`);
  console.log(`💾 Banco: PostgreSQL Real com CRUD completo`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    pool.end(() => {
      console.log('Database pool closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, pool };
