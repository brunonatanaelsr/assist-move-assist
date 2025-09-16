/**
 * Logger utilitário que só executa em desenvolvimento
 * ou quando explicitamente habilitado
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isVerboseEnabled = process.env.VITE_VERBOSE_LOGGING === 'true';

interface LogLevel {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export const logger: LogLevel = {
  log: (...args: unknown[]) => {
    if (isDevelopment || isVerboseEnabled) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment || isVerboseEnabled) {
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Sempre log errors, mesmo em produção
    console.error(...args);
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment || isVerboseEnabled) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Re-export para facilitar migração
export const { log, warn, error, info, debug } = logger;

export default logger;