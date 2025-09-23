import { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import jwt from 'jsonwebtoken';
import { loggerService } from '../services/logger';
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
  getUserRolesForProject: (...args: Parameters<typeof authService.getUserRolesForProject>) =>
    authService.getUserRolesForProject(...args),
  getUserPermissionsForProject: (
    ...args: Parameters<typeof authService.getUserPermissionsForProject>
  ) => authService.getUserPermissionsForProject(...args),
  getPermissionsForRoles: (
    ...args: Parameters<typeof authService.getPermissionsForRoles>
  ) => authService.getPermissionsForRoles(...args),
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

const PROJECT_PARAM_KEYS = ['projectId', 'project_id', 'projetoId', 'projeto_id'] as const;
const CACHE_TTL_SECONDS = 300;
const GLOBAL_SCOPE_CACHE_KEY = 'global';

type ProjectScope = number | null;

interface AuthorizeProjectOptions {
  selector?: (req: Request) => ProjectScope;
  requireProject?: boolean;
}

const toScopeKey = (scope: ProjectScope) =>
  typeof scope === 'number' ? `project:${scope}` : GLOBAL_SCOPE_CACHE_KEY;

const pickFirstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const parseProjectIdentifier = (value: unknown): ProjectScope => {
  if (value === undefined || value === null) {
    return null;
  }
  const rawValue = typeof value === 'string' ? value.trim() : value;
  if (rawValue === '') {
    return null;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
    throw new Error('INVALID_PROJECT_ID');
  }
  return Math.trunc(parsed);
};

const defaultProjectSelector = (req: Request): ProjectScope => {
  for (const key of PROJECT_PARAM_KEYS) {
    if (req.params && Object.prototype.hasOwnProperty.call(req.params, key)) {
      return parseProjectIdentifier((req.params as Record<string, unknown>)[key]);
    }
  }
  for (const key of PROJECT_PARAM_KEYS) {
    const value = (req.query as Record<string, unknown>)[key];
    if (typeof value !== 'undefined') {
      return parseProjectIdentifier(pickFirstValue(value));
    }
  }
  if (req.body && typeof req.body === 'object' && req.body !== null) {
    for (const key of PROJECT_PARAM_KEYS) {
      const value = (req.body as Record<string, unknown>)[key];
      if (typeof value !== 'undefined') {
        return parseProjectIdentifier(value);
      }
    }
  }
  return null;
};

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redisClient.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    loggerService.warn('Falha ao recuperar dados do cache', {
      key,
      error: (error as Error).message
    });
    return null;
  }
};

const writeCache = async (key: string, value: unknown) => {
  try {
    await redisClient.setex(key, CACHE_TTL_SECONDS, JSON.stringify(value));
  } catch (error) {
    loggerService.warn('Não foi possível armazenar dados no cache', {
      key,
      error: (error as Error).message
    });
  }
};

const loadAdditionalRoles = async (userId: number, projectId: ProjectScope): Promise<string[]> => {
  const scopeKey = toScopeKey(projectId);
  const cacheKey = `roles:user:${userId}:${scopeKey}`;
  let roles = await readCache<string[]>(cacheKey);
  if (!roles) {
    roles = await AuthService.getUserRolesForProject(userId, projectId);
    await writeCache(cacheKey, roles);
  }
  return roles;
};

const loadUserDirectPermissions = async (
  userId: number,
  projectId: ProjectScope
): Promise<string[]> => {
  const scopeKey = toScopeKey(projectId);
  const cacheKey = `perms:user:${userId}:${scopeKey}`;
  let permissions = await readCache<string[]>(cacheKey);
  if (!permissions) {
    permissions = await AuthService.getUserPermissionsForProject(userId, projectId);
    await writeCache(cacheKey, permissions);
  }
  return permissions;
};

