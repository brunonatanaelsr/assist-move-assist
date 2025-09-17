import { Pool } from 'pg';
import Redis from 'ioredis';
import { loggerService } from '../services/logger';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  id: number;
  email: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  senha_hash: string;
  nome: string;
  papel: 'user' | 'gestor' | 'admin' | 'super_admin' | 'superadmin';
  ativo: boolean;
  avatar_url?: string;
  ultimo_login: Date | null;
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface AuthResponse {
  token: string;
  user: Partial<User>;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRY: string | number;
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    private pool: Pool,
    private redis: Redis
  ) {
    const resolvedSecret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'test'
        ? 'test-secret'
        : process.env.NODE_ENV !== 'production'
          ? 'dev-only-secret'
          : '');

    if (!resolvedSecret) {
      throw new Error('JWT_SECRET deve ser definido');
    }

    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
      loggerService.warn('JWT_SECRET não definido; usando fallback inseguro apenas para desenvolvimento.');
    }

    this.JWT_SECRET = resolvedSecret;
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
  }

  generateToken(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: this.JWT_EXPIRY as any };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  async login(email: string, password: string, ipAddress: string): Promise<AuthResponse | null> {
    try {
      // Buscar usuário
      const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
      const userResult = await this.pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        loggerService.info(`Failed login attempt: ${email} from ${ipAddress}`);
        return null;
      }

      const user = userResult.rows[0];

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.senha_hash);
      if (!passwordMatch) {
        loggerService.info(`Failed login attempt: ${email} (wrong password) from ${ipAddress}`);
        return null;
      }

      // Atualizar último login
      await this.pool.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [user.id]
      );

      // Gerar token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.papel
      });

      loggerService.info(`Successful login: ${email} from ${ipAddress}`);

      // Remover campos sensíveis
      const { senha_hash, ...userWithoutPassword } = user;

      // Retorna imediatamente em ambientes sem Redis disponível
      if (!process.env.REDIS_HOST) {
        return { token, user: userWithoutPassword };
      }

      // Cache (ignorar falhas de Redis em dev)
      try {
        await this.redis.set(
          `auth:user:${user.id}`,
          JSON.stringify(userWithoutPassword),
          'EX',
          this.CACHE_TTL
        );
      } catch (e) {
        loggerService.warn('Redis indisponível (cache de auth ignorado)');
      }

      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      loggerService.error("Login error:", error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ id: number; email: string; role: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: number; email: string; role: string };
      
      const userQuery = "SELECT ativo FROM usuarios WHERE id = $1";
      const userResult = await this.pool.query(userQuery, [decoded.id]);

      if (userResult.rows.length === 0 || !userResult.rows[0].ativo) {
        throw new Error("Usuário inválido ou inativo");
      }

      return decoded;
    } catch (error) {
      loggerService.error("Token validation error:", error);
      throw error;
    }
  }

  async register({ email, password, nome_completo, role }: { email: string; password: string; nome_completo: string; role?: string; }): Promise<AuthResponse> {
    const lowerEmail = email.toLowerCase();

    const existing = await this.pool.query('SELECT id FROM usuarios WHERE email = $1', [lowerEmail]);
    if (existing.rows.length > 0) {
      throw new Error('Email já está em uso');
    }

    const senhaHash = await bcrypt.hash(password, 12);
    const papel = (role as User['papel']) || 'user';

    const result = await this.pool.query(
      `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo, data_criacao, data_atualizacao)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, email, nome, papel, ativo, avatar_url, ultimo_login, data_criacao, data_atualizacao`,
      [lowerEmail, senhaHash, nome_completo, papel]
    );

    const user = result.rows[0];
    const token = this.generateToken({ id: user.id, email: user.email, role: user.papel });

    return { token, user };
  }

  async getProfile(userId: number) {
    const result = await this.pool.query(
      `SELECT id, email, nome, papel as role, avatar_url, data_criacao, ultimo_login,
              cargo, departamento, bio, telefone
       FROM usuarios WHERE id = $1 AND ativo = true`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async updateProfile(userId: number, update: { nome_completo?: string; avatar_url?: string; cargo?: string; departamento?: string; bio?: string; telefone?: string; }) {
    const { nome_completo, avatar_url, cargo, departamento, bio, telefone } = update;
    const result = await this.pool.query(
      `UPDATE usuarios 
       SET nome = COALESCE($1, nome), avatar_url = COALESCE($2, avatar_url),
           cargo = COALESCE($3, cargo), departamento = COALESCE($4, departamento),
           bio = COALESCE($5, bio), telefone = COALESCE($6, telefone), data_atualizacao = NOW()
       WHERE id = $7 AND ativo = true
       RETURNING id, email, nome as nome_completo, papel as role, avatar_url, cargo, departamento, bio, telefone`,
      [nome_completo, avatar_url, cargo, departamento, bio, telefone, userId]
    );
    return result.rows[0];
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const result = await this.pool.query('SELECT senha_hash FROM usuarios WHERE id = $1 AND ativo = true', [userId]);
    if (result.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }
    const ok = await bcrypt.compare(currentPassword, result.rows[0].senha_hash);
    if (!ok) {
      throw new Error('Senha atual incorreta');
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await this.pool.query('UPDATE usuarios SET senha_hash = $1, data_atualizacao = NOW() WHERE id = $2', [newHash, userId]);
  }
}
