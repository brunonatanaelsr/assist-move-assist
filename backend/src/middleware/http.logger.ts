import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { loggerService } from '../services/logger.service';

interface Request extends ExpressRequest {
  method: string;
  originalUrl: string;
  ip: string;
  get(name: string): string | undefined;
}

interface Response extends ExpressResponse {
  statusCode: number;
  on(event: string, listener: () => void): this;
}

type Next = (error?: any) => void;

export function httpLogger(req: Request, res: Response, next: Next) {
  const start = Date.now();

  // Log ao receber a requisição
  loggerService.setContext('HTTP');
  loggerService.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log ao finalizar a requisição
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    loggerService[logLevel](`${req.method} ${req.originalUrl} completed`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log de performance se a requisição demorar mais que 1 segundo
    if (duration > 1000) {
      loggerService.performance(`Slow request: ${req.method} ${req.originalUrl}`, duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}
