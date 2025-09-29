import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import ms from 'ms';
import type { RedisClient } from '../lib/redis';
import { loggerService } from '../services/logger';
import type {
  AuthenticatedSessionUser,
  AuthResponse,
  JWTPayload,
  RefreshSessionResponse,
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

interface RefreshTokenRecord {
  userId: number;
  expiresAt: Date;
  revoked: boolean;
}

interface RefreshTokenMetadata {
  deviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface RefreshTokenRevocationMetadata {
  deviceId?: string | null;
  userAgent?: string | null;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: SignOptions['expiresIn'];
  private readonly refreshSecret: string;
  private readonly refreshExpiry: SignOptions['expiresIn'];
  private readonly refreshTtlSeconds: number;
  private readonly CACHE_TTL = 300; // 5 minutos
  private refreshTableEnsured = false;

  constructor(
    private pool: Pool,
    private redis: RedisClient
  ) {
    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpiry = env.JWT_EXPIRY;
    this.refreshSecret = env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length > 0
      ? env.JWT_REFRESH_SECRET
      : `${this.jwtSecret}-refresh`;
    this.refreshExpiry = env.JWT_REFRESH_EXPIRY;
    this.refreshTtlSeconds = this.resolveExpiryToSeconds(this.refreshExpiry) || 60 * 60 * 24 * 7;
  }

  private resolveExpiryToSeconds(expiry: SignOptions['expiresIn']): number {
    if (typeof expiry === 'number' && Number.isFinite(expiry)) {
      return Math.max(0, Math.floor(expiry));
    }

    if (typeof expiry === 'string') {
      try {
        const parsed = ms(expiry);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) {
          return Math.max(0, Math.floor(parsed / 1000));
        }
      } catch (error) {
        loggerService.warn('Formato inválido de expiração para refresh token', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return 0;
  }

  private getRefreshRedisKey(tokenHash: string): string {
    return `auth:refresh:${tokenHash}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureRefreshTokenTable(): Promise<void> {
    if (this.refreshTableEnsured) {
      return;
    }

    try {
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS refresh_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ
        )`
      );
      await this.pool.query(
        'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)'
      );
      await this.pool.query(
        'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)'
      );
      this.refreshTableEnsured = true;
    } catch (error) {
      loggerService.warn('Não foi possível garantir a tabela de refresh tokens', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async persistRefreshToken(tokenHash: string, userId: number, expiresAt: Date): Promise<void> {
    if (env.REDIS_HOST) {
      try {
        await this.redis.set(
          this.getRefreshRedisKey(tokenHash),
          JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }),
          'EX',
          this.refreshTtlSeconds
        );
      } catch (error) {
        loggerService.warn('Falha ao registrar refresh token no Redis', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    await this.ensureRefreshTokenTable();
    if (!this.refreshTableEnsured) {
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO refresh_tokens (token_hash, user_id, expires_at, revoked, revoked_at)
         VALUES ($1, $2, $3, false, NULL)
         ON CONFLICT (token_hash)
         DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at, revoked = false, revoked_at = NULL`,
        [tokenHash, userId, expiresAt]
      );
    } catch (error) {
      loggerService.warn('Falha ao registrar refresh token no banco de dados', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async fetchRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    let cached: { userId: number; expiresAt: string } | null = null;

    if (env.REDIS_HOST) {
      try {
        const cachedValue = await this.redis.get(
          this.getRefreshRedisKey(tokenHash)
        );
        if (cachedValue) {
          cached = JSON.parse(cachedValue) as { userId: number; expiresAt: string };
        }
      } catch (error) {
        loggerService.warn('Falha ao buscar refresh token no Redis', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    await this.ensureRefreshTokenTable();

    if (!this.refreshTableEnsured) {
      if (cached) {
        return {
          userId: cached.userId,
          expiresAt: new Date(cached.expiresAt),
          revoked: false
        };
      }
      return null;
    }

    let databaseRecord: RefreshTokenRecord | null = null;
    try {
      const result = await this.pool.query(
        'SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1',
        [tokenHash]
      );

      if (result.rowCount === 0) {
        databaseRecord = null;
      } else {
        const row = result.rows[0];
        databaseRecord = {
          userId: Number(row.user_id),
          expiresAt: new Date(row.expires_at),
          revoked: Boolean(row.revoked)
        };
      }
    } catch (error) {
      loggerService.warn('Falha ao buscar refresh token no banco de dados', {
        error: error instanceof Error ? error.message : String(error)
      });
      if (cached) {
        return {
          userId: cached.userId,
          expiresAt: new Date(cached.expiresAt),
          revoked: false
        };
      }
      return null;
    }

    if (!databaseRecord) {
      if (cached) {
        await this.removeRefreshTokenFromRedis(tokenHash);
      }
      return null;
    }

    if (databaseRecord.revoked) {
      if (cached) {
        await this.removeRefreshTokenFromRedis(tokenHash);
      }
      return databaseRecord;
    }

    const cachedExpiresAt = cached ? new Date(cached.expiresAt) : null;
    const cacheMatchesDatabase =
      cached &&
      cached.userId === databaseRecord.userId &&
      cachedExpiresAt?.getTime() === databaseRecord.expiresAt.getTime();

    if (!cacheMatchesDatabase) {
      if (databaseRecord.expiresAt.getTime() <= Date.now()) {
        await this.removeRefreshTokenFromRedis(tokenHash);
      } else if (env.REDIS_HOST) {
        const ttlSeconds = Math.max(
          1,
          Math.min(
            this.refreshTtlSeconds,
            Math.floor((databaseRecord.expiresAt.getTime() - Date.now()) / 1000)
          )
        );
        try {
          await this.redis.set(
            this.getRefreshRedisKey(tokenHash),
            JSON.stringify({
              userId: databaseRecord.userId,
              expiresAt: databaseRecord.expiresAt.toISOString()
            }),
            'EX',
            ttlSeconds
          );
        } catch (error) {
          loggerService.warn('Falha ao atualizar refresh token no Redis', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return databaseRecord;
  }

  private async removeRefreshTokenFromRedis(tokenHash: string): Promise<void> {
    if (env.REDIS_HOST) {
      try {
        await this.redis.del(
          this.getRefreshRedisKey(tokenHash)
        );
      } catch (error) {
        loggerService.warn('Falha ao remover refresh token do Redis', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  async revokeRefreshToken(
    token: string,
    metadata?: RefreshTokenRevocationMetadata
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    if (metadata && (metadata.deviceId || metadata.userAgent)) {
      loggerService.info('Revogando refresh token com metadados adicionais', {
        deviceId: metadata.deviceId ?? null,
        userAgent: metadata.userAgent ?? null
      });
    }

    await this.removeRefreshTokenFromRedis(tokenHash);

    await this.ensureRefreshTokenTable();
    if (!this.refreshTableEnsured) {
      return;
    }

    try {
      await this.pool.query(
        'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    } catch (error) {
      loggerService.warn('Falha ao revogar refresh token no banco de dados', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async revokeAllRefreshTokensForUser(userId: number): Promise<void> {
    await this.ensureRefreshTokenTable();
    if (!this.refreshTableEnsured) {
      return;
    }

    try {
      await this.pool.query(
        'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1 AND revoked = false',
        [userId]
      );
    } catch (error) {
      loggerService.warn('Falha ao revogar todos os refresh tokens do usuário', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async generateRefreshToken(payload: JWTPayload): Promise<string> {
    const jwtId = randomUUID();
    const token = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions
      },
      this.refreshSecret,
      {
        expiresIn: this.refreshExpiry,
        jwtid: jwtId
      }
    );

    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);
    const tokenHash = this.hashToken(token);
    await this.persistRefreshToken(tokenHash, payload.id, expiresAt);

    return token;
  }

  async validateRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as JWTPayload;
      const tokenHash = this.hashToken(token);
      const stored = await this.fetchRefreshToken(tokenHash);

      if (!stored || stored.revoked) {
        throw new Error('Refresh token inválido');
      }

      if (stored.expiresAt.getTime() <= Date.now()) {
        await this.revokeRefreshToken(token);
        throw new Error('Refresh token expirado');
      }

      const userQuery =
        'SELECT id, email, papel as role, ativo FROM usuarios WHERE id = $1';
      const userResult = await this.pool.query(userQuery, [decoded.id]);

      if (userResult.rows.length === 0 || !userResult.rows[0].ativo) {
        await this.revokeRefreshToken(token);
        throw new Error('Usuário inválido ou inativo');
      }

      const { id, email, role } = userResult.rows[0];

      return {
        id,
        email,
        role
      };
    } catch (error) {
      loggerService.error('Erro ao validar refresh token:', error);
      throw error instanceof Error ? error : new Error('Refresh token inválido');
    }
  }

  async refreshWithToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      await this.revokeRefreshToken(refreshToken);

      const token = this.generateToken(payload);
      const newRefreshToken = await this.generateRefreshToken(payload);

      let user: DatabaseUser | undefined;

      if (payload.email) {
        const emailResult = await this.pool.query(
          'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
          [payload.email.toLowerCase()]
        );

        if ((emailResult.rowCount ?? 0) > 0) {
          user = emailResult.rows[0] as DatabaseUser;
        }
      }

      if (!user) {
        const idResult = await this.pool.query(
          'SELECT * FROM usuarios WHERE id = $1 AND ativo = true',
          [payload.id]
        );

        if ((idResult.rowCount ?? 0) > 0) {
          user = idResult.rows[0] as DatabaseUser;
        }
      }

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const sessionUser = this.buildSessionUser(user);

      return {
        token,
        refreshToken: newRefreshToken,
        user: sessionUser
      };
    } catch (error) {
      loggerService.warn('Falha ao renovar sessão via refresh token', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error instanceof Error ? error : new Error('Falha ao renovar sessão');
    }
  }

  private buildSessionUser(user: DatabaseUser): AuthenticatedSessionUser {
    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      papel: user.papel,
      avatar_url: user.avatar_url ?? undefined,
      ultimo_login: user.ultimo_login,
      data_criacao: user.data_criacao,
      data_atualizacao: user.data_atualizacao
    };
  }

  async renewAccessToken(
    refreshToken: string,
    _metadata: RefreshTokenMetadata
  ): Promise<RefreshSessionResponse> {
    const result = await this.refreshWithToken(refreshToken);

    return {
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user
    };
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
  async login(
    email: string,
    password: string,
    ipAddress: string,
    deviceId?: string | null,
    userAgent?: string | null
  ): Promise<AuthResponse | null> {
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

      // Gerar tokens
      const tokenPayload: JWTPayload = {
        id: user.id,
        email: user.email,
        role: user.papel
      };
      const token = this.generateToken(tokenPayload);
      const refreshToken = await this.generateRefreshToken(tokenPayload);

      const sessionUser = this.buildSessionUser(user);

      loggerService.info(`Successful login: ${email} from ${ipAddress}`);

      const response: AuthResponse = {
        token,
        refreshToken,
        user: sessionUser
      };

      // Retorna imediatamente em ambientes sem Redis disponível
      if (!env.REDIS_HOST) {
        return response;
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

      return response;
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
    const payload: JWTPayload = { id: user.id, email: user.email, role: user.papel };
    const token = this.generateToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    const sessionUser = this.buildSessionUser(user);

    return { token, refreshToken, user: sessionUser };
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
    await this.revokeAllRefreshTokensForUser(userId);
  }
}
