// Logger simples para evitar erros
export interface LogContext {
  userId?: string;
  page?: string;
  action?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private isDevelopment = true; // Sempre true para evitar erros

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error, context);
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context);
  }

  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`, context);
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
}

export const logger = new Logger();