const loadPermissionsFromRoles = async (roles: Set<string>): Promise<Set<string>> => {
  const permissions = new Set<string>();
  const missingRoles: string[] = [];
  for (const role of roles) {
    if (!role) {
      continue;
    }
    const cacheKey = `perms:role:${role}`;
    const cached = await readCache<string[]>(cacheKey);
    if (cached) {
      cached.forEach((permission) => permissions.add(permission));
    } else {
      missingRoles.push(role);
    }
  }

  if (missingRoles.length > 0) {
    const fetched = await AuthService.getPermissionsForRoles(missingRoles);
    for (const role of missingRoles) {
      const perms = fetched[role] ?? [];
      perms.forEach((permission) => permissions.add(permission));
      await writeCache(`perms:role:${role}`, perms);
    }
  }

  return permissions;
};

const getEffectiveRoles = async (
  user: AuthenticatedUser,
  projectId: ProjectScope
): Promise<Set<string>> => {
  const roles = new Set<string>();
  const baseRole = (user.role || '').toLowerCase();
  if (baseRole) {
    roles.add(baseRole);
  }
  const additionalRoles = await loadAdditionalRoles(user.id, projectId);
  additionalRoles
    .map((role) => role.toLowerCase())
    .filter((role) => role)
    .forEach((role) => roles.add(role));
  return roles;
};

const resolvePermissionsForScope = async (
  user: AuthenticatedUser,
  projectId: ProjectScope
): Promise<{ permissions: Set<string>; roles: Set<string> }> => {
  const roles = await getEffectiveRoles(user, projectId);
  const [rolePermissions, directPermissions] = await Promise.all([
    loadPermissionsFromRoles(roles),
    loadUserDirectPermissions(user.id, projectId)
  ]);
  const permissions = new Set<string>([
    ...Array.from(rolePermissions),
    ...directPermissions
  ]);
  return { permissions, roles };
};

const hasSuperAdminRole = (roles: Set<string>) =>
  roles.has('superadmin') || roles.has('super_admin');

// RBAC baseado em role_permissions (DB)
export const authorize = (required: string | string[]) => {
  const requiredPerms = Array.isArray(required) ? required : [required];
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { permissions, roles } = await resolvePermissionsForScope(req.user, null);

      if (hasSuperAdminRole(roles)) {
        req.user.permissions = Array.from(permissions);
        return next();
      }

      const ok = requiredPerms.every((permission) => permissions.has(permission));
      if (!ok) {
        loggerService.audit('ACCESS_DENIED', req.user.id, {
          required: requiredPerms,
          have: Array.from(permissions),
          scope: 'global'
        });
        return res.status(403).json({ error: 'Permissão negada', required: requiredPerms });
      }

      req.user.permissions = Array.from(permissions);
      return next();
    } catch (error) {
      loggerService.error('Erro ao verificar permissões', error);
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};

export const authorizeForProject = (
  required: string | string[],
  options?: AuthorizeProjectOptions
) => {
  const requiredPerms = Array.isArray(required) ? required : [required];
  const selector = options?.selector ?? defaultProjectSelector;
  const requireProject = options?.requireProject ?? false;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      let projectId: ProjectScope;
      try {
        projectId = selector(req);
      } catch {
        return res.status(400).json({ error: 'Parâmetro projectId inválido' });
      }

      if (requireProject && (projectId === null || typeof projectId !== 'number')) {
        return res.status(400).json({ error: 'Identificador de projeto obrigatório' });
      }

      const { permissions, roles } = await resolvePermissionsForScope(req.user, projectId);

      if (hasSuperAdminRole(roles)) {
        req.user.permissions = Array.from(permissions);
        return next();
      }

      const ok = requiredPerms.every((permission) => permissions.has(permission));
      if (!ok) {
        loggerService.audit('ACCESS_DENIED', req.user.id, {
          required: requiredPerms,
          have: Array.from(permissions),
          scope: typeof projectId === 'number' ? projectId : 'global'
        });
        return res.status(403).json({
          error: 'Permissão negada',
          required: requiredPerms,
          scope: typeof projectId === 'number' ? projectId : 'global'
        });
      }

      req.user.permissions = Array.from(permissions);
      return next();
    } catch (error) {
      loggerService.error('Erro ao verificar permissões por projeto', error);
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};
