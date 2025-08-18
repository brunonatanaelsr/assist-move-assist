import rateLimit from 'express-rate-limit';

// Rate limiter geral para APIs
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela de tempo
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Muitas requisições, tente novamente mais tarde',
    retryAfter: '15 minutos'
  }
});

// Rate limiter específico para login (mais restritivo)
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 tentativas de login por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Muitas tentativas de login, tente novamente mais tarde',
    retryAfter: '1 hora'
  }
});

// Rate limiter para operações críticas (criação/edição)
export const criticalOpsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 operações críticas por IP por 5 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Muitas operações realizadas, aguarde alguns minutos',
    retryAfter: '5 minutos'
  }
});
