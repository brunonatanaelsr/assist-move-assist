import express from 'express';
import request from 'supertest';

import { applySecurity } from '../middleware/security.middleware';

describe('Security middleware', () => {
  it('applies expected security headers', async () => {
    const app = express();
    applySecurity(app);
    app.get('/health-check', (_req, res) => {
      res.json({ ok: true });
    });

    const response = await request(app).get('/health-check');

    expect(response.headers).toHaveProperty('x-dns-prefetch-control', 'off');
    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
    expect(response.headers).toHaveProperty('content-security-policy');
  });
});
