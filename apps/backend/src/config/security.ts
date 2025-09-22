import type { Express } from 'express';
import type { Request, Response, NextFunction } from 'express-serve-static-core';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { sanitize } from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { loggerService } from '../services/logger';

// Configuração base do CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL!].filter(Boolean)
    : true,
  credentials: true,
  maxAge: 24 * 60 * 60, // 24 horas
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Rate limiting geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos'
});

// Rate limiting específico para APIs críticas
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 1000, // limite de 1000 requisições por IP
  message: 'Limite de requisições excedido para esta API'
});

// Configurações do Helmet
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
};

// Middleware para validar e sanitizar entrada
const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.body) {
      // Sanitizar contra NoSQL injection
      req.body = sanitize(req.body);

      // Sanitizar contra XSS
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      });
    }

    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = xss(req.query[key] as string);
        }
      });
    }

    next();
  } catch (error) {
    loggerService.error('Erro ao sanitizar input:', error);
    next(error);
  }
};

// Middleware para validar origem das requisições
const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  
  if (process.env.NODE_ENV === 'production' && origin) {
    const allowedOrigins = [process.env.FRONTEND_URL!].filter(Boolean);
    
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        error: 'Origem não permitida'
      });
    }
  }
  
  next();
};

// Middleware para validar content-type
const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Content-Type deve ser application/json'
      });
    }
  }
  
  next();
};

// Configuração de segurança para upload de arquivos
const fileUploadConfig = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // máximo 5 arquivos
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido'), false);
    }
    
    cb(null, true);
  }
};

// Função para aplicar todas as configurações de segurança
export const setupSecurity = (app: any) => {
  // Headers de segurança
  app.use(helmet(helmetConfig));
  
  // CORS
  app.use(cors(corsOptions));
  
  // Rate Limiting
  app.use('/api/', generalLimiter);
  app.use('/api/v1/', apiLimiter);
  
  // Sanitização e validação
  app.use(sanitizeInput);
  app.use(validateOrigin);
  app.use(validateContentType);
  
  // Proteção contra Parameter Pollution
  app.use(hpp());
  
  // Logging de segurança
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      loggerService.info('Request segurança:', {
        method: req.method,
        path: req.path,
        origin: req.get('origin'),
        ip: req.ip
      });
    }
    next();
  });
};

export {
  corsOptions,
  generalLimiter,
  apiLimiter,
  helmetConfig,
  sanitizeInput,
  validateOrigin,
  validateContentType,
  fileUploadConfig
};
