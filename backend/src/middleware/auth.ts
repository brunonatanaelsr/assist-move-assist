import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from '../services/db';
import { loggerService } from '../services/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
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
    return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
        'SELECT * FROM profiles WHERE email = $1 AND active = true',
        [email]
      );

      if (users.length === 0) {
        loggerService.audit('LOGIN_FAILED', undefined, { email, reason: 'user_not_found' });
        return null;
      }

      const user = users[0];

      // Verificar senha
      if (!user.password_hash || !(await this.verifyPassword(password, user.password_hash))) {
        loggerService.audit('LOGIN_FAILED', user.id, { email, reason: 'invalid_password' });
        return null;
      }

      // Atualizar último login
      await db.query(
        'UPDATE profiles SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Gerar token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.role || 'user'
      });

      loggerService.audit('LOGIN_SUCCESS', user.id, { email });

      return {
        user: {
          id: user.id,
          email: user.email,
          nome_completo: user.nome_completo,
          role: user.role,
          avatar_url: user.avatar_url
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

      if (existingUsers.length > 0) {
        throw new Error('Email já está em uso');
      }

      // Hash da senha
      const passwordHash = await this.hashPassword(userData.password);

      // Criar usuário
      const user = await db.insert('profiles', {
        email: userData.email,
        password_hash: passwordHash,
        nome_completo: userData.nome_completo,
        role: userData.role || 'user',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

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
    const users = await db.query(
      'SELECT id, email, nome_completo, role, avatar_url, created_at, last_login FROM profiles WHERE id = $1 AND active = true',
      [userId]
    );

    return users[0] || null;
  }

  // Atualizar perfil
  static async updateProfile(userId: string, updateData: {
    nome_completo?: string;
    avatar_url?: string;
  }): Promise<any> {
    const allowedFields = ['nome_completo', 'avatar_url'];
    const updates: Record<string, any> = {};

    // Filtrar apenas campos permitidos
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key as keyof typeof updateData] !== undefined) {
        updates[key] = updateData[key as keyof typeof updateData];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new Error('Nenhum campo válido para atualizar');
    }

    const updatedUser = await db.update('profiles', userId, updates);
    
    loggerService.audit('PROFILE_UPDATED', userId, updates);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      nome_completo: updatedUser.nome_completo,
      role: updatedUser.role,
      avatar_url: updatedUser.avatar_url
    };
  }

  // Alterar senha
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const users = await db.query(
      'SELECT password_hash FROM profiles WHERE id = $1 AND active = true',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const user = users[0];

    // Verificar senha atual
    if (!user.password_hash || !(await this.verifyPassword(currentPassword, user.password_hash))) {
      loggerService.audit('PASSWORD_CHANGE_FAILED', userId, { reason: 'invalid_current_password' });
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const newPasswordHash = await this.hashPassword(newPassword);

    // Atualizar senha
    await db.update('profiles', userId, {
      password_hash: newPasswordHash
    });

    loggerService.audit('PASSWORD_CHANGED', userId);
  }
}

// Middleware de autenticação
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  let token: string | undefined;

  // Tentar extrair token do cookie "auth_token"
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookie = cookies.find(c => c.startsWith('auth_token='));
    if (authCookie) {
      token = decodeURIComponent(authCookie.split('=')[1]);
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
    req.user = decoded;
    next();
  } catch (error) {
    loggerService.audit('INVALID_TOKEN', undefined, { token: token.substring(0, 20) + '...' });
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware de autorização por role
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    next();
  };
};

// Middleware para profissionais
export const requireProfissional = requireRole(['admin', 'profissional']);

// Middleware para administradores
export const requireAdmin = requireRole('admin');
