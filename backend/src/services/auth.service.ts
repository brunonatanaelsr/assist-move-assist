import { Pool } from 'pg';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginData, ChangePasswordData, User, userSchema } from '../validators/auth.validator';

export class AuthService {
  private pool: Pool;
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutos
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRY: string;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.JWT_SECRET = process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production';
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
  }

  private async getCacheKey(key: string) {
    try {
      const data = await this.redis.get(`auth:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
      return null;
    }
  }

  private async setCacheKey(key: string, data: any) {
    try {
      await this.redis.setex(`auth:${key}`, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao definir cache:', error);
    }
  }

  async login(data: LoginData, ipAddress: string): Promise<{ token: string; user: Partial<User> }> {
    try {
      // Buscar usuário no banco
      const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
      const userResult = await this.pool.query(userQuery, [data.email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        console.log(`Failed login attempt: ${data.email} from ${ipAddress}`);
        throw new Error("Credenciais inválidas");
      }

      const user = userResult.rows[0];

      // Verificar senha
      const passwordMatch = await bcrypt.compare(data.password, user.senha_hash);

      if (!passwordMatch) {
        console.log(`Failed login attempt: ${data.email} (wrong password) from ${ipAddress}`);
        throw new Error("Credenciais inválidas");
      }

      // Atualizar último login
      await this.pool.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [user.id]
      );

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.papel 
        },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRY }
      );

      console.log(`Successful login: ${data.email} from ${ipAddress}`);

      // Remover campos sensíveis
      const { senha_hash, ...userWithoutPassword } = user;

      // Armazenar no cache
      await this.setCacheKey(`user:${user.id}`, userWithoutPassword);

      return {
        token,
        user: {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.papel
        }
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async getCurrentUser(userId: string): Promise<Partial<User>> {
    try {
      // Tentar buscar do cache
      const cachedUser = await this.getCacheKey(`user:${userId}`);
      if (cachedUser) {
        return cachedUser;
      }

      const userQuery = `
        SELECT id, nome, email, papel, telefone 
        FROM usuarios 
        WHERE id = $1 AND ativo = true
      `;
      const userResult = await this.pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error("Usuário não encontrado");
      }

      const user = userResult.rows[0];

      // Armazenar no cache
      await this.setCacheKey(`user:${userId}`, user);

      return {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.papel,
        phone: user.telefone
      };
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }

  async changePassword(userId: string, data: ChangePasswordData, ipAddress: string): Promise<void> {
    try {
      // Buscar usuário atual
      const userQuery = "SELECT senha_hash FROM usuarios WHERE id = $1 AND ativo = true";
      const userResult = await this.pool.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error("Usuário não encontrado");
      }

      const user = userResult.rows[0];

      // Verificar senha atual
      const passwordMatch = await bcrypt.compare(data.currentPassword, user.senha_hash);

      if (!passwordMatch) {
        throw new Error("Senha atual incorreta");
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(data.newPassword, user.senha_hash);
      if (isSamePassword) {
        throw new Error("Nova senha deve ser diferente da atual");
      }

      // Hash da nova senha
      const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

      // Atualizar senha no banco
      await this.pool.query(
        "UPDATE usuarios SET senha_hash = $1, data_atualizacao = NOW() WHERE id = $2",
        [newPasswordHash, userId]
      );

      // Invalidar cache do usuário
      await this.redis.del(`auth:user:${userId}`);

      console.log(`Password changed for user: ${userId} from ${ipAddress}`);
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ id: string; email: string; role: string }> {
    try {
      // Verificar token JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: string; email: string; role: string };
      
      // Verificar se o usuário ainda existe e está ativo
      const userQuery = "SELECT ativo FROM usuarios WHERE id = $1";
      const userResult = await this.pool.query(userQuery, [decoded.id]);

      if (userResult.rows.length === 0 || !userResult.rows[0].ativo) {
        throw new Error("Usuário inválido ou inativo");
      }

      return decoded;
    } catch (error) {
      console.error("Token validation error:", error);
      throw error;
    }
  }
}
