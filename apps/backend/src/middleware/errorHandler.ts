import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { loggerService } from '../services/logger';

interface Request extends ExpressRequest {
  path: string;
  method: string;
}

interface Response extends ExpressResponse {
  status(code: number): this;
  json(body: any): this;
}

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
