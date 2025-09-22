import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { z } from 'zod';

interface CustomRequest extends ExpressRequest {
  body: any;
  query: any;
  params: any;
}

export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      // Validar corpo da requisição, parâmetros e query strings
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      return next();
    } catch (error) {
      // Se houver erro de validação, retornar erro 400
      const zerr = error as z.ZodError;
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: zerr.issues,
      });
    }
  };
};
