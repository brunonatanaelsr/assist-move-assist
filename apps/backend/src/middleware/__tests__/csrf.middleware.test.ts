import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it } from '@jest/globals';

import { csrfMiddleware } from '../csrf';

const extractCsrfCookie = (setCookies: string[] | undefined): string | undefined => {
  if (!setCookies) return undefined;
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    if (!pair) continue;
    const [name, ...rest] = pair.split('=');
    if (name?.trim() !== 'csrf_token') continue;
    return `csrf_token=${rest.join('=').trim()}`;
  }
  return undefined;
};

const isSignedCsrfCookie = (cookie: string | undefined): boolean => {
  if (!cookie) return false;
  const [, ...rest] = cookie.split('=');
  if (!rest.length) return false;
  const value = decodeURIComponent(rest.join('='));
  if (!value.startsWith('s:')) return false;
  const [, signature] = value.split('.');
  return Boolean(signature);
};

describe('csrfMiddleware', () => {
  const buildApp = () => {
    const app = express();
    app.use(cookieParser('test-secret'));
    app.use(express.json());
    app.use(csrfMiddleware);
    app.get('/csrf-token', (req, res) => {
      res.status(200).json({ csrfToken: res.locals.csrfToken });
    });
    app.post('/protected', (req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  };

  it('rejects tampered cookies and issues a new signed token', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/protected')
      .set('Cookie', 'csrf_token=s%3Atampered.fake')
      .set('X-CSRF-Token', 'fake')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'CSRF token inválido');

    const setCookies = res.headers['set-cookie'] as string[] | undefined;
    const csrfCookie = extractCsrfCookie(setCookies);
    expect(csrfCookie).toBeDefined();
    expect(isSignedCsrfCookie(csrfCookie)).toBe(true);

    const [, rawValue] = csrfCookie!.split('=');
    expect(rawValue).toBeDefined();
    const decodedValue = decodeURIComponent(rawValue ?? '');
    expect(decodedValue).toMatch(/^s:[a-f0-9]+\.[^.;]+/);
    expect(decodedValue).not.toContain('fake');
  });

  it('allows requests when cookie and header match', async () => {
    const app = buildApp();

    const tokenRes = await request(app).get('/csrf-token');
    const setCookies = tokenRes.headers['set-cookie'] as string[] | undefined;
    const csrfCookie = extractCsrfCookie(setCookies);
    expect(csrfCookie).toBeDefined();
    const csrfToken = tokenRes.body?.csrfToken as string | undefined;

    expect(isSignedCsrfCookie(csrfCookie)).toBe(true);
    expect(csrfToken).toBeDefined();

    const res = await request(app)
      .post('/protected')
      .set('Cookie', csrfCookie!)
      .set('X-CSRF-Token', csrfToken ?? '')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('accepts legacy unsigned cookies and reissues a signed cookie', async () => {
    const app = buildApp();
    const legacyToken = 'legacy-token';

    const res = await request(app)
      .post('/protected')
      .set('Cookie', `csrf_token=${legacyToken}`)
      .set('X-CSRF-Token', legacyToken)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const setCookies = res.headers['set-cookie'] as string[] | undefined;
    const csrfCookie = extractCsrfCookie(setCookies);
    expect(csrfCookie).toBeDefined();
    expect(isSignedCsrfCookie(csrfCookie)).toBe(true);
  });
});
