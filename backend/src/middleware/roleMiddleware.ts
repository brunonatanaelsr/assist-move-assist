import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../utils/errors';

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      throw new AuthenticationError('Usuário não autenticado');
    }

    if (role === 'admin' && userRole !== 'admin') {
      throw new AuthenticationError('Acesso negado - requer permissão de administrador');
    }

    next();
  };
}
