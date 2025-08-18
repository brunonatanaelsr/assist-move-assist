export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
    // Aqui poderia integrar com um serviço de logging como Sentry
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
  
  api: {
    request: (method: string, url: string, data?: any) => {
      logger.debug(`API Request: ${method} ${url}`, data);
    },
    
    response: (method: string, url: string, status: number, data?: any) => {
      logger.debug(`API Response: ${method} ${url} [${status}]`, data);
    },
    
    error: (method: string, url: string, error: any) => {
      logger.error(`API Error: ${method} ${url}`, error);
    }
  }
};
