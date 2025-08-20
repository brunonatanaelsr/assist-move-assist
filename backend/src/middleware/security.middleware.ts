import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction, Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loggerService } from '../services/logger.service';

interface ValidationError {
    field: string;
    message: string;
    code: string;
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos'
});

// Validação de payload
export const validatePayload = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error } = schema.validate(req.body as any);
            if (error) {
                const validationError: ValidationError = {
                    field: error.details[0].context?.key || 'unknown',
                    message: error.details[0].message,
                    code: 'VALIDATION_ERROR'
                };
                return res.status(400).json({ error: validationError });
            }
            next();
        } catch (err) {
            loggerService.error('Erro na validação:', err);
            return res.status(500).json({ 
                error: {
                    message: 'Erro interno do servidor',
                    code: 'INTERNAL_SERVER_ERROR'
                }
            });
        }
    };
};

// Middleware de segurança
export function configureSecurityMiddleware(app: Application) {
    // Headers de segurança
    app.use(helmet());

    // Rate limiting
    app.use(limiter);

    // Parse JSON payloads
    app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded bodies
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logger
    app.use(requestLogger);
}

// Logger de requisições
export const requestLogger = (req: any, res: any, next: any) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        loggerService.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    next();
};
