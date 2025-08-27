import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import logger from '../config/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Schema de validação do token
const tokenSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  iat: z.number(),
  exp: z.number(),
});

export type JWTPayload = z.infer<typeof tokenSchema>;

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token não fornecido' 
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const validatedToken = tokenSchema.parse(decoded);
      
      // Adiciona o usuário decodificado à requisição
      req.user = validatedToken;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Token validation failed:', error.errors);
        return res.status(401).json({ 
          success: false, 
          message: 'Token inválido',
          errors: error.errors
        });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        logger.error('JWT verification failed:', error.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Token inválido ou expirado' 
        });
      }
      
      throw error;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Middleware para verificar permissões de admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso negado. Requer permissões de administrador.' 
    });
  }
  next();
};

// Função para gerar token JWT
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
