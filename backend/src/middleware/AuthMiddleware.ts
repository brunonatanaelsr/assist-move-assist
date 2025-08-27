import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { AuthenticationError } from '../utils/errors';
import { logger } from '../config/logger';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user?: JWTPayload;
}

export class AuthMiddleware {
  constructor(
    private pool: Pool,
    private JWT_SECRET = process.env.JWT_SECRET!
  ) {}

  authenticate = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Verificar token do cookie
      const token = req.cookies.token;

      if (!token) {
        throw new AuthenticationError('Token não fornecido');
      }

      // Verificar JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      // Verificar se usuário ainda existe e está ativo
      const result = await this.pool.query(
        'SELECT active FROM auth.users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].active) {
        throw new AuthenticationError('Usuário não encontrado ou inativo');
      }

      // Adicionar usuário ao request
      req.user = decoded;

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: 'Token inválido' });
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Token expirado' });
        return;
      }

      logger.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Erro de autenticação' });
    }
  };

  // Middleware para verificar papéis
  checkRole = (roles: string[]) => {
    return (req: RequestWithUser, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Usuário não autenticado');
        }

        if (!roles.includes(req.user.role)) {
          res.status(403).json({
            error: 'Acesso negado: permissões insuficientes'
          });
          return;
        }

        next();
      } catch (error) {
        logger.error('Role check error:', error);
        res.status(403).json({ error: 'Erro ao verificar permissões' });
      }
    };
  };

  // Middleware para rate limiting baseado em Redis
  rateLimit = (
    redis: any,
    options = {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100 // limite por IP
    }
  ) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `rate_limit:${req.ip}`;
      
      try {
        const requests = await redis.incr(key);
        
        if (requests === 1) {
          await redis.expire(key, options.windowMs / 1000);
        }

        if (requests > options.max) {
          res.status(429).json({
            error: 'Muitas requisições, tente novamente mais tarde'
          });
          return;
        }

        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requests));

        next();
      } catch (error) {
        logger.error('Rate limit error:', error);
        // Em caso de erro no Redis, permite a requisição
        next();
      }
    };
  };
}
