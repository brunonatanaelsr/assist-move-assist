import express from 'express';
import request from 'supertest';

import { setupSecurity } from '../config/security';

describe('setupSecurity', () => {
  const createApp = () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use(express.urlencoded({ extended: true }));

    setupSecurity(testApp);

    testApp.get('/ping', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    testApp.post('/echo', (req, res) => {
      res.status(200).json({ body: req.body });
    });

    return testApp;
  };

  it('applies security headers from helmet', async () => {
    const app = createApp();

    const response = await request(app).get('/ping');

    expect(response.status).toBe(200);
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sanitizes malicious payloads to prevent nosql injection and xss', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send({
        name: "<script>alert('hack')</script>",
        attack: { $set: { role: 'admin' } }
      });

    expect(response.status).toBe(200);
    expect(response.body.body.name).not.toContain('<script>');
    expect(response.body.body.attack).toEqual({});
  });
});
