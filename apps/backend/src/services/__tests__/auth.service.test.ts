import { createHash } from 'node:crypto';
import { AuthService } from '../auth.service';
import type { Pool } from 'pg';
import type { RedisClient } from '../../lib/redis';

type RefreshTokenRow = {
  userId: number;
  expiresAt: Date;
  revoked: boolean;
};

type UserRow = {
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
};

class PoolMock {
  public users = new Map<number, UserRow>();
  public refreshTokens = new Map<string, RefreshTokenRow>();

  async query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const trimmed = sql.trim().toLowerCase();

    if (trimmed.startsWith('create table if not exists refresh_tokens')) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('create index if not exists')) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('select * from usuarios')) {
      const email = params[0];
      const user = Array.from(this.users.values()).find((u) => u.email === email && u.ativo);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (trimmed.startsWith('update usuarios set ultimo_login')) {
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith('select id, email, papel as role, ativo from usuarios where id = $1')) {
      const user = this.users.get(params[0]);
      if (!user) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [{ id: user.id, email: user.email, role: user.papel, ativo: user.ativo }],
        rowCount: 1
      };
    }

    if (trimmed.startsWith('select ativo from usuarios where id = $1')) {
      const user = this.users.get(params[0]);
      if (!user) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [{ ativo: user.ativo }], rowCount: 1 };
    }

    if (trimmed.startsWith('insert into refresh_tokens')) {
      const [tokenHash, userId, expiresAt] = params as [string, number, Date];
      this.refreshTokens.set(tokenHash, {
        userId,
        expiresAt: new Date(expiresAt),
        revoked: false
      });
      return { rows: [], rowCount: 1 };
    }

    if (trimmed.startsWith('select user_id, expires_at, revoked from refresh_tokens')) {
      const tokenHash = params[0];
      const entry = this.refreshTokens.get(tokenHash);
      if (!entry) {
        return { rows: [], rowCount: 0 };
      }
      return {
        rows: [{ user_id: entry.userId, expires_at: entry.expiresAt, revoked: entry.revoked }],
        rowCount: 1
      };
    }

    if (trimmed.startsWith('update refresh_tokens set revoked = true')) {
      const tokenHash = params[0];
      const entry = this.refreshTokens.get(tokenHash);
      if (entry) {
        entry.revoked = true;
        this.refreshTokens.set(tokenHash, entry);
      }
      return { rows: [], rowCount: entry ? 1 : 0 };
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

describe('AuthService refresh tokens', () => {
  let pool: PoolMock;
  let redis: RedisMock;
  let service: AuthService;

  beforeEach(() => {
    pool = new PoolMock();
    redis = new RedisMock();
    service = new AuthService(pool as unknown as Pool, redis as unknown as RedisClient);

    const baseDate = new Date();
    pool.users.set(1, {
      id: 1,
      email: 'user@example.com',
      senha_hash: 'hash',
      nome: 'Usuário Teste',
      papel: 'admin',
      ativo: true,
      avatar_url: null,
      ultimo_login: null,
      data_criacao: baseDate,
      data_atualizacao: baseDate
    });
  });

  it('rotates refresh tokens on successful renewal', async () => {
    const payload = { id: 1, email: 'user@example.com', role: 'admin' };
    const originalRefresh = await service.generateRefreshToken(payload);
    const originalHash = createHash('sha256').update(originalRefresh).digest('hex');

    const result = await service.refreshWithToken(originalRefresh);

    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toEqual(originalRefresh);

    const storedOriginal = pool.refreshTokens.get(originalHash);
    expect(storedOriginal?.revoked).toBe(true);

    const newHash = createHash('sha256').update(result.refreshToken).digest('hex');
    const storedNew = pool.refreshTokens.get(newHash);
    expect(storedNew).toBeDefined();
    expect(storedNew?.revoked).toBe(false);
  });

  it('rejects expired refresh tokens', async () => {
    const payload = { id: 1, email: 'user@example.com', role: 'admin' };
    const refreshToken = await service.generateRefreshToken(payload);
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const entry = pool.refreshTokens.get(tokenHash);
    if (!entry) {
      throw new Error('Refresh token não foi persistido no mock');
    }
    
    // Define uma data de expiração no passado
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Token expirado há 1 dia
    entry.expiresAt = expiredDate;
    
    pool.refreshTokens.set(tokenHash, entry);

    // Verifica se o erro é lançado corretamente
      await expect(service.refreshWithToken(refreshToken))
        .rejects.toThrow('Refresh token expirado');    const revokedEntry = pool.refreshTokens.get(tokenHash);
    expect(revokedEntry?.revoked).toBe(true);
  });
});
