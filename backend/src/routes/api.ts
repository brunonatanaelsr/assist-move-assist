import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { createRouterInstance } from '../utils/router';
import rateLimit from 'express-rate-limit';

// Types auxiliares
// Usamos os tipos nativos do Express para evitar conflitos

// ========== IMPORTAÇÃO DAS ROTAS ==========
// Priorizando versões TypeScript quando disponíveis, com fallback para JavaScript

// Rotas de autenticação
import authRoutes from './auth.routes';

// Rotas de auditoria (temporariamente desabilitado)
const auditoriaRoutes = createRouterInstance();

// Rotas de beneficiárias
import beneficiariasRoutes from './beneficiarias.routes';

// Rotas de configurações (temporariamente desabilitado)
const configuracoesRoutes = createRouterInstance();

// Rotas de dashboard
import dashboardRoutes from './dashboard.routes';

// Rotas de declarações (temporariamente desabilitado)
const declaracoesRoutes = createRouterInstance();

// Rotas de documentos
import documentosRoutes from './documentos.routes';

// Rotas de feed
import feedRoutes from './feed.routes';

// Rotas de formulários
import formulariosRoutes from './formularios.routes';

// Rotas de health check
import healthRoutes from './health.routes';

// Rotas de mensagens
import mensagensRoutes from './mensagens.routes';

// Rotas de oficinas
import oficinasRoutes from './oficina.routes';

// Rotas de participações
import participacoesRoutes from './participacao.routes';

// Rotas de projetos
import projetosRoutes from './projeto.routes';

// Rotas de relatórios
import relatoriosRoutes from './relatorios.routes';
// Rotas de notificações
import notificationsRoutes from './notifications.routes';
// Rotas de calendário
import calendarRoutes from './calendar.routes';

// ========== CONFIGURAÇÃO DO ROUTER ==========
const router = createRouterInstance();

// ========== MIDDLEWARE GLOBAL ==========

// Rate limiting para proteção contra ataques
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela
  message: {
    success: false,
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    retryAfter: '15 minutos',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiting (exceto para health checks)
router.use('/health', healthRoutes); // Health check sem rate limit
router.use(limiter); // Rate limit para todas as outras rotas

// Middleware de logging de requisições
router.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`);
  next();
});

// Middleware para adicionar headers de segurança
router.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Powered-By', 'Move Marias API');
  next();
});

// ========== REGISTRO DAS ROTAS ==========
// Ordem hierárquica: sistema → auth → negócio → admin → utilitários

// 1. Rotas de sistema (já registrado acima sem rate limit)

// 2. Rotas de autenticação (críticas)
router.use('/auth', authRoutes);

// 3. Rotas principais de negócio
router.use('/beneficiarias', beneficiariasRoutes);
router.use('/projetos', projetosRoutes);
router.use('/oficinas', oficinasRoutes);
router.use('/participacoes', participacoesRoutes);

// 4. Rotas de conteúdo e comunicação
router.use('/feed', feedRoutes);
router.use('/mensagens', mensagensRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/calendar', calendarRoutes);

// 5. Rotas de formulários e documentos
router.use('/formularios', formulariosRoutes);
router.use('/declaracoes', declaracoesRoutes);
router.use('/documentos', documentosRoutes);

// 6. Rotas administrativas
router.use('/dashboard', dashboardRoutes);
router.use('/relatorios', relatoriosRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/configuracoes', configuracoesRoutes);

// ========== ROTA RAIZ DA API ==========
router.get('/', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({
    name: 'Move Marias API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.round(process.uptime())}s`,
    endpoints: {
      // Sistema
      health: '/api/health',
      
      // Autenticação
      auth: '/api/auth',
      
      // Negócio principal
      beneficiarias: '/api/beneficiarias',
      projetos: '/api/projetos',
      oficinas: '/api/oficinas',
      participacoes: '/api/participacoes',
      
      // Conteúdo
      feed: '/api/feed',
      mensagens: '/api/mensagens',
      
      // Formulários
      formularios: '/api/formularios',
      declaracoes: '/api/declaracoes',
      documentos: '/api/documentos',
      
      // Administrativo
      dashboard: '/api/dashboard',
      relatorios: '/api/relatorios',
      auditoria: '/api/auditoria',
      configuracoes: '/api/configuracoes'
    },
    documentation: process.env.API_DOCS_URL || 'Em desenvolvimento',
    support: {
      email: 'suporte@movemarias.org.br',
      github: 'https://github.com/movemarias/api'
    }
  });
});

// ========== MIDDLEWARE PARA ROTAS NÃO ENCONTRADAS (404) ==========
router.use('*', (req: ExpressRequest, res: ExpressResponse) => {
  const method = req.method;
  const path = req.originalUrl;
  
  // Log da tentativa de acesso a rota inexistente
  console.warn(`[${new Date().toISOString()}] 404 - ${method} ${path} - IP: ${req.ip}`);
  
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    message: `A rota ${method} ${path} não existe nesta API`,
    timestamp: new Date().toISOString(),
    suggestion: 'Consulte a documentação em GET /api/ para ver os endpoints disponíveis',
    availableEndpoints: [
      'GET /api/',
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/beneficiarias',
      'GET /api/dashboard/stats',
      'GET /api/feed',
      'GET /api/oficinas',
      'GET /api/participacoes',
      'GET /api/projetos',
      'GET /api/relatorios/beneficiarias'
    ]
  });
});

// ========== MIDDLEWARE GLOBAL DE TRATAMENTO DE ERROS ==========
router.use((error: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  // Log detalhado do erro
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  console.error('🚨 Erro na API:', errorInfo);
  
  // Determinar status code
  const statusCode = error.status || error.statusCode || 500;
  
  // Diferentes tipos de resposta baseados no ambiente
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Response base
  const errorResponse: any = {
    success: false,
    error: error.message || 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || `req_${Date.now()}`
  };
  
  // Adicionar detalhes em desenvolvimento
  if (isDevelopment) {
    errorResponse.details = {
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      query: req.query
    };
  }
  
  // Em produção, só retornar erros genéricos para erros 500+
  if (isProduction && statusCode >= 500) {
    errorResponse.error = 'Erro interno do servidor';
    errorResponse.message = 'Entre em contato com o suporte se o problema persistir';
    errorResponse.support = 'suporte@movemarias.org.br';
  }
  
  res.status(statusCode).json(errorResponse);
});

// ========== EXPORTAÇÃO ==========
export { router as apiRoutes };
export default router;
