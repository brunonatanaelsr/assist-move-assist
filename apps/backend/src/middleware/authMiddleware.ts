import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logger } from '../services/logger';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido em produção');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';

// Schema de validação do token
const tokenSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  iat: z.number(),
  exp: z.number(),
});

export type JWTPayload = z.infer<typeof tokenSchema>;

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const validatedToken = tokenSchema.parse(decoded);
      
      // Adiciona o usuário decodificado à requisição
      req.user = validatedToken;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Token validation failed:', error.issues);
        res.status(401).json({ 
          success: false, 
          message: 'Token inválido',
          errors: error.issues
        });
        return;
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('JWT verification failed:', error.message);
        res.status(401).json({ 
          success: false, 
          message: 'Token inválido ou expirado' 
        });
        return;
      }
      
      throw error;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error as any);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
    return;
  }
};

// Middleware para verificar permissões de admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ 
      success: false, 
      message: 'Acesso negado. Requer permissões de administrador.' 
    });
    return;
  }
  next();
};

// Função para gerar token JWT
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
