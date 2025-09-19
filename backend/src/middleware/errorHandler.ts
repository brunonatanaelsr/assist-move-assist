import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { loggerService } from '../services/logger';

export const catchAsync = <Req extends Request = Request, Res extends Response = Response>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as Req, res as Res, next)).catch(next);
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const traceId = randomUUID();
  const statusCode = err.status || err.statusCode || 500;

  loggerService.error(err.message || 'Unexpected error', {
    traceId,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const message = statusCode >= 500 ? 'Erro interno do servidor' : err.message;

  res.status(statusCode).json({
    error: message,
    traceId,
  });
};
