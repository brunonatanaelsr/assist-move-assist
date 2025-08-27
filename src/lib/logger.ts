// Serviço centralizado de logging e monitoramento
export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogContext {
  userId?: string;
  page?: string;
  action?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private apiUrl = import.meta.env.VITE_API_URL;

  private async sendToMonitoring(
    level: keyof LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
  ) {
    // Em produção, enviar para serviço de monitoramento (Sentry, LogRocket, etc.)
    if (!this.isDevelopment && this.apiUrl) {
      try {
        const logData = {
          level,
          message,
          timestamp: new Date().toISOString(),
          context: {
            ...context,
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
        };

        // Aqui seria integração com Sentry ou outro serviço
        console.log('📊 Log enviado para monitoramento:', logData);
        
        // Alternativa: enviar para endpoint próprio de logs
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(logData)
        // });
      } catch (err) {
        console.error('Erro ao enviar log para monitoramento:', err);
      }
    }
  }

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(`🚨 [ERROR] ${message}`, error);
    this.sendToMonitoring('ERROR', message, context, error);
  }

  warn(message: string, context?: LogContext) {
    console.warn(`⚠️ [WARN] ${message}`);
    this.sendToMonitoring('WARN', message, context);
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`);
    }
    this.sendToMonitoring('INFO', message, context);
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.debug(`🐛 [DEBUG] ${message}`, data);
    }
  }

  // Método específico para rastrear ações do usuário
  trackUserAction(action: string, details?: Record<string, any>) {
    this.info(`Ação do usuário: ${action}`, {
      action,
      page: window.location.pathname,
      ...details
    });
  }

  // Método para rastrear performance
  trackPerformance(name: string, duration: number) {
    this.info(`Performance: ${name} levou ${duration}ms`);
  }
}

export const logger = new Logger();

// Hook personalizado para facilitar uso nos componentes
export const useLogger = () => {
  const logWithContext = (level: keyof LogLevel, message: string, error?: unknown) => {
    const context: LogContext = {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    };

    switch (level) {
      case 'ERROR':
        logger.error(message, error, context);
        break;
      case 'WARN':
        logger.warn(message, context);
        break;
      case 'INFO':
        logger.info(message, context);
        break;
      default:
        logger.debug(message, error);
    }
  };

  return {
    logError: (message: string, error?: unknown) => logWithContext('ERROR', message, error),
    logWarn: (message: string) => logWithContext('WARN', message),
    logInfo: (message: string) => logWithContext('INFO', message),
    trackAction: logger.trackUserAction.bind(logger),
    trackPerformance: logger.trackPerformance.bind(logger),
  };
};
