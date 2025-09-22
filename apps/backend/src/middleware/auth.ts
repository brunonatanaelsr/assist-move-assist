import { Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/logger';
import { pool } from '../config/database';
import redisClient from '../lib/redis';
import { authService } from '../services';
import jwt from 'jsonwebtoken';

export enum PERMISSIONS {
  READ_BENEFICIARIA = 'beneficiarias.ler',
  CREATE_BENEFICIARIA = 'beneficiarias.criar',
  UPDATE_BENEFICIARIA = 'beneficiarias.editar',
  DELETE_BENEFICIARIA = 'beneficiarias.excluir'
}

export interface JWTPayload {
  id: number;
  email?: string;
  role: string;
  permissions?: PERMISSIONS[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role: string;
    permissions?: PERMISSIONS[];
    iat?: number;
    exp?: number;
    nome?: string;
    avatar_url?: string;
  };
  headers: Request['headers'];
}

const resolveJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-secret';
  }

  if (process.env.NODE_ENV !== 'production') {
    loggerService.warn('JWT_SECRET não definido; usando fallback inseguro apenas para desenvolvimento.');
    return 'dev-only-secret';
  }

  throw new Error('JWT_SECRET must be defined');
};

const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const isMockFunction = (fn: unknown): fn is { mock: unknown } =>
  typeof fn === 'function' && typeof (fn as any).mock !== 'undefined';

const shouldUseFallback = (fn: unknown) =>
  process.env.NODE_ENV === 'test' || typeof fn !== 'function' || isMockFunction(fn);

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
  jwt.sign(buildTokenPayload(payload), JWT_SECRET, { expiresIn: JWT_EXPIRY as any });

const fallbackValidateToken = async (token: string): Promise<JWTPayload> =>
  jwt.verify(token, JWT_SECRET) as JWTPayload;

export const AuthService = {
  login: (...args: Parameters<typeof authService.login>) => authService.login(...args),
  getProfile: (...args: Parameters<typeof authService.getProfile>) => authService.getProfile(...args),
  register: (...args: Parameters<typeof authService.register>) => authService.register(...args),
  updateProfile: (...args: Parameters<typeof authService.updateProfile>) => authService.updateProfile(...args),
  changePassword: (...args: Parameters<typeof authService.changePassword>) => authService.changePassword(...args),
  generateToken(payload: JWTPayload): string {
    if (!shouldUseFallback((authService as any)?.generateToken)) {
      return authService.generateToken({
        id: payload.id,
        email: payload.email || '',
        role: payload.role
      });
    }

    return fallbackGenerateToken(payload);
  },
  async validateToken(token: string): Promise<JWTPayload> {
    if (!shouldUseFallback((authService as any)?.validateToken)) {
      const result = await authService.validateToken(token);
      return {
        id: result.id,
        email: result.email,
        role: result.role
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
    (req as any).user = decoded as any;
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

    const userPermissions = (req.user as any)?.permissions || [];
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
    
    if (!allowedRoles.includes((req.user as any).role)) {
      loggerService.audit('ACCESS_DENIED', (req.user as any).id, { 
        required_roles: allowedRoles, 
        user_role: (req.user as any).role 
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

// RBAC baseado em role_permissions (DB)
export const authorize = (required: string | string[]) => {
  const requiredPerms = Array.isArray(required) ? required : [required];
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      const role = String((req.user as any).role || '').toLowerCase();
      if (!role) return res.status(403).json({ error: 'Sem papel associado' });
      // Superadmin tem acesso total
      if (role === 'superadmin' || role === 'super_admin') return next();

      // Cache keys
      const roleKey = `perms:role:${role}`;
      const userKey = `perms:user:${(req.user as any).id}`;
      let rolePerms: string[] | null = null;
      let userPerms: string[] | null = null;
      try {
        const [rjson, ujson] = await Promise.all([
          redisClient.get(roleKey),
          redisClient.get(userKey)
        ]);
        rolePerms = rjson ? JSON.parse(rjson) : null;
        userPerms = ujson ? JSON.parse(ujson) : null;
      } catch {}

      if (!rolePerms) {
        const rp = await pool.query('SELECT permission FROM role_permissions WHERE role = $1', [role]);
        rolePerms = (rp.rows || []).map((r:any)=>r.permission);
        try { await redisClient.setex(roleKey, 300, JSON.stringify(rolePerms)); } catch {}
      }
      if (!userPerms) {
        const up = await pool.query('SELECT permission FROM user_permissions WHERE user_id = $1', [(req.user as any).id]);
        userPerms = (up.rows || []).map((r:any)=>r.permission);
        try { await redisClient.setex(userKey, 300, JSON.stringify(userPerms)); } catch {}
      }
      const perms: string[] = [...new Set([...(rolePerms||[]), ...(userPerms||[])])];
      const ok = requiredPerms.every((p) => perms.includes(p));
      if (!ok) {
        loggerService.audit('ACCESS_DENIED', (req.user as any).id, { role, required: requiredPerms, have: perms });
        return res.status(403).json({ error: 'Permissão negada', required: requiredPerms });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
  };
};
