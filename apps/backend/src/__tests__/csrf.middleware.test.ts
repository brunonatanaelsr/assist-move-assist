import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

import { csrfMiddleware } from '../middleware/csrf';

function setupTestApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.post('/protected', csrfMiddleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('csrfMiddleware integration', () => {

  it('should block requests without CSRF token', async () => {
    const app = setupTestApp();
    const response = await request(app).post('/protected').send({ value: 'test' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'CSRF token inválido' });
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should block requests with invalid CSRF token', async () => {
    const app = setupTestApp();
    const response = await request(app)
      .post('/protected')
      .set('Cookie', 'csrf_token=valid-token')
      .set('X-CSRF-Token', 'invalid-token')
      .send({ value: 'test' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'CSRF token inválido' });
  });

  it('should allow requests with a valid CSRF token', async () => {
    const token = 'valid-token';

    const app = setupTestApp();
    const response = await request(app)
      .post('/protected')
      .set('Cookie', `csrf_token=${token}`)
      .set('X-CSRF-Token', token)
      .send({ value: 'test' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
