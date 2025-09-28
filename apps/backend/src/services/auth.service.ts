import { Pool } from 'pg';
import { createHash, randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
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
  id: number;
  user_id: number;
  token_id: string;
  token_hash: string;
  device_id: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
}

interface RefreshTokenMetadata {
  deviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: SignOptions['expiresIn'];
  private readonly CACHE_TTL = 300; // 5 minutos
  private readonly refreshTokenTTL: number;
  private readonly refreshHashRounds = 12;

  constructor(
    private pool: Pool,
    private redis: RedisClient
  ) {
    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpiry = env.JWT_EXPIRY;
    // 7 dias por padrão para tokens de refresh
    this.refreshTokenTTL = 7 * 24 * 60 * 60 * 1000;
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

  private normalizeDeviceId(deviceId?: string | null, userAgent?: string | null): string {
    const trimmed = (deviceId ?? '').trim();
    if (trimmed.length > 0) {
      return trimmed;
    }

    if (userAgent && userAgent.trim().length > 0) {
      return createHash('sha256').update(userAgent.trim()).digest('hex');
    }

    return 'unknown';
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.refreshTokenTTL);
  }

  private createRefreshTokenPair() {
    const tokenId = uuidv4();
    const secret = randomBytes(48).toString('hex');
    return {
      tokenId,
      secret,
      token: `${tokenId}.${secret}`
    };
  }

  private parseRefreshToken(refreshToken?: string | null) {
    if (!refreshToken) {
      return null;
    }

    const [tokenId, secret] = refreshToken.split('.');

    if (!tokenId || !secret) {
      return null;
    }

    return { tokenId, secret };
  }

  private async persistRefreshToken(
    userId: number,
    metadata: RefreshTokenMetadata
  ): Promise<{ token: string; deviceId: string; expiresAt: Date }> {
    const { tokenId, secret, token } = this.createRefreshTokenPair();
    const tokenHash = await bcrypt.hash(secret, this.refreshHashRounds);
    const expiresAt = this.getRefreshTokenExpiryDate();
    const normalizedDeviceId = this.normalizeDeviceId(metadata.deviceId, metadata.userAgent);

    await this.pool.query(
      `INSERT INTO user_refresh_tokens (user_id, token_id, token_hash, device_id, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET token_id = EXCLUDED.token_id,
                     token_hash = EXCLUDED.token_hash,
                     expires_at = EXCLUDED.expires_at,
                     user_agent = EXCLUDED.user_agent,
                     ip_address = EXCLUDED.ip_address,
                     updated_at = NOW(),
                     revoked_at = NULL`,
      [userId, tokenId, tokenHash, normalizedDeviceId, metadata.userAgent ?? null, metadata.ipAddress ?? null, expiresAt]
    );

    return { token, deviceId: normalizedDeviceId, expiresAt };
  }

  private async rotateRefreshToken(
    recordId: number,
    metadata: RefreshTokenMetadata
  ): Promise<{ token: string; deviceId: string; expiresAt: Date }> {
    const { tokenId, secret, token } = this.createRefreshTokenPair();
    const tokenHash = await bcrypt.hash(secret, this.refreshHashRounds);
    const expiresAt = this.getRefreshTokenExpiryDate();
    const normalizedDeviceId = this.normalizeDeviceId(metadata.deviceId, metadata.userAgent);

    await this.pool.query(
      `UPDATE user_refresh_tokens
       SET token_id = $1,
           token_hash = $2,
           device_id = $3,
           user_agent = $4,
           ip_address = $5,
           expires_at = $6,
           updated_at = NOW(),
           revoked_at = NULL
       WHERE id = $7`,
      [
        tokenId,
        tokenHash,
        normalizedDeviceId,
        metadata.userAgent ?? null,
        metadata.ipAddress ?? null,
        expiresAt,
        recordId
      ]
    );

    return { token, deviceId: normalizedDeviceId, expiresAt };
  }

