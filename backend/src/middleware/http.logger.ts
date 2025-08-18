import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/logger.service';

export function httpLogger(req: Request, res: Response, next: NextFunction) {
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
