const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configuração do formato de log
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Configuração do transporte de rotação diária de arquivos
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m'
});

// Criação do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'assist-move-api',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Logs de erro em arquivo separado
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error'
    }),
    // Rotação diária de logs
    fileRotateTransport
  ]
});

// Adiciona logs no console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Função de log para requisições HTTP
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
};

// Função para log de erros
const errorLogger = (err, req, res, next) => {
  logger.error('Error', {
    error: {
      message: err.message,
      stack: err.stack,
      ...err
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
};
