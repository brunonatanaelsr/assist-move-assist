import request from 'supertest';
import express from 'express';

jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return {
    ...actual,
    authenticateToken: jest.fn(async (req, _res, next) => {
      req.user = {
        id: '42',
        email: 'user@example.com',
        role: 'user',
        permissions: []
      } as any;
      return next();
    })
  };
});

import notificationsRoutes from '../routes/notifications.routes';
import { pool } from '../config/database';

const app = express();
app.use(express.json());
app.use('/notifications', notificationsRoutes);

const mockedPool = pool as unknown as { query: jest.Mock };

describe('POST /notifications/push-subscription', () => {
  const mockedQuery = mockedPool.query;

  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it('persists the subscription and returns success response', async () => {
    const subscriptionRow = {
      id: 1,
      user_id: 42,
      endpoint: 'https://example.com/sub',
      expiration_time: null,
      p256dh: 'p256dh-value',
      auth: 'auth-value',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockedQuery.mockResolvedValue({ rowCount: 1, rows: [subscriptionRow] });

    const response = await request(app)
      .post('/notifications/push-subscription')
      .send({
        endpoint: 'https://example.com/sub',
        expirationTime: null,
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' }
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(mockedQuery.mock.calls[0][0]).toContain('INSERT INTO push_subscriptions');
    expect(mockedQuery.mock.calls[0][1]).toEqual([
      42,
      'https://example.com/sub',
      null,
      'p256dh-value',
      'auth-value'
    ]);
  });

  it('returns 400 when payload is invalid', async () => {
    const response = await request(app)
      .post('/notifications/push-subscription')
      .send({ keys: { p256dh: '', auth: '' } });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockedQuery).not.toHaveBeenCalled();
  });
});
