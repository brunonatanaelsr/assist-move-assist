import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import type { Pool } from 'pg';
import type { RedisClient } from '../../lib/redis';
import { env } from '../../config/env';

interface RefreshTokenRow {
  userId: number;
  tokenId: string;
  tokenHash: string;
  deviceId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface UserRow {
  id: number;
  email: string;
  senha_hash: string;
  nome: string;
  papel: string;
  ativo: boolean;
  avatar_url: string | null;
  ultimo_login: Date | null;
  data_criacao: Date;
  data_atualizacao: Date;
}

class PoolMock {
  public users = new Map<number, UserRow>();
  public refreshTokensByHash = new Map<string, RefreshTokenRow>();
  private refreshTokensByDevice = new Map<string, string>();

  private normalize(sql: string): string {
    return sql.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const normalized = this.normalize(sql);

    if (normalized.startsWith("select to_regclass('public.user_refresh_tokens')")) {
      return { rows: [{ table_name: 'user_refresh_tokens' }], rowCount: 1 };
    }

    if (normalized.startsWith("select to_regclass('public.refresh_tokens')")) {
      return { rows: [{ table_name: null }], rowCount: 1 };
    }

    if (normalized.startsWith('select token_hash, user_id, expires_at, revoked, revoked_at from refresh_tokens')) {
      return { rows: [], rowCount: 0 };
    }

    if (normalized.startsWith('insert into user_refresh_tokens')) {
      if (normalized.includes('do nothing')) {
        const [userId, tokenId, tokenHash, deviceId, expiresAt, revokedAt] = params as [
          number,
          string,
          string,
          string,
          Date,
          Date | null
        ];
        const deviceKey = `${userId}:${deviceId}`;
        if (this.refreshTokensByDevice.has(deviceKey)) {
          return { rows: [], rowCount: 0 };
        }
        const row: RefreshTokenRow = {
          userId,
          tokenId,
          tokenHash,
          deviceId,
          userAgent: null,
          ipAddress: null,
          expiresAt: new Date(expiresAt),
          revokedAt: revokedAt ? new Date(revokedAt) : null
        };
        this.refreshTokensByHash.set(tokenHash, row);
        this.refreshTokensByDevice.set(deviceKey, tokenHash);
        return { rows: [], rowCount: 1 };
      }

      const [userId, tokenId, tokenHash, deviceId, userAgent, ipAddress, expiresAt] = params as [
        number,
        string,
        string,
        string,
        string | null,
        string | null,
        Date
      ];
      const deviceKey = `${userId}:${deviceId}`;
      const previousHash = this.refreshTokensByDevice.get(deviceKey);
      if (previousHash && previousHash !== tokenHash) {
        this.refreshTokensByHash.delete(previousHash);
      }
      const row: RefreshTokenRow = {
        userId,
        tokenId,
        tokenHash,
        deviceId,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt: new Date(expiresAt),
        revokedAt: null
      };
      this.refreshTokensByHash.set(tokenHash, row);
      this.refreshTokensByDevice.set(deviceKey, tokenHash);
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith('select user_id, token_id, device_id, user_agent, ip_address, expires_at, revoked_at from user_refresh_tokens where token_hash = $1')) {
      const tokenHash = params[0];
      const entry = this.refreshTokensByHash.get(tokenHash);
      if (!entry) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [{
          user_id: entry.userId,
          token_id: entry.tokenId,
          token_hash: entry.tokenHash,
          device_id: entry.deviceId,
          user_agent: entry.userAgent,
          ip_address: entry.ipAddress,
          expires_at: entry.expiresAt,
          revoked_at: entry.revokedAt
        }],
        rowCount: 1
      };
    }

    if (normalized.startsWith('update user_refresh_tokens set revoked_at = now(), updated_at = now() where token_hash = $1')) {
      const tokenHash = params[0];
      const entry = this.refreshTokensByHash.get(tokenHash);
      if (entry) {
        entry.revokedAt = new Date();
        this.refreshTokensByHash.set(tokenHash, entry);
      }
      return { rows: [], rowCount: entry ? 1 : 0 };
    }

    if (normalized.startsWith('update user_refresh_tokens set revoked_at = now(), updated_at = now() where user_id = $1 and revoked_at is null')) {
      const userId = params[0];
      let count = 0;
      for (const [hash, entry] of this.refreshTokensByHash.entries()) {
        if (entry.userId === userId && entry.revokedAt === null) {
          entry.revokedAt = new Date();
          this.refreshTokensByHash.set(hash, entry);
          count += 1;
        }
      }
      return { rows: [], rowCount: count };
    }

    if (normalized.startsWith('select * from usuarios where email = $1 and ativo = true')) {
      const email = params[0];
      const user = Array.from(this.users.values()).find((u) => u.email === email && u.ativo);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (normalized.startsWith('select * from usuarios where id = $1 and ativo = true')) {
      const id = params[0];
      const user = this.users.get(id);
      return { rows: user && user.ativo ? [user] : [], rowCount: user && user.ativo ? 1 : 0 };
    }

    if (normalized.startsWith('update usuarios set ultimo_login')) {
      return { rows: [], rowCount: 1 };
    }

    if (normalized.startsWith('select id, email, papel as role, ativo from usuarios where id = $1')) {
      const user = this.users.get(params[0]);
      if (!user) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [{ id: user.id, email: user.email, role: user.papel, ativo: user.ativo }],
        rowCount: 1
      };
    }

