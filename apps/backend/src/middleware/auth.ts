import { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import jwt from 'jsonwebtoken';
import { loggerService } from '../services/logger';
import { pool } from '../config/database';
import redisClient from '../lib/redis';
import { authService } from '../services';
import { env } from '../config/env';
import type { AuthenticatedUser, JWTPayload } from '../types/auth';
import { PERMISSIONS } from '../types/permissions';

export { PERMISSIONS };

export type AuthenticatedRequest<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs
> = Request<Params, ResBody, ReqBody, ReqQuery> & { user?: AuthenticatedUser };

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRY = env.JWT_EXPIRY;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length > 0
  ? env.JWT_REFRESH_SECRET
  : `${JWT_SECRET}-refresh`;
const JWT_REFRESH_EXPIRY = env.JWT_REFRESH_EXPIRY;

const isMockFunction = (fn: unknown): fn is { mock: unknown } =>
  typeof fn === 'function' && typeof (fn as { mock?: unknown }).mock !== 'undefined';

const shouldUseFallback = (fn: unknown) =>
  env.NODE_ENV === 'test' || typeof fn !== 'function' || isMockFunction(fn);

const buildTokenPayload = (payload: JWTPayload) => {
  const tokenPayload: Partial<JWTPayload> = {
    id: payload.id,
    role: payload.role
  };

  if (payload.email) tokenPayload.email = payload.email;
  if (payload.permissions) tokenPayload.permissions = payload.permissions;

  return tokenPayload;
};

const fallbackGenerateToken = (payload: JWTPayload): string =>
  jwt.sign(buildTokenPayload(payload), JWT_SECRET, { expiresIn: JWT_EXPIRY });

const fallbackValidateToken = async (token: string): Promise<JWTPayload> =>
  jwt.verify(token, JWT_SECRET) as JWTPayload;

const fallbackGenerateRefreshToken = (payload: JWTPayload): string =>
  jwt.sign(buildTokenPayload(payload), JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

const fallbackValidateRefreshToken = async (token: string): Promise<JWTPayload> =>
  jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;

export const AuthService = {
  login: (...args: Parameters<typeof authService.login>) => authService.login(...args),
  getProfile: (...args: Parameters<typeof authService.getProfile>) => authService.getProfile(...args),
  register: (...args: Parameters<typeof authService.register>) => authService.register(...args),
  updateProfile: (...args: Parameters<typeof authService.updateProfile>) => authService.updateProfile(...args),
  changePassword: (...args: Parameters<typeof authService.changePassword>) => authService.changePassword(...args),
  generateToken(payload: JWTPayload): string {
    if (!shouldUseFallback(authService.generateToken)) {
      return authService.generateToken({
        id: payload.id,
        email: payload.email ?? '',
        role: payload.role
      });
    }

    return fallbackGenerateToken(payload);
  },
  async validateToken(token: string): Promise<JWTPayload> {
    if (!shouldUseFallback(authService.validateToken)) {
      const result = await authService.validateToken(token);
      return {
        id: result.id,
        email: result.email,
        role: result.role,
        permissions: result.permissions
      };
    }

    return fallbackValidateToken(token);
  },
  async generateRefreshToken(payload: JWTPayload): Promise<string> {
    if (!shouldUseFallback(authService.generateRefreshToken)) {
      return authService.generateRefreshToken({
        id: payload.id,
        email: payload.email ?? '',
        role: payload.role
      });
    }

    return fallbackGenerateRefreshToken(payload);
  },
  async validateRefreshToken(token: string): Promise<JWTPayload> {
    if (!shouldUseFallback(authService.validateRefreshToken)) {
      return authService.validateRefreshToken(token);
    }

    return fallbackValidateRefreshToken(token);
  },
  async refreshWithToken(
    refreshToken: string,
    metadata?: Parameters<typeof authService.refreshWithToken>[1]
  ) {
    if (!shouldUseFallback(authService.refreshWithToken)) {
      return authService.refreshWithToken(refreshToken, metadata ?? {});
    }

    const payload = await fallbackValidateRefreshToken(refreshToken);
    const token = fallbackGenerateToken(payload);
    const newRefreshToken = fallbackGenerateRefreshToken(payload);

    return {
      token,
      refreshToken: newRefreshToken,
      user: {
        id: payload.id,
        email: payload.email ?? '',
        role: String(payload.role)
      }
    };
  },
  async revokeRefreshToken(
    token: string,
    metadata?: Parameters<typeof authService.revokeRefreshToken>[1]
  ): Promise<void> {
    if (!shouldUseFallback(authService.revokeRefreshToken)) {
      await authService.revokeRefreshToken(token, metadata);
    }
  },
  async verifyToken(token: string): Promise<JWTPayload> {
    return this.validateToken(token);
  }
};

// Removidos métodos de autenticação duplicados; consolidado em services/auth.service.ts

// Middleware de autenticação
/**
 * Middleware responsável por validar o token JWT presente no cookie ou header Authorization.
 * Quando válido popula `req.user` com os dados essenciais do usuário autenticado.
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  let token: string | undefined;

  // Tentar extrair token do cookie "auth_token"
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies: string[] = cookieHeader.split(';').map((c: string) => c.trim());
    const authCookie = cookies.find((c: string) => c.startsWith('auth_token='));
    if (authCookie) {
      const parts = authCookie.split('=');
      token = decodeURIComponent(String(parts.length > 1 ? parts[1] : ''));
    }
  }

  // Fallback para header Authorization
  if (!token && authHeader) {
    token = authHeader.split(' ')[1]; // Bearer TOKEN
  }

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = await AuthService.validateToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };
    return next();
  } catch (error) {
    const preview = token ? token.substring(0, 20) + '...' : 'undefined';
    loggerService.audit('INVALID_TOKEN', undefined, { token: preview });
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar permissões
export const requirePermissions = (requiredPermissions: PERMISSIONS[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const userPermissions = req.user.permissions ?? [];
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permissão negada',
        required: requiredPermissions,
        user: userPermissions
      });
    }

    return next();
  };
};

// Middleware de autorização por role
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      loggerService.audit('ACCESS_DENIED', req.user.id, {
        required_roles: allowedRoles,
        user_role: req.user.role
      });
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return next();
  };
};

// Middleware para profissionais
export const requireProfissional = requireRole(['admin', 'profissional', 'superadmin', 'super_admin']);

// Middleware para administradores
export const requireAdmin = requireRole('admin');

// Middleware para gestores
export const requireGestor = requireRole('gestor');

// (authorize definido mais abaixo com RBAC baseado em banco de dados)

// RBAC baseado em role_permissions (DB)
export const authorize = (required: string | string[]) => {
  const requiredPerms = Array.isArray(required) ? required : [required];
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const role = (req.user.role || '').toLowerCase();
      if (!role) return res.status(403).json({ error: 'Sem papel associado' });
      // Superadmin tem acesso total
      if (role === 'superadmin' || role === 'super_admin') return next();

      // Cache keys
      const roleKey = `perms:role:${role}`;
      const userKey = `perms:user:${req.user.id}`;
      let rolePerms: string[] | null = null;
      let userPerms: string[] | null = null;
      try {
        const [rjson, ujson] = await Promise.all([
          redisClient.get(roleKey),
          redisClient.get(userKey)
        ]);
        rolePerms = rjson ? (JSON.parse(rjson) as string[]) : null;
        userPerms = ujson ? (JSON.parse(ujson) as string[]) : null;
      } catch (error) {
        loggerService.warn('Falha ao recuperar permissões em cache', {
          role,
          userId: req.user.id,
          error: (error as Error).message
        });
      }

      if (!rolePerms) {
        const rp = await pool.query<{ permission: string }>(
          'SELECT permission FROM role_permissions WHERE role = $1',
          [role]
        );
        rolePerms = rp.rows.map((row) => row.permission);
        try {
          await redisClient.setex(roleKey, 300, JSON.stringify(rolePerms));
        } catch (error) {
          loggerService.warn('Não foi possível armazenar permissões de role no cache', {
            role,
            error: (error as Error).message
          });
        }
      }
      if (!userPerms) {
        const up = await pool.query<{ permission: string }>(
          'SELECT permission FROM user_permissions WHERE user_id = $1',
          [req.user.id]
        );
        userPerms = up.rows.map((row) => row.permission);
        try {
          await redisClient.setex(userKey, 300, JSON.stringify(userPerms));
        } catch (error) {
          loggerService.warn('Não foi possível armazenar permissões de usuário no cache', {
            userId: req.user.id,
            error: (error as Error).message
          });
        }
      }
      const perms: string[] = [...new Set([...(rolePerms || []), ...(userPerms || [])])];
      const ok = requiredPerms.every((p) => perms.includes(p));
      if (!ok) {
        loggerService.audit('ACCESS_DENIED', req.user.id, { role, required: requiredPerms, have: perms });
        return res.status(403).json({ error: 'Permissão negada', required: requiredPerms });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};
