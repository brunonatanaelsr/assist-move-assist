import request from 'supertest';
import express from 'express';

jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((_req: any, _res: any, next: any) => next()),
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

import authRoutes from '../auth.routes';
import { authService } from '../../services';
import {
  loginRateLimiter,
  recordFailedAttempt
} from '../../middleware/auth.security';
import { db } from '../../services/db';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const resetRateLimiter = () => {
  loginRateLimiter.resetKey?.('::ffff:127.0.0.1');
  loginRateLimiter.resetKey?.('127.0.0.1');
};

describe('POST /auth/login security middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiter();
  });

  it('should limit excessive login attempts', async () => {
    const loginMock = authService.login as jest.MockedFunction<typeof authService.login>;
    const recordMock = recordFailedAttempt as jest.MockedFunction<typeof recordFailedAttempt>;
    loginMock.mockResolvedValue(null);

    // Mock db.query to simulate block state
    const dbQuerySpy = jest.spyOn(db, 'query')
      .mockResolvedValueOnce([{ blocked_until: null }]) // First attempt
      .mockResolvedValueOnce([{ blocked_until: null }]) // Second attempt
      .mockResolvedValueOnce([{ blocked_until: null }]) // Third attempt
      .mockResolvedValueOnce([{ blocked_until: null }]) // Fourth attempt
      .mockResolvedValueOnce([{ blocked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString() }]); // Fifth attempt

    for (let attempt = 0; attempt < 5; attempt += 1) {
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
    expect(recordMock).toHaveBeenCalledTimes(5);

    dbQuerySpy.mockRestore();
  });

  it('should block temporarily locked accounts', async () => {
    const loginMock = authService.login as jest.MockedFunction<typeof authService.login>;
    const recordMock = recordFailedAttempt as jest.MockedFunction<typeof recordFailedAttempt>;
    loginMock.mockResolvedValue(null);

    const futureBlock = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const dbQuerySpy = jest
      .spyOn(db, 'query')
      .mockResolvedValue([{ blocked_until: futureBlock }]);

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
