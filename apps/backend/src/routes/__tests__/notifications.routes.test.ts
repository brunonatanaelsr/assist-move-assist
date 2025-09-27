import request from 'supertest';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.REDIS_DISABLED = 'true';

const mockUser = {
  id: '99',
  role: 'admin',
  email: 'admin@move.com'
};

const authenticateToken = jest.fn((req: any, _res: any, next: any) => {
  req.user = mockUser;
  next();
});

const passThroughMiddleware = jest.fn((_req: any, _res: any, next: any) => next());

jest.mock('../../middleware/auth', () => ({
  AuthService: {
    login: jest.fn(),
    getProfile: jest.fn(),
    register: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    verifyToken: jest.fn()
  },
  authenticateToken,
  requireProfissional: passThroughMiddleware,
  requireAdmin: passThroughMiddleware,
  requireGestor: passThroughMiddleware,
  requirePermissions: () => passThroughMiddleware,
  requireRole: () => passThroughMiddleware,
  authorize: () => passThroughMiddleware,
  PERMISSIONS: {}
}));

jest.mock('../../config/database', () => {
  const pool = { query: jest.fn() };
  return {
    __esModule: true,
    pool,
    default: pool
  };
});

const { pool } = require('../../config/database');
const poolQueryMock = pool.query as jest.Mock;

const { apiRoutes } = require('../api');

const app = express();
app.use(express.json());
app.use(apiRoutes);

describe('Notifications routes - delete notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateToken.mockImplementation((req: any, _res: any, next: any) => {
      req.user = mockUser;
      next();
    });
  });

  it('should delete a notification belonging to the authenticated user', async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 55 }] });

    const response = await request(app)
      .delete('/notifications/55')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { id: 55 } });
    expect(poolQueryMock).toHaveBeenCalledWith(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [55, Number(mockUser.id)]
    );
  });

  it('should return 404 when notification does not exist for the user', async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .delete('/notifications/123')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: 'Notificação não encontrada' });
    expect(poolQueryMock).toHaveBeenCalledWith(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [123, Number(mockUser.id)]
    );
  });

  it('should prevent deletion when request is not authenticated', async () => {
    authenticateToken.mockImplementationOnce((req: any, res: any) => {
      res.status(401).json({ error: 'Token de acesso requerido' });
    });

    const response = await request(app)
      .delete('/notifications/10');

    expect(response.status).toBe(401);
    expect(poolQueryMock).not.toHaveBeenCalled();
  });
});
