import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const isIdempotent = (method?: string) => !method || ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

function parseCookies(cookieHeader?: string | string[]) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const list = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const raw of list) {
    raw.split(';').forEach((part) => {
      const [k, ...v] = part.split('=');
      if (!k) return;
      cookies[k.trim()] = decodeURIComponent(v.join('=').trim());
    });
  }
  return cookies;
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies['csrf_token'];

    // Gera token se ausente
    if (!token) {
      token = crypto.randomBytes(16).toString('hex');
      res.cookie('csrf_token', token, {
        httpOnly: false, // precisa ser legível no cliente
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      } as any);
    }

    res.locals.csrfToken = token;

    // Apenas métodos mutantes exigem validação
    if (isIdempotent(req.method)) return next();

    const headerToken = (req.headers['x-csrf-token'] as string) || '';
    if (!headerToken || headerToken !== token) {
      return res.status(403).json({ error: 'CSRF token inválido' });
    }

    return next();
  } catch (e) {
    return res.status(400).json({ error: 'Falha na validação CSRF' });
  }
}

