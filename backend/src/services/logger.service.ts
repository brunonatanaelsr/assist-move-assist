import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Níveis de log customizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Cores para diferentes níveis
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adicionar cores ao Winston
winston.addColors(colors);

// Formato base para todos os logs
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para console (desenvolvimento)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Configuração de transporte para arquivos
const fileTransport = new DailyRotateFile({
  dirname: path.join(__dirname, '../../logs'),
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: baseFormat,
});

// Configuração de transporte para erros
const errorFileTransport = new DailyRotateFile({
  dirname: path.join(__dirname, '../../logs'),
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: baseFormat,
});

// Configuração de transporte para auditoria
const auditFileTransport = new DailyRotateFile({
  dirname: path.join(__dirname, '../../logs'),
  filename: 'audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '365d',
  format: baseFormat,
});

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    fileTransport,
    errorFileTransport,
  ],
});

// Criar logger de auditoria separado
const auditLogger = winston.createLogger({
  level: 'info',
  transports: [auditFileTransport],
});

// Adicionar console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

class LoggerService {
  private context: string = 'App';

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(message: string) {
    return `[${this.context}] ${message}`;
  }

  error(message: string, meta?: any) {
    logger.error(this.formatMessage(message), meta);
  }

  warn(message: string, meta?: any) {
    logger.warn(this.formatMessage(message), meta);
  }

  info(message: string, meta?: any) {
    logger.info(this.formatMessage(message), meta);
  }

  debug(message: string, meta?: any) {
    logger.debug(this.formatMessage(message), meta);
  }

  http(message: string, meta?: any) {
    logger.http(this.formatMessage(message), meta);
  }

  // Log de auditoria para ações importantes
  audit(action: string, userId: number, details: any) {
    auditLogger.info({
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent
    });
  }

  // Log de performance
  performance(operation: string, duration: number, meta?: any) {
    logger.info(this.formatMessage(`Performance: ${operation}`), {
      ...meta,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  // Log de segurança
  security(event: string, meta?: any) {
    logger.warn(this.formatMessage(`Security: ${event}`), {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  // Log de erro com stack trace completo
  errorWithStack(error: Error, context?: string) {
    logger.error(this.formatMessage('Error occurred'), {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}

export const loggerService = new LoggerService();
