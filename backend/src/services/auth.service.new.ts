import { Pool } from 'pg';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

interface TokenPayload {
  id: number;
  email: string;
  papel: string;
}

interface User {
  id: number;
  email: string;
  senha_hash: string;
  nome: string;
  papel: 'user' | 'gestor' | 'admin' | 'super_admin';
  ativo: boolean;
  avatar_url?: string;
  ultimo_login: Date | null;
  data_criacao: Date;
  data_atualizacao: Date;
}

interface AuthResponse {
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
    this.JWT_SECRET = process.env.JWT_SECRET || 'movemarias_jwt_secret_key_2025_production';
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
  }

  async login(email: string, password: string, ipAddress: string): Promise<AuthResponse> {
    try {
      // Buscar usuário
      const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
      const userResult = await this.pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        console.log(`Failed login attempt: ${email} from ${ipAddress}`);
        throw new Error("Credenciais inválidas");
      }

      const user = userResult.rows[0];

      // Verificar senha
      const passwordMatch = await bcrypt.compare(password, user.senha_hash);
      if (!passwordMatch) {
        console.log(`Failed login attempt: ${email} (wrong password) from ${ipAddress}`);
        throw new Error("Credenciais inválidas");
      }

      // Atualizar último login
      await this.pool.query(
        "UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1",
        [user.id]
      );

      // Gerar token
      const token = jwt.sign({
        id: user.id,
        email: user.email,
        papel: user.papel
      }, this.JWT_SECRET, {
        expiresIn: '24h'
      });

      console.log(`Successful login: ${email} from ${ipAddress}`);

      // Remover campos sensíveis
      const { senha_hash, ...userWithoutPassword } = user;

      // Cache
      await this.redis.set(
        `auth:user:${user.id}`,
        JSON.stringify(userWithoutPassword),
        'EX',
        this.CACHE_TTL
      );

      return {
        token,
        user: userWithoutPassword
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<{ id: number; email: string; papel: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { id: number; email: string; papel: string };
      
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
