const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Configuração de compressão
const compressionMiddleware = compression({
  level: 6, // nível de compressão balanceado
  threshold: 100 * 1024, // apenas comprimir respostas maiores que 100kb
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Configuração do Helmet
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// Configuração do HPP (HTTP Parameter Pollution)
const hppMiddleware = hpp({
  whitelist: [
    'ordem',
    'pagina',
    'limite',
    'dataInicio',
    'dataFim',
    'status'
  ]
});

// Aplicar todos os middlewares de segurança
const securityMiddlewares = [
  helmetMiddleware,
  mongoSanitize(), // previne injeção de NoSQL
  xss(), // sanitiza inputs prevenindo XSS
  hppMiddleware,
  compressionMiddleware
];

module.exports = {
  securityMiddlewares,
  compression: compressionMiddleware,
  helmet: helmetMiddleware,
  hpp: hppMiddleware
};
