// Estendendo os tipos do Express
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

declare module 'express' {
  interface Request extends ExpressRequest {
    user?: {
      id: number;
      // Adicione outros campos do usuário conforme necessário
    };
  }

  interface Response extends ExpressResponse {}
}

// Re-exportando os tipos
export type { Request, Response, NextFunction } from 'express';
