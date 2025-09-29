import request from 'supertest';
import express from 'express';

const originalEnableLoginRateLimit = process.env.ENABLE_LOGIN_RATE_LIMIT;

jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((_req: any, _res: any, next: any) => next()),
  requireGestor: jest.fn((_req: any, _res: any, next: any) => next()),
  requireProfissional: jest.fn(),
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../../services', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    getProfile: jest.fn(),
    generateToken: jest.fn()
  }
}));

jest.mock('../../middleware/auth.security', () => {
  const actual = jest.requireActual('../../middleware/auth.security');
  return {
    ...actual,
    recordFailedAttempt: jest.fn().mockResolvedValue(undefined)
  };
});

import { apiRoutes } from '../api';
import { authService } from '../../services';
import {
  loginRateLimiter,
  recordFailedAttempt
} from '../../middleware/auth.security';
import { db } from '../../services/db';

const app = express();
app.use(express.json());
app.use(apiRoutes);

const resetRateLimiter = () => {
  loginRateLimiter.resetKey?.('::ffff:127.0.0.1');
  loginRateLimiter.resetKey?.('127.0.0.1');
};

describe('POST /auth/login security middlewares', () => {
  beforeAll(() => {
    process.env.ENABLE_LOGIN_RATE_LIMIT = '1';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiter();
  });

  afterAll(() => {
    process.env.ENABLE_LOGIN_RATE_LIMIT = originalEnableLoginRateLimit;
  });

  it('should limit excessive login attempts', async () => {
    const loginMock = authService.login as jest.MockedFunction<typeof authService.login>;
    const recordMock = recordFailedAttempt as jest.MockedFunction<typeof recordFailedAttempt>;
    loginMock.mockResolvedValue(null);

    const dbQuerySpy = jest.spyOn(db, 'query').mockResolvedValue([]);

    const maxAttempts = (loginRateLimiter as any).options?.max ?? 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong-password' });

      expect(response.status).toBe(401);
    }

    const blockedResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error).toContain('Muitas tentativas de login');
    expect(recordMock).toHaveBeenCalledTimes(maxAttempts);

    dbQuerySpy.mockRestore();
  });

  it('should block temporarily locked accounts', async () => {
    const loginMock = authService.login as jest.MockedFunction<typeof authService.login>;
    const recordMock = recordFailedAttempt as jest.MockedFunction<typeof recordFailedAttempt>;
    loginMock.mockResolvedValue(null);

    const futureBlock = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const dbQuerySpy = jest
      .spyOn(db, 'query')
      .mockResolvedValue([{ blocked_until: futureBlock } as any]);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'any-password' });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Conta temporariamente bloqueada');
    expect(loginMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();

    dbQuerySpy.mockRestore();
  });
});
