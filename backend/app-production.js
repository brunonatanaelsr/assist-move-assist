const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env' });

const app = express();

// Configuração de segurança com Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compressão de resposta
app.use(compression());

// CORS configurado para produção
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'https://movemarias.squadsolucoes.com.br',
  'http://localhost:8080' // apenas para desenvolvimento
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting simples
const requests = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX = 100; // requests por janela

const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requests.has(ip)) {
    requests.set(ip, []);
  }
  
  const userRequests = requests.get(ip);
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições, tente novamente mais tarde'
    });
  }
  
  validRequests.push(now);
  requests.set(ip, validRequests);
  
  next();
};

// Aplicar rate limiting nas APIs
app.use('/api/', rateLimit);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Mock database com dados expandidos para produção
let beneficiarias = [
  {
    id: 1,
    nome_completo: 'Maria Silva Santos',
    cpf: '123.456.789-00',
    telefone: '(11) 99999-1111',
    endereco: 'Rua das Flores, 123 - São Paulo, SP',
    email: 'maria.silva@email.com',
    status: 'ativo',
    data_nascimento: '1985-03-15',
    data_criacao: '2024-01-15T10:00:00Z',
    data_atualizacao: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    nome_completo: 'Ana Paula Oliveira',
    cpf: '987.654.321-00',
    telefone: '(11) 99999-2222',
    endereco: 'Av. Principal, 456 - São Paulo, SP',
    email: 'ana.paula@email.com',
    status: 'ativo',
    data_nascimento: '1990-07-22',
    data_criacao: '2024-01-16T14:30:00Z',
    data_atualizacao: '2024-01-16T14:30:00Z'
  },
  {
    id: 3,
    nome_completo: 'Carla Regina Costa',
    cpf: '456.789.123-00',
    telefone: '(11) 99999-3333',
    endereco: 'Rua da Esperança, 789 - São Paulo, SP',
    email: 'carla.costa@email.com',
    status: 'ativo',
    data_nascimento: '1978-12-10',
    data_criacao: '2024-01-17T09:15:00Z',
    data_atualizacao: '2024-01-17T09:15:00Z'
  }
];

let nextId = 4;

// Health check robusto
app.get('/health', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: {
        status: 'connected',
        type: 'mock',
        records: beneficiarias.length
      },
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check detalhado
app.get('/health/detailed', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        memory: memoryUsage
      },
      application: {
        beneficiarias: beneficiarias.length,
        activeBeneficiarias: beneficiarias.filter(b => b.status === 'ativo').length
      }
    });
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable'
    });
  }
});

// Login com segurança aprimorada
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Log da tentativa (sem senha)
    console.log(`Login attempt: ${email} from ${ip}`);
    
    // Validação
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }
    
    // Simular delay para prevenir ataques de força bruta
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar credenciais
    if (email === process.env.ADMIN_EMAIL && password === 'admin123') {
      console.log(`Successful login: ${email} from ${ip}`);
      
      res.json({
        success: true,
        user: {
          id: 1,
          name: 'Administrator',
          email,
          role: 'admin'
        },
        token: 'secure-jwt-token-' + Date.now()
      });
    } else {
      console.warn(`Failed login attempt: ${email} from ${ip}`);
      
      res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// API de beneficiárias com paginação e filtros
app.get('/api/beneficiarias', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`Beneficiarias request from ${ip}: page=${page}, limit=${limit}, search=${search ? 'yes' : 'no'}`);
    
    let filteredBeneficiarias = [...beneficiarias];
    
    // Aplicar filtro de busca
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredBeneficiarias = filteredBeneficiarias.filter(b => 
        b.nome_completo.toLowerCase().includes(searchTerm) ||
        b.cpf.includes(searchTerm) ||
        b.email.toLowerCase().includes(searchTerm)
      );
    }
    
    // Aplicar filtro de status
    if (status) {
      filteredBeneficiarias = filteredBeneficiarias.filter(b => b.status === status);
    }
    
    // Aplicar paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedData = filteredBeneficiarias.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredBeneficiarias.length,
        pages: Math.ceil(filteredBeneficiarias.length / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching beneficiarias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar beneficiárias'
    });
  }
});

// Criar beneficiária
app.post('/api/beneficiarias', async (req, res) => {
  try {
    const novaBeneficiaria = {
      id: nextId++,
      ...req.body,
      status: 'ativo',
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString()
    };
    
    beneficiarias.push(novaBeneficiaria);
    
    console.log(`New beneficiaria created: ${novaBeneficiaria.nome_completo} (ID: ${novaBeneficiaria.id})`);
    
    res.status(201).json({
      success: true,
      data: novaBeneficiaria,
      message: 'Beneficiária criada com sucesso'
    });
  } catch (error) {
    console.error('Error creating beneficiaria:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar beneficiária'
    });
  }
});

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : error.message
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  console.warn(`Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de PRODUÇÃO rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`📝 Beneficiárias mock: ${beneficiarias.length} registros`);
  console.log(`🔒 Segurança: Helmet, Rate Limiting, CORS habilitados`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
