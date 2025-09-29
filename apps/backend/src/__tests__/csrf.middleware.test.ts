import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

import { csrfMiddleware } from '../middleware/csrf';

function setupTestApp() {
  const app = express();
  app.use(cookieParser('test-secret'));
  app.use(express.json());
  app.use(csrfMiddleware);
  app.get('/api/csrf-token', (_req, res) => {
    res.status(200).json({ csrfToken: res.locals.csrfToken });
  });
  app.post('/protected', (_req, res) => {
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

  it('should reject unsigned legacy CSRF tokens and issue a new one', async () => {
    const token = 'legacy-token';
    const app = setupTestApp();

    const response = await request(app)
      .post('/protected')
      .set('Cookie', `csrf_token=${token}`)
      .set('X-CSRF-Token', token)
      .send({ value: 'test' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'CSRF token inválido' });

    const setCookies = response.headers['set-cookie'] as string[] | undefined;
    expect((setCookies?.some((cookie) => cookie.startsWith('csrf_token='))) ?? false).toBe(true);
    expect((setCookies?.some((cookie) => cookie.includes('csrf_token=s%3A'))) ?? false).toBe(true);
  });

  it('should expose a signed CSRF token via GET /api/csrf-token', async () => {
    const app = setupTestApp();

    const response = await request(app).get('/api/csrf-token');

    expect(response.status).toBe(200);
    expect(typeof response.body.csrfToken).toBe('string');
    expect(response.body.csrfToken).toHaveLength(32);

    const cookies = response.headers['set-cookie'] as string[] | undefined;
    expect((cookies?.some((cookie) => cookie.startsWith('csrf_token='))) ?? false).toBe(true);
    expect((cookies?.some((cookie) => cookie.includes('csrf_token=s%3A'))) ?? false).toBe(true);
  });

  it('should accept POST requests when cookie and header tokens match', async () => {
    const app = setupTestApp();

    const tokenResponse = await request(app).get('/api/csrf-token');
    const cookies = tokenResponse.headers['set-cookie'] as string[] | undefined;
    const cookieHeader = cookies?.[0]?.split(';')[0] ?? '';

    const postResponse = await request(app)
      .post('/protected')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', tokenResponse.body.csrfToken)
      .send({ value: 'test' });

    expect(postResponse.status).toBe(200);
    expect(postResponse.body).toEqual({ ok: true });
  });
});
