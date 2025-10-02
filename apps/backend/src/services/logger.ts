import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

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

type LoggerContextStore = {
  context?: string;
};

export const loggerContextStorage = new AsyncLocalStorage<LoggerContextStore>();

const getCurrentContext = () => loggerContextStorage.getStore()?.context;

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  exitOnError: false,
});

const mergeContext = (meta?: any) => {
  const currentContext = getCurrentContext();
  const contextMeta = currentContext ? { context: currentContext } : undefined;

  if (!contextMeta) {
    return meta;
  }

  if (meta === undefined) {
    return contextMeta;
  }

  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return {
      ...meta,
      ...contextMeta
    };
  }

  return {
    payload: meta,
    ...contextMeta
  };
};

const logWithContext = (level: keyof winston.Logger, message: string, meta?: any) => {
  const mergedMeta = mergeContext(meta);

  if (mergedMeta !== undefined) {
    (logger[level] as winston.LeveledLogMethod)(message, mergedMeta);
    return;
  }

  (logger[level] as winston.LeveledLogMethod)(message);
};

export const setContext = (context?: string) => {
  const store = loggerContextStorage.getStore();

  if (!store) {
    throw new Error('Logger context storage was not initialized for this execution context.');
  }

  if (context === undefined) {
    delete store.context;
    return;
  }

  store.context = context;
};

export const getContext = () => getCurrentContext();

export const runWithLoggerContext = <T>(
  callback: () => T,
  initialStore: LoggerContextStore = {}
) => loggerContextStorage.run(initialStore, callback);

// Helper functions para diferentes níveis de log
export const loggerService = {
  setContext,
  getContext,
  error: (message: string, meta?: any) => {
    logWithContext('error', message, meta);
  },

  warn: (message: string, meta?: any) => {
    logWithContext('warn', message, meta);
  },

  info: (message: string, meta?: any) => {
    logWithContext('info', message, meta);
  },

  debug: (message: string, meta?: any) => {
    logWithContext('debug', message, meta);
  },

  // Log para auditoria
  audit: (action: string, userId?: string | number, details?: Record<string, unknown>) => {
    logWithContext('info', 'AUDIT', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // Log para performance
  performance: (operation: string, duration: number, meta?: any) => {
    logWithContext('info', 'PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      ...meta
    });
  },

  // Log para requests HTTP
  request: (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
    logWithContext('info', 'HTTP_REQUEST', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userId
    });
  }
};

export const loggerContextMiddleware = (_req: any, _res: any, next: any) => {
  runWithLoggerContext(() => {
    next();
  });
};

// Middleware para logs de requisições
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logWithContext('info', 'HTTP Request', {
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
  logWithContext('error', 'Application Error', {
    message: error.message,
    stack: error.stack,
    context
  });
};

// Função para log de ações de usuário
export const logUserAction = (userId: string, action: string, details?: any) => {
  logWithContext('info', 'User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

export const errorWithStack = (
  error: Error,
  message?: string,
  meta?: Record<string, unknown>
) => {
  const metaWithStack: Record<string, unknown> = {
    ...meta,
    errorMessage: error.message,
    stack: error.stack
  };

  loggerService.error(message ?? error.message, metaWithStack);
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
