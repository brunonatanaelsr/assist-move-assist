import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config/logger';

interface ExtendedRequest extends Request {
    body: Record<string, any>;
    query: Record<string, any>;
    params: Record<string, any>;
    path: string;
}

interface TypedResponse extends Response {
    status(code: number): this;
    json(data: any): this;
}

export const validateRequest = (schema: z.ZodTypeAny) => {
    return async (req: ExtendedRequest, res: TypedResponse, next: NextFunction): Promise<void> => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                logger.warn('Validation error:', {
                    path: req.path,
                    errors: err.issues
                });
                
                res.status(400).json({
                    success: false,
                    message: 'Erro de validação',
                    errors: err.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message
                    }))
                });
                return;
            }
            
            logger.error('Unexpected validation error:', err as any);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
            return;
        }
    };
};
