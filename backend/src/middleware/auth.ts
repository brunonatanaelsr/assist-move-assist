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

    const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map((role) => role.toLowerCase());
    const currentRole = (req.user.role || '').toLowerCase();

    if (!allowedRoles.includes(currentRole)) {
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
export const requireProfissional = requireRole([
  'admin',
  'profissional',
  'tecnica_referencia',
  'educadora_social',
  'superadmin',
  'super_admin'
]);

// Middleware para administradores
export const requireAdmin = requireRole('admin');

// Middleware para gestores
export const requireGestor = requireRole([
  'gestor',
  'coordenacao',
  'tecnica_referencia',
  'admin',
  'superadmin',
  'super_admin'
]);

type ScopeType = 'project' | 'oficina';

interface ScopeOptions {
  type: ScopeType;
  param?: string;
  extractor?: (req: Request) => string | number | null | undefined;
  optional?: boolean;
}

interface AuthorizeOptions {
  scope?: ScopeOptions;
}

const getScopeIdentifier = (req: Request, scope?: ScopeOptions): { type: ScopeType; id: number } | null => {
  if (!scope) {
    return null;
  }

  let raw: string | number | null | undefined;
  if (scope.extractor) {
    raw = scope.extractor(req);
  } else if (scope.param) {
    const paramName = scope.param;
    const readValue = (source?: Record<string, unknown>) => {
      if (!source) {
        return undefined;
      }
      return source[paramName] as string | number | null | undefined;
    };
    raw =
      readValue(req.params as Record<string, unknown>) ??
      readValue(req.body as Record<string, unknown> | undefined) ??
      readValue(req.query as Record<string, unknown>);
  }

  if (raw === undefined || raw === null || raw === '') {
    if (scope.optional) {
      return null;
    }
    throw Object.assign(new Error('Escopo obrigatório não informado'), { status: 400 });
  }

  const id = Number(raw);
  if (!Number.isFinite(id) || Number.isNaN(id)) {
    throw Object.assign(new Error('Identificador de escopo inválido'), { status: 400 });
  }

  return { type: scope.type, id };
};

const loadRolePermissions = async (role: string): Promise<string[]> => {
  const normalized = role.toLowerCase();
  const cacheKey = `perms:role:${normalized}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }
  } catch (error) {
    loggerService.warn('Falha ao buscar permissões de role em cache', {
      role: normalized,
      error: (error as Error).message
    });
  }

  const result = await pool.query<{ permission: string }>(
    'SELECT permission FROM role_permissions WHERE role = $1',
    [normalized]
  );
  const permissions = result.rows.map((row) => row.permission);

  try {
    await redisClient.setex(cacheKey, 300, JSON.stringify(permissions));
  } catch (error) {
    loggerService.warn('Não foi possível armazenar permissões de role no cache', {
      role: normalized,
      error: (error as Error).message
    });
  }

  return permissions;
};

const loadUserPermissions = async (
  userId: number,
  scope?: { type: ScopeType; id: number }
): Promise<string[]> => {
  const cacheKey = scope
    ? `perms:user:${userId}:${scope.type}:${scope.id}`
    : `perms:user:${userId}:global`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }
  } catch (error) {
    loggerService.warn('Falha ao buscar permissões de usuário em cache', {
      userId,
      scope,
      error: (error as Error).message
    });
  }

  let queryText = 'SELECT permission FROM user_permissions WHERE user_id = $1 AND projeto_id IS NULL AND oficina_id IS NULL';
  const params: Array<string | number> = [userId];

  if (scope) {
    if (scope.type === 'project') {
      queryText = 'SELECT permission FROM user_permissions WHERE user_id = $1 AND projeto_id = $2';
    } else {
      queryText = 'SELECT permission FROM user_permissions WHERE user_id = $1 AND oficina_id = $2';
    }
    params.push(scope.id);
  }

  const result = await pool.query<{ permission: string }>(queryText, params);
  const permissions = result.rows.map((row) => row.permission);

  try {
    await redisClient.setex(cacheKey, 300, JSON.stringify(permissions));
  } catch (error) {
    loggerService.warn('Não foi possível armazenar permissões de usuário no cache', {
      userId,
      scope,
      error: (error as Error).message
    });
  }

  return permissions;
};

// RBAC baseado em role_permissions (DB) com suporte a escopos
export const authorize = (required: string | string[], options?: AuthorizeOptions) => {
  const requiredPerms = Array.isArray(required) ? required : [required];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const baseRole = (req.user.role || '').toLowerCase();
      if (!baseRole) {
        return res.status(403).json({ error: 'Sem papel associado' });
      }

      if (baseRole === 'superadmin' || baseRole === 'super_admin') {
        return next();
      }

      let scopeInfo: { type: ScopeType; id: number } | null = null;
      try {
        scopeInfo = getScopeIdentifier(req, options?.scope);
      } catch (error) {
        const err = error as Error & { status?: number };
        const status = err.status ?? 400;
        return res.status(status).json({ error: err.message });
      }

      const roles = new Set<string>([baseRole]);
      if (scopeInfo) {
        const scopeQuery =
          scopeInfo.type === 'project'
            ? 'SELECT role FROM user_role_scopes WHERE user_id = $1 AND projeto_id = $2'
            : 'SELECT role FROM user_role_scopes WHERE user_id = $1 AND oficina_id = $2';
        const scopedRoles = await pool.query<{ role: string }>(scopeQuery, [req.user.id, scopeInfo.id]);
        scopedRoles.rows.forEach((row) => roles.add((row.role || '').toLowerCase()));
      }

      const permissions = new Set<string>();

      const roleList = Array.from(roles).filter(Boolean);
      const rolePermissions = await Promise.all(roleList.map((role) => loadRolePermissions(role)));
      rolePermissions.forEach((rolePerm) => rolePerm.forEach((perm) => permissions.add(perm)));

      const globalUserPerms = await loadUserPermissions(req.user.id);
      globalUserPerms.forEach((perm) => permissions.add(perm));

      if (scopeInfo) {
        const scopedUserPerms = await loadUserPermissions(req.user.id, scopeInfo);
        scopedUserPerms.forEach((perm) => permissions.add(perm));
      }

      const hasAll = requiredPerms.every((permission) => permissions.has(permission));
      if (!hasAll) {
        loggerService.audit('ACCESS_DENIED', req.user.id, {
          role: baseRole,
          required: requiredPerms,
          have: Array.from(permissions),
          scope: scopeInfo ?? undefined
        });
        return res.status(403).json({ error: 'Permissão negada', required: requiredPerms });
      }

      return next();
    } catch (error) {
      loggerService.error('Erro ao verificar permissões', error);
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};
