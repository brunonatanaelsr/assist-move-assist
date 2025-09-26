import { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';
import { loggerService } from '../services/logger';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type {
  AuthenticatedSessionUser,
  AuthResponse,
  JWTPayload,
  RegisterRequest
} from '../types/auth';

interface DatabaseUser {
  id: number;
  email: string;
  senha_hash: string;
  nome: string;
  papel: 'user' | 'gestor' | 'admin' | 'super_admin' | 'superadmin';
  ativo: boolean;
  avatar_url?: string | null;
  ultimo_login: Date | null;
  data_criacao: Date;
  data_atualizacao: Date;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: SignOptions['expiresIn'];
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    private pool: Pool,
    private redis: RedisClient
  ) {
    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpiry = env.JWT_EXPIRY;
  }

  /**
   * Gera um token JWT assinado contendo a identificação básica do usuário autenticado.
   * @param payload Informações que serão codificadas no token JWT.
   * @returns Token JWT assinado com tempo de expiração configurado.
   */
  generateToken(payload: JWTPayload): string {
    const options: SignOptions = { expiresIn: this.jwtExpiry };
    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Realiza a autenticação de um usuário validando suas credenciais e registrando o acesso.
   * @param email Email informado pelo usuário.
   * @param password Senha em texto puro informada pelo usuário.
   * @param ipAddress Endereço IP utilizado para auditoria do acesso.
   * @returns Token JWT e dados básicos do usuário autenticado ou null se inválido.
   */
  async login(email: string, password: string, ipAddress: string): Promise<AuthResponse | null> {
    try {
      // Buscar usuário
      const userQuery = "SELECT * FROM usuarios WHERE email = $1 AND ativo = true";
      const userResult = await this.pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        loggerService.info(`Failed login attempt: ${email} from ${ipAddress}`);
        return null;
      }

      const user = userResult.rows[0] as DatabaseUser;

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
      const sessionUser: AuthenticatedSessionUser = {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        nome: userWithoutPassword.nome,
        papel: userWithoutPassword.papel,
        avatar_url: userWithoutPassword.avatar_url ?? undefined,
        ultimo_login: userWithoutPassword.ultimo_login,
        data_criacao: userWithoutPassword.data_criacao,
        data_atualizacao: userWithoutPassword.data_atualizacao
      };

      // Retorna imediatamente em ambientes sem Redis disponível
      if (!env.REDIS_HOST) {
        return { token, user: sessionUser };
      }

      // Cache (ignorar falhas de Redis em dev)
      try {
        await this.redis.set(
          `auth:user:${user.id}`,
          JSON.stringify(sessionUser),
          'EX',
          this.CACHE_TTL
        );
      } catch (e) {
        loggerService.warn('Redis indisponível (cache de auth ignorado)');
      }

      return {
        token,
        user: sessionUser
      };
    } catch (error) {
      loggerService.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Valida um token JWT garantindo que o usuário continua ativo na base de dados.
   * @param token Token JWT recebido no cabeçalho ou cookie da requisição.
   * @returns Payload decodificado contendo dados essenciais do usuário.
   */
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

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

  /**
   * Registra um novo usuário persistindo os dados e retornando um token de sessão.
   * @param params Dados necessários para criação do usuário.
   */
  async register({ email, password, nome_completo, role }: RegisterRequest): Promise<AuthResponse> {
    const lowerEmail = email.toLowerCase();

    const existing = await this.pool.query('SELECT id FROM usuarios WHERE email = $1', [lowerEmail]);
    if (existing.rows.length > 0) {
      throw new Error('Email já está em uso');
    }

    const senhaHash = await bcrypt.hash(password, 12);
    const papel = (role as DatabaseUser['papel']) || 'user';

    const result = await this.pool.query(
      `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo, data_criacao, data_atualizacao)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, email, nome, papel, ativo, avatar_url, ultimo_login, data_criacao, data_atualizacao`,
      [lowerEmail, senhaHash, nome_completo, papel]
    );

    const user = result.rows[0] as DatabaseUser;
    const token = this.generateToken({ id: user.id, email: user.email, role: user.papel });

    const sessionUser: AuthenticatedSessionUser = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      papel: user.papel,
      avatar_url: user.avatar_url ?? undefined,
      ultimo_login: user.ultimo_login,
      data_criacao: user.data_criacao,
      data_atualizacao: user.data_atualizacao
    };

    return { token, user: sessionUser };
  }

  /**
   * Recupera dados de perfil do usuário autenticado.
   * @param userId Identificador do usuário.
   */
  async getProfile(userId: number) {
    const result = await this.pool.query(
      `SELECT id, email, nome, papel as role, avatar_url, data_criacao, ultimo_login,
              cargo, departamento, bio, telefone
       FROM usuarios WHERE id = $1 AND ativo = true`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Atualiza informações de perfil para o usuário autenticado.
   * @param userId Identificador do usuário que terá o perfil atualizado.
   * @param update Campos opcionais que serão atualizados.
   */
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

  /**
   * Altera a senha do usuário após validar a senha atual.
   * @param userId Identificador do usuário.
   * @param currentPassword Senha atual fornecida.
   * @param newPassword Nova senha desejada.
   */
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
