import { Request, Response, NextFunction, CookieOptions } from 'express';
import crypto from 'crypto';

const isIdempotent = (method?: string) => !method || ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // precisa ser legível no cliente
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  signed: true
};

type LegacyAwareRequest = Request & {
  csrfLegacyTokenAccepted?: boolean;
};

const getCookieToken = (req: LegacyAwareRequest): string | undefined => {
  const signedToken = req.signedCookies?.[CSRF_COOKIE_NAME];
  if (typeof signedToken === 'string' && signedToken.length > 0) {
    return signedToken;
  }

  const unsignedToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof unsignedToken === 'string' && unsignedToken.length > 0) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[csrf] Cookie não assinado detectado, emitindo versão assinada.');
    }
    req.csrfLegacyTokenAccepted = true;
    return unsignedToken;
  }

  return undefined;
};

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const legacyAwareReq = req as LegacyAwareRequest;
    let token = getCookieToken(legacyAwareReq);

    // Gera token se ausente
    if (!token) {
      token = crypto.randomBytes(16).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
    } else if (legacyAwareReq.csrfLegacyTokenAccepted) {
      res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
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

