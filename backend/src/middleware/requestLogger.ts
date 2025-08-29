import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { loggerService } from '../services/logger.service';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, path, ip, headers } = req;

  // Processar a resposta
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    loggerService.info('Request log', {
      timestamp: new Date().toISOString(),
      method,
      path,
      statusCode,
      duration,
      ip,
      userAgent: headers['user-agent']
    });

    // Se configurado, salvar no banco
    if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
      const pool = req.app.locals.pool as Pool;
      
      pool.query(
        `INSERT INTO request_logs (
          method, path, status_code, duration_ms,
          ip_address, user_agent, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [method, path, statusCode, duration, ip, headers['user-agent']]
      ).catch(err => {
        loggerService.error('Error saving request log', { error: err });
      });
    }
  });

  next();
};