  private async revokeRefreshTokenRecord(recordId: number): Promise<void> {
    await this.pool.query(
      `UPDATE user_refresh_tokens
       SET revoked_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [recordId]
    );
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

      // Gerar token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        role: user.papel
      });

      const sessionUser = this.buildSessionUser(user);
      const refreshToken = await this.persistRefreshToken(user.id, {
        deviceId,
        userAgent,
        ipAddress
      });

      loggerService.info(`Successful login: ${email} from ${ipAddress}`);

      // Retorna imediatamente em ambientes sem Redis disponível
      if (!env.REDIS_HOST) {
        return { token, refreshToken: refreshToken.token, user: sessionUser };
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
        refreshToken: refreshToken.token,
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

  async renewAccessToken(
    refreshToken: string,
    metadata: RefreshTokenMetadata
  ): Promise<RefreshSessionResponse> {
    const parsed = this.parseRefreshToken(refreshToken);

    if (!parsed) {
      throw new Error('Refresh token inválido');
    }

    const tokenResult = await this.pool.query(
      `SELECT id, user_id, token_id, token_hash, device_id, user_agent, ip_address, expires_at, revoked_at
       FROM user_refresh_tokens
       WHERE token_id = $1`,
      [parsed.tokenId]
    );

    if (tokenResult.rowCount === 0) {
      throw new Error('Refresh token não encontrado');
    }

    const record = tokenResult.rows[0] as RefreshTokenRecord;

    if (record.revoked_at) {
      throw new Error('Refresh token revogado');
    }

    const expiresAt = new Date(record.expires_at);
    if (expiresAt.getTime() <= Date.now()) {
      await this.revokeRefreshTokenRecord(record.id);
      throw new Error('Refresh token expirado');
    }

    const normalizedDeviceId = this.normalizeDeviceId(metadata.deviceId, metadata.userAgent ?? record.user_agent);

    if (record.device_id && record.device_id !== normalizedDeviceId) {
      throw new Error('Dispositivo não autorizado para este token');
    }

    const validSecret = await bcrypt.compare(parsed.secret, record.token_hash);

    if (!validSecret) {
      await this.revokeRefreshTokenRecord(record.id);
      throw new Error('Refresh token inválido');
    }

    const userResult = await this.pool.query(
      "SELECT * FROM usuarios WHERE id = $1 AND ativo = true",
      [record.user_id]
    );

    if (userResult.rowCount === 0) {
      await this.revokeRefreshTokenRecord(record.id);
      throw new Error('Usuário associado não encontrado ou inativo');
    }

    const user = userResult.rows[0] as DatabaseUser;
    const sessionUser = this.buildSessionUser(user);

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.papel
    });

    const rotated = await this.rotateRefreshToken(record.id, {
      deviceId: normalizedDeviceId,
      userAgent: metadata.userAgent ?? record.user_agent,
      ipAddress: metadata.ipAddress ?? record.ip_address
    });

    loggerService.info(`Refresh token renovado para o usuário ${user.email}`);

    return {
      token,
      refreshToken: rotated.token,
      user: sessionUser
    };
  }

  async revokeRefreshToken(refreshToken: string, metadata?: RefreshTokenMetadata): Promise<void> {
    const parsed = this.parseRefreshToken(refreshToken);

    if (!parsed) {
      throw new Error('Refresh token inválido');
    }

    const tokenResult = await this.pool.query(
      `SELECT id, device_id FROM user_refresh_tokens WHERE token_id = $1`,
      [parsed.tokenId]
    );

    if (tokenResult.rowCount === 0) {
      throw new Error('Refresh token não encontrado');
    }

    const record = tokenResult.rows[0] as RefreshTokenRecord;

    if (metadata?.deviceId) {
      const normalizedDeviceId = this.normalizeDeviceId(metadata.deviceId, metadata.userAgent);
      if (record.device_id && record.device_id !== normalizedDeviceId) {
        throw new Error('Dispositivo não autorizado');
      }
    }

    await this.revokeRefreshTokenRecord(record.id);
  }

  async revokeAllRefreshTokensForUser(userId: number, deviceId?: string | null): Promise<void> {
    if (deviceId) {
      const normalizedDeviceId = this.normalizeDeviceId(deviceId, null);
      await this.pool.query(
        `UPDATE user_refresh_tokens
         SET revoked_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
        [userId, normalizedDeviceId]
      );
      return;
    }

    await this.pool.query(
      `UPDATE user_refresh_tokens
       SET revoked_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
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

    const sessionUser = this.buildSessionUser(user);

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
    await this.revokeAllRefreshTokensForUser(userId);
  }
}
