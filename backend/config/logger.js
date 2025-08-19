const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Níveis de log personalizados
const levels = {
  error: 0,   // Erros críticos que precisam de atenção imediata
  warn: 1,    // Alertas sobre situações potencialmente problemáticas
  info: 2,    // Informações gerais sobre o funcionamento do sistema
  http: 3,    // Logs de requisições HTTP
  debug: 4    // Informações detalhadas para debugging
};

// Cores para diferentes níveis no console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Adicionar cores ao Winston
winston.addColors(colors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      service: service || 'assist-move-assist',
      message,
      ...meta
    };
    return JSON.stringify(logObject);
  })
);

// Configuração do diretório de logs
const LOG_DIR = process.env.LOG_DIR || 'logs';
const MAX_SIZE = process.env.LOG_MAX_SIZE || '10m';
const MAX_FILES = process.env.LOG_MAX_FILES || '7d';

// Criar diretório de logs se não existir
const fs = require('fs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// Transporte para rotação diária de arquivos
const dailyRotateTransport = new winston.transports.DailyRotateFile({
  dirname: LOG_DIR,
  filename: '%DATE%-app.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  format: logFormat,
  level: process.env.LOG_LEVEL || 'info'
});

// Transporte para logs de erro em arquivo separado
const errorRotateTransport = new winston.transports.DailyRotateFile({
  dirname: LOG_DIR,
  filename: '%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  format: logFormat,
  level: 'error'
});

// Transporte para console com formatação colorida
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.simple()
  ),
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Criar o logger
const logger = winston.createLogger({
  levels,
  format: logFormat,
  transports: [
    dailyRotateTransport,
    errorRotateTransport,
    consoleTransport
  ],
  exitOnError: false
});

// Handlers para eventos não capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { 
    error: error.message,
    stack: error.stack,
    type: 'UncaughtException'
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    type: 'UnhandledRejection'
  });
});

// Função auxiliar para logging de requisições HTTP
const httpLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });
  });

  next();
};

module.exports = {
  logger,
  httpLogger
};
