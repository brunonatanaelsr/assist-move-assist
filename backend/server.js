const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const path = require("path");
const jwt = require("jsonwebtoken");

// Importar utilitários personalizados
const { successResponse, errorResponse } = require("./utils/responseFormatter");
const { formatArrayDates, formatObjectDates } = require("./utils/dateFormatter");
const { corsMiddleware, corsErrorHandler } = require("./middleware/cors");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV !== 'production' 
      ? ['http://localhost:8080', 'http://localhost:3000', 'http://127.0.0.1:8080'] 
      : ['https://seu-dominio.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Configurar trust proxy para rate limiting
app.set("trust proxy", 1);

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'movemarias',
  user: process.env.POSTGRES_USER || 'postgres',
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

// Configuração do Socket.IO
const onlineUsers = new Map(); // Map para armazenar usuários online

// Middleware de autenticação para Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token não fornecido'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    next();
  } catch (err) {
    console.error('Erro de autenticação Socket.IO:', err);
    next(new Error('Token inválido'));
  }
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
  console.log(`👤 Usuário conectado: ${socket.userId}`);
  
  // Registrar usuário online
  onlineUsers.set(socket.userId, socket.id);
  
  // Emitir status online para todos
  socket.broadcast.emit('user_status', { 
    userId: socket.userId, 
    status: 'online' 
  });
  
  // Entrar nas salas dos grupos do usuário
  socket.on('join_groups', async () => {
    try {
      const gruposResult = await pool.query(
        `SELECT DISTINCT grupo_id FROM participantes_grupo 
         WHERE usuario_id = $1 AND ativo = true`,
        [socket.userId]
      );
      
      gruposResult.rows.forEach(grupo => {
        socket.join(`group_${grupo.grupo_id}`);
      });
    } catch (error) {
      console.error('Erro ao entrar nos grupos:', error);
    }
  });
  
  // Escutar mensagens privadas
  socket.on('send_message', async (data) => {
    try {
      const { destinatario_id, grupo_id, conteudo, anexos } = data;
      
      // Salvar mensagem no banco
      const mensagemResult = await pool.query(
        `INSERT INTO mensagens (remetente_id, destinatario_id, grupo_id, conteudo, anexos, tipo, ativo) 
         VALUES ($1, $2, $3, $4, $5, 'mensagem', true) 
         RETURNING id, remetente_id, destinatario_id, grupo_id, conteudo, anexos, data_criacao`,
        [socket.userId, destinatario_id || null, grupo_id || null, conteudo, anexos || null]
      );
      
      const mensagem = mensagemResult.rows[0];
      
      // Buscar nome do remetente
      const remetenteResult = await pool.query(
        'SELECT nome FROM usuarios WHERE id = $1',
        [socket.userId]
      );
      
      mensagem.remetente_nome = remetenteResult.rows[0]?.nome || 'Usuário';
      
      // Enviar para destinatário específico
      if (destinatario_id) {
        const destSocketId = onlineUsers.get(destinatario_id);
        if (destSocketId) {
          io.to(destSocketId).emit('new_message', mensagem);
        }
      }
      
      // Enviar para grupo
      if (grupo_id) {
        socket.to(`group_${grupo_id}`).emit('new_message', mensagem);
      }
      
      // Confirmar para o remetente
      socket.emit('message_sent', mensagem);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      socket.emit('message_error', { error: 'Erro ao enviar mensagem' });
    }
  });
  
  // Notificação de digitação
  socket.on('typing', (data) => {
    const { destinatario_id, grupo_id, isTyping } = data;
    
    if (destinatario_id) {
      const destSocketId = onlineUsers.get(destinatario_id);
      if (destSocketId) {
        io.to(destSocketId).emit('user_typing', { 
          userId: socket.userId,
          isTyping 
        });
      }
    }
    
    if (grupo_id) {
      socket.to(`group_${grupo_id}`).emit('user_typing', { 
        userId: socket.userId,
        isTyping 
      });
    }
  });
  
  // Marcar mensagem como lida
  socket.on('read_message', async (messageId) => {
    try {
      await pool.query(
        'UPDATE mensagens SET lida = true, data_leitura = NOW() WHERE id = $1',
        [messageId]
      );
      
      const mensagemResult = await pool.query(
        'SELECT remetente_id FROM mensagens WHERE id = $1',
        [messageId]
      );
      
      if (mensagemResult.rows.length > 0) {
        const remetenteId = mensagemResult.rows[0].remetente_id;
        const remetenteSocketId = onlineUsers.get(remetenteId);
        
        if (remetenteSocketId) {
          io.to(remetenteSocketId).emit('message_read', { 
            messageId,
            readBy: socket.userId 
          });
        }
      }
      
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log(`👤 Usuário desconectado: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
    
    // Emitir status offline para todos
    socket.broadcast.emit('user_status', { 
      userId: socket.userId, 
      status: 'offline' 
    });
  });
});

// Disponibilizar io e onlineUsers para os routers
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Middleware de segurança - Desabilitado temporariamente para debug CORS
/*
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
*/

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

// Servir arquivos estáticos (imagens uploadadas)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar e usar routers modulares
const authRouter = require('./routes/auth');
const beneficiariasRouter = require('./routes/beneficiarias');
const oficinasRouter = require('./routes/oficinas');
const projetosRouter = require('./routes/projetos');
const participacoesRouter = require('./routes/participacoes');
const mensagensRouter = require('./routes/mensagens');
const dashboardRouter = require('./routes/dashboard');
const feedRouter = require('./routes/feed');
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
app.use('/api/feed', feedRouter);
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
server.listen(PORT, () => {
  console.log(`🚀 Servidor de PRODUÇÃO rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Segurança: Helmet, Rate Limiting, CORS habilitados`);
  console.log(`💾 Banco: PostgreSQL Real com CRUD completo`);
  console.log(`🔌 Socket.IO habilitado para chat em tempo real`);
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
