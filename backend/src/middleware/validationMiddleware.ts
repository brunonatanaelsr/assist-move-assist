import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, type ZodIssue } from 'zod';
import { logger } from '../services/logger';

type RequestShape = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

/**
 * Middleware genérico responsável por validar body, params e query string de uma rota utilizando Zod.
 * Em caso de falha a requisição é interrompida retornando 400 com o detalhamento dos erros encontrados.
 * @param schema Esquema Zod que descreve o formato esperado da requisição.
 */
export const validateRequest = (schema: z.ZodType<RequestShape>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const validationResult = await schema.safeParseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!validationResult.success) {
      const { issues } = validationResult.error;
      logValidationError(req, issues);
      res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
      return;
    }

    next();
  };
};

const logValidationError = (req: Request, issues: ZodIssue[]): void => {
  logger.warn('Validation error:', {
    path: req.path,
    errors: issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }))
  });
};
