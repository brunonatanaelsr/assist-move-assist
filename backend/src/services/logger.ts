import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Configuração de formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Diretório de logs e transportes
const logDir = process.env.LOG_DIR || 'logs';

const transports: winston.transport[] = [
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: customFormat
  }),
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    )
  })
];

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  exitOnError: false,
});

// Helper functions para diferentes níveis de log
export const loggerService = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
  
  // Log para auditoria
  audit: (action: string, userId?: string, details?: any) => {
    logger.info('AUDIT', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  // Log para performance
  performance: (operation: string, duration: number, meta?: any) => {
    logger.info('PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      ...meta
    });
  },
  
  // Log para requests HTTP
  request: (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
    logger.info('HTTP_REQUEST', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId
    });
  }
};

// Middleware para logs de requisições
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
};

// Função para log de erros com contexto
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context
  });
};

// Função para log de ações de usuário
export const logUserAction = (userId: string, action: string, details?: any) => {
  logger.info('User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

// Substituir console.log em produção para manter logs estruturados
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.info = (...args) => logger.info(args.join(' '));
}

export { logger };
export default logger;
