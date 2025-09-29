import type { Express } from 'express';
import request from 'supertest';
import type supertest from 'supertest';

export interface CsrfContext {
  cookie: string;
  token: string;
}

export function extractCsrfCookie(setCookies: string[] | undefined): string | undefined {
  if (!setCookies) return undefined;
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    if (!pair) continue;
    const [name, ...rest] = pair.split('=');
    if (name?.trim() !== 'csrf_token') continue;
    return `csrf_token=${rest.join('=').trim()}`;
  }
  return undefined;
}

export function isSignedCsrfCookie(cookie: string | undefined): boolean {
  if (!cookie) return false;
  const [, ...rest] = cookie.split('=');
  if (!rest.length) return false;
  const value = decodeURIComponent(rest.join('='));
  if (!value.startsWith('s:')) return false;
  const [, signature] = value.split('.');
  return Boolean(signature);
}

export async function fetchCsrfToken(app: Express): Promise<CsrfContext> {
  const response = await request(app).get('/api/csrf-token');
  const setCookies = response.headers['set-cookie'] as string[] | undefined;
  const csrfCookie = extractCsrfCookie(setCookies);
  const token = response.body?.csrfToken as string | undefined;

  if (!csrfCookie || !token) {
    throw new Error('Falha ao obter token CSRF para os testes.');
  }

  return { cookie: csrfCookie, token };
}

export async function withCsrf(
  app: Express,
  test: supertest.Test,
  options: { cookies?: string[] } = {}
): Promise<supertest.Test> {
  const { cookie, token } = await fetchCsrfToken(app);
  const extraCookies = options.cookies ?? [];
  const cookieHeader = [cookie, ...extraCookies].filter(Boolean).join('; ');

  if (cookieHeader) {
    test.set('Cookie', cookieHeader);
  }
  return test.set('X-CSRF-Token', token);
}
