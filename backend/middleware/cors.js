/**
 * Middleware de CORS personalizado
 * Configuração robusta para diferentes ambientes
 */

const cors = require('cors');

/**
 * Configuração de CORS baseada no ambiente
 * @returns {Function} Middleware de CORS configurado
 */
const createCorsMiddleware = () => {
  const corsOptions = {
    origin: function(origin, callback) {
      // Origens permitidas
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://10.0.10.194:8080',
        'https://effective-lamp-r4v6qvwwxgxghpr4j-8080.app.github.dev',
        'https://effective-lamp-r4v6qvwwxgxghpr4j-3000.app.github.dev',
        'http://movemarias.squadsolucoes.com.br',
        'https://movemarias.squadsolucoes.com.br',
        'https://*.app.github.dev',
        'https://github.dev',
        'http://127.0.0.1:*'
      ];
      
      // Em desenvolvimento, permite apenas origens específicas
      if (process.env.NODE_ENV !== 'production') {
        if (!origin || allowedOrigins.includes(origin)) {
          console.log(`CORS: Origem permitida: ${origin || 'sem origem'}`);
          return callback(null, true);
        }
        return callback(new Error('Origem não permitida pelo CORS'));
      }
      
      // Se não há origem (requisições diretas, mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Verificar se a origem está na lista permitida
      if (allowedOrigins.includes(origin)) {
        console.log(`CORS: Origem permitida: ${origin}`);
        return callback(null, true);
      }
      
      // Log da origem rejeitada para debug
      console.warn(`CORS: Origem rejeitada: ${origin}`);
      const error = new Error(`Origem não permitida pelo CORS: ${origin}`);
      error.code = 'CORS_NOT_ALLOWED';
      callback(error);
    },
    
    // Permitir cookies/credenciais
    credentials: true,
    
    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    
    // Headers permitidos
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    
    // Headers expostos para o frontend
    exposedHeaders: ['Authorization'],
    
    // Cache do preflight por 24 horas
    maxAge: 86400,
    
    // Permitir preflight para todas as rotas
    optionsSuccessStatus: 200
  };

  return cors(corsOptions);
};

/**
 * Middleware para tratamento de erros de CORS
 * @param {Error} err - Erro
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Próximo middleware
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err && err.code === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({
      success: false,
      message: 'Acesso negado: origem não permitida',
      error: 'CORS_ERROR'
    });
  }
  
  next(err);
};

module.exports = {
  corsMiddleware: createCorsMiddleware(),
  corsErrorHandler
};
