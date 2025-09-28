import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import {
  setupTestDatabase,
  teardownTestDatabase,
  truncateAllTables
} from '../../__tests__/helpers/database';

process.env.NODE_ENV = 'test';
process.env.REDIS_DISABLED = 'true';

const runIntegration = process.env.RUN_INTEGRATION === '1';

let testPool: Pool | null = null;
let app: express.Express | null = null;

const getPool = () => {
  if (!testPool) {
    throw new Error('Test pool not initialized');
  }
  return testPool;
};

jest.mock('../../config/database', () => {
  const handler: ProxyHandler<Pool> = {
    get(_target, prop) {
      if (!testPool) {
        throw new Error('Test pool not initialized');
      }
      const value = (testPool as any)[prop as keyof Pool];
      if (typeof value === 'function') {
        return value.bind(testPool);
      }
      return value;
    }
  };

  const proxy = new Proxy({} as Pool, handler);

  const execute = async (text: string, params?: any[]) => {
    if (!testPool) {
      throw new Error('Test pool not initialized');
    }
    return testPool.query(text, params);
  };

  return {
    pool: proxy,
    default: proxy,
    db: {
      query: async (text: string, params?: any[]) => {
        const result = await execute(text, params);
        return result.rows;
      }
    },
    executeQuery: execute,
    query: async (text: string, params?: any[]) => {
      const result = await execute(text, params);
      return result.rows;
    },
    transaction: async (callback: (client: any) => Promise<any>) => {
      if (!testPool) {
        throw new Error('Test pool not initialized');
      }
      const client = await testPool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    checkDbConnection: jest.fn(async () => ({ success: true }))
  };
});

const ensureApp = () => {
  if (!app) {
    throw new Error('Express app not initialized');
  }
  return app;
};

const seedUser = async (email: string, password: string) => {
  const pool = getPool();
  const senhaHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO usuarios (email, senha_hash, nome, papel, ativo)
     VALUES ($1, $2, 'Usuário Integração', 'admin', true)
     ON CONFLICT (email) DO NOTHING`,
    [email, senhaHash]
  );
};

beforeAll(async () => {
  if (!runIntegration) {
    console.warn('Integration tests disabled. Set RUN_INTEGRATION=1 to enable.');
    return;
  }

  const db = await setupTestDatabase();
  testPool = db.pool;

  const authRoutes = require('../auth.routes').default;
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/auth', authRoutes);
  app = expressApp;
});

beforeEach(async () => {
  if (!runIntegration) return;
  await truncateAllTables();
});

afterAll(async () => {
  if (!runIntegration) return;
  await teardownTestDatabase();
});

const maybeIt = runIntegration ? it : it.skip;

describe('Auth routes - login security (integration)', () => {
  maybeIt('bloqueia usuário após múltiplas tentativas de login falhas', async () => {
    if (!runIntegration) return;

    const email = 'login.integration@example.com';
    const senhaCorreta = 'Senha@123';

    await seedUser(email, senhaCorreta);

    const loginRequest = (password: string) =>
      request(ensureApp())
        .post('/auth/login')
        .send({ email, password });

    for (let i = 0; i < 5; i++) {
      const response = await loginRequest('senha-incorreta');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    }

    const blockResponse = await loginRequest('SenhaQualquer');
    expect(blockResponse.status).toBe(429);
    expect(blockResponse.body.error).toContain('Conta temporariamente bloqueada');

    const pool = getPool();
    const blockRecord = await pool.query(
      'SELECT * FROM user_blocks WHERE email = $1',
      [email]
    );
    expect(blockRecord.rowCount).toBe(1);

    await pool.query(
      `UPDATE user_blocks SET blocked_until = NOW() - INTERVAL '1 minute' WHERE email = $1`,
      [email]
    );

    const successResponse = await loginRequest(senhaCorreta);
    expect(successResponse.status).toBe(200);
    expect(successResponse.body).toHaveProperty('token');

    const attemptsAfterSuccess = await pool.query(
      'SELECT COUNT(*)::int AS total FROM login_attempts WHERE email = $1',
      [email]
    );
    expect(attemptsAfterSuccess.rows[0].total).toBe(0);

    const remainingBlocks = await pool.query(
      'SELECT COUNT(*)::int AS total FROM user_blocks WHERE email = $1',
      [email]
    );
    expect(remainingBlocks.rows[0].total).toBe(0);
  });
});
