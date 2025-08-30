import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from '../services/db';
import { loggerService } from '../services/logger';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SIGN_OPTIONS: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any };

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

export class AuthService {
  // Gerar hash da senha
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  // Verificar senha
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Gerar token JWT
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, SIGN_OPTIONS);
  }

  // Verificar token JWT
  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  // Login
  static async login(email: string, password: string): Promise<{ user: any; token: string } | null> {
    try {
      // Buscar usuário
      const users = await db.query(
        'SELECT id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = $1 AND ativo = true',
        [email]
      );

      if (!users || users.length === 0) {
        loggerService.audit('LOGIN_FAILED', undefined, { email, reason: 'user_not_found' });
        return null;
      }

      const user = users[0];

      // Verificar senha
      if (!user.senha_hash || !(await this.verifyPassword(password, user.senha_hash))) {
        loggerService.audit('LOGIN_FAILED', user.id, { email, reason: 'invalid_password' });
        return null;
      }

      // Atualizar último login
      await db.query(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Gerar token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.papel
      });

      loggerService.audit('LOGIN_SUCCESS', user.id, { email });

      return {
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.papel,
          ativo: user.ativo
        },
        token
      };
    } catch (error) {
      loggerService.error('Erro no login:', error);
      throw error;
    }
  }

  // Registrar usuário
  static async register(userData: {
    email: string;
    password: string;
    nome_completo: string;
    role?: string;
  }): Promise<{ user: any; token: string }> {
    try {
      // Verificar se email já existe
      const existingUsers = await db.query(
        'SELECT id FROM profiles WHERE email = $1',
        [userData.email]
      );

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const passwordHash = await this.hashPassword(userData.password);

      // Criar usuário
      const result = await db.query(
        'INSERT INTO profiles (email, password_hash, nome_completo, role, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          userData.email,
          passwordHash,
          userData.nome_completo,
          userData.role || 'user',
          true,
          new Date(),
          new Date()
        ]
      );

      const user = result[0];

      // Gerar token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      loggerService.audit('USER_REGISTERED', user.id, { email: userData.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          nome_completo: user.nome_completo,
          role: user.role
        },
        token
      };
    } catch (error) {
      loggerService.error('Erro no registro:', error);
      throw error;
    }
  }

  // Obter perfil do usuário
  static async getProfile(userId: string): Promise<any> {
    const result = await db.query(
      'SELECT id, email, nome_completo, role, avatar_url, created_at, last_login FROM profiles WHERE id = $1 AND active = true',
      [userId]
    );

    return result[0] || null;
  }

  // Atualizar perfil
  static async updateProfile(userId: string, updateData: {
    nome_completo?: string;
    avatar_url?: string;
  }): Promise<any> {
    const allowedFields = ['nome_completo', 'avatar_url'];
    const updates: Record<string, any> = {};
    const values: any[] = [];
    let setClause = '';

    // Filtrar apenas campos permitidos e construir a query
    Object.keys(updateData).forEach((key, index) => {
      if (allowedFields.includes(key) && updateData[key as keyof typeof updateData] !== undefined) {
        updates[key] = updateData[key as keyof typeof updateData];
        if (setClause) setClause += ', ';
        setClause += `${key} = $${index + 2}`;
        values.push(updates[key]);
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    values.unshift(userId); // $1 será o userId

    const query = `
      UPDATE profiles 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $1 AND active = true 
      RETURNING id, email, nome_completo, role, avatar_url
    `;

    const result = await db.query(query, values);
    const updatedUser = result[0];
    
    loggerService.audit('PROFILE_UPDATED', userId, updates);

    return updatedUser;
  }

  // Alterar senha
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const result = await db.query(
      'SELECT password_hash FROM profiles WHERE id = $1 AND active = true',
      [userId]
    );

    if (!result || result.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const user = result[0];

    // Verificar senha atual
    if (!user.password_hash || !(await this.verifyPassword(currentPassword, user.password_hash))) {
      loggerService.audit('PASSWORD_CHANGE_FAILED', userId, { reason: 'invalid_current_password' });
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await this.hashPassword(newPassword);

    // Atualizar senha
    await db.query(
      'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    loggerService.audit('PASSWORD_CHANGED', userId);
  }
}

// Middleware de autenticação
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
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
    const decoded = AuthService.verifyToken(token);
    (req as any).user = decoded;
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
export const requireProfissional = requireRole(['admin', 'profissional']);

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

      const [rp, up] = await Promise.all([
        pool.query('SELECT permission FROM role_permissions WHERE role = $1', [role]),
        pool.query('SELECT permission FROM user_permissions WHERE user_id = $1', [(req.user as any).id])
      ]);
      const perms: string[] = [
        ...new Set([...(rp.rows||[]).map((r:any)=>r.permission), ...(up.rows||[]).map((r:any)=>r.permission)])
      ];
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