    if (normalized.startsWith('select ativo from usuarios where id = $1')) {
      const user = this.users.get(params[0]);
      if (!user) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [{ ativo: user.ativo }], rowCount: 1 };
    }

    throw new Error(`Unhandled SQL in PoolMock: ${sql}`);
  }
}

class RedisMock {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode && mode.toUpperCase() === 'EX' && typeof ttl === 'number') {
      expiresAt = Date.now() + ttl * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

describe('AuthService refresh tokens with device metadata', () => {
  const originalRedisHost = env.REDIS_HOST;
  let pool: PoolMock;
  let redis: RedisMock;
  let service: AuthService;

  beforeEach(() => {
    env.REDIS_HOST = undefined;
    pool = new PoolMock();
    redis = new RedisMock();
    service = new AuthService(pool as unknown as Pool, redis as unknown as RedisClient);

    const baseDate = new Date();
    pool.users.set(1, {
      id: 1,
      email: 'user@example.com',
      senha_hash: bcrypt.hashSync('secret', 8),
      nome: 'Usuário Teste',
      papel: 'admin',
      ativo: true,
      avatar_url: null,
      ultimo_login: null,
      data_criacao: baseDate,
      data_atualizacao: baseDate
    });
  });

  afterEach(() => {
    env.REDIS_HOST = originalRedisHost;
  });

  it('persists device metadata and rotates refresh tokens por dispositivo', async () => {
    const loginA = await service.login('user@example.com', 'secret', '10.0.0.1', 'device-a', 'UA-A');
    const loginB = await service.login('user@example.com', 'secret', '10.0.0.2', 'device-b', 'UA-B');

    expect(loginA).not.toBeNull();
    expect(loginB).not.toBeNull();

    const refreshA = loginA?.refreshToken;
    const refreshB = loginB?.refreshToken;

    expect(refreshA).toBeDefined();
    expect(refreshB).toBeDefined();

    const hashA = createHash('sha256').update(refreshA!).digest('hex');
    const hashB = createHash('sha256').update(refreshB!).digest('hex');

    expect(pool.refreshTokensByHash.get(hashA)).toMatchObject({
      deviceId: 'device-a',
      userAgent: 'UA-A',
      ipAddress: '10.0.0.1',
      revokedAt: null
    });
    expect(pool.refreshTokensByHash.get(hashB)).toMatchObject({
      deviceId: 'device-b',
      userAgent: 'UA-B',
      ipAddress: '10.0.0.2',
      revokedAt: null
    });

    const rotated = await service.renewAccessToken(refreshA!, {
      deviceId: 'device-a',
      userAgent: 'UA-A',
      ipAddress: '10.0.0.3'
    });

    expect(rotated.refreshToken).toBeDefined();
    expect(rotated.refreshToken).not.toEqual(refreshA);

    const newHashA = createHash('sha256').update(rotated.refreshToken!).digest('hex');
    expect(pool.refreshTokensByHash.has(hashA)).toBe(false);
    expect(pool.refreshTokensByHash.get(newHashA)).toMatchObject({
      deviceId: 'device-a',
      userAgent: 'UA-A',
      ipAddress: '10.0.0.3',
      revokedAt: null
    });

    expect(pool.refreshTokensByHash.get(hashB)?.revokedAt).toBeNull();

    await service.revokeRefreshToken(refreshB!, {
      deviceId: 'device-b',
      userAgent: 'UA-B',
      ipAddress: '10.0.0.2'
    });

    expect(pool.refreshTokensByHash.get(hashB)?.revokedAt).toBeInstanceOf(Date);

    await expect(
      service.renewAccessToken(refreshB!, {
        deviceId: 'device-b',
        userAgent: 'UA-B',
        ipAddress: '10.0.0.2'
      })
    ).rejects.toThrow('Refresh token inválido');
  });

  it('rejects expired refresh tokens and marca como revogado', async () => {
    const payload = { id: 1, email: 'user@example.com', role: 'admin' as const };
    const refreshToken = await service.generateRefreshToken(payload, {
      deviceId: 'device-expired',
      userAgent: 'UA-Expired',
      ipAddress: '10.0.0.4'
    });

    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = pool.refreshTokensByHash.get(hash);
    if (!stored) {
      throw new Error('Refresh token não foi persistido no mock');
    }

    stored.expiresAt = new Date(Date.now() - 1000);
    pool.refreshTokensByHash.set(hash, stored);

    expect(pool.refreshTokensByHash.get(hash)?.expiresAt.getTime()).toBeLessThan(Date.now());

    await expect(
      service.refreshWithToken(refreshToken, {
        deviceId: 'device-expired',
        userAgent: 'UA-Expired',
        ipAddress: '10.0.0.4'
      })
    ).rejects.toThrow('Refresh token expirado');

    expect(pool.refreshTokensByHash.get(hash)?.revokedAt).toBeInstanceOf(Date);
  });
});
