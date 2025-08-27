import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateSchema = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      next(new ValidationError('Erro de validação dos dados'));
    }
  };
};
