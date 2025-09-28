import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import { loggerService } from '../services/logger';
import { authService } from '../services';
import { env } from '../config/env';
import ms from 'ms';
import {
  checkLoginBlock,
  clearLoginAttempts,
  loginRateLimiter,
  recordFailedAttempt
} from '../middleware/auth.security';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  updateProfileSchema
} from '../validation/schemas/auth.schema';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest
} from '../types/auth';

const router = Router();

type EmptyParams = Record<string, never>;
type EmptyQuery = Record<string, never>;

interface LoginSuccessResponse extends AuthResponse {
  message: string;
}

interface RegisterSuccessResponse extends AuthResponse {
  message: string;
}

interface RefreshResponse {
  message: string;
  token: string;
  refreshToken?: string;
  user: {
    id: number;
    email?: string;
    role: string;
  };
}

interface RefreshRequestBody {
  refreshToken?: string;
}

const allowedSameSite = ['lax', 'strict', 'none'] as const;
type SameSiteOption = (typeof allowedSameSite)[number];

const resolvedSameSite = normalizeSameSite(env.AUTH_COOKIE_SAMESITE) ??
  (env.NODE_ENV === 'production' ? 'strict' : 'lax');

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production' || resolvedSameSite === 'none',
  sameSite: resolvedSameSite,
  maxAge: 24 * 60 * 60 * 1000
};

const REFRESH_COOKIE_MAX_AGE = (() => {
  if (typeof env.JWT_REFRESH_EXPIRY === 'number') {
    return env.JWT_REFRESH_EXPIRY * 1000;
  }
  if (typeof env.JWT_REFRESH_EXPIRY === 'string') {
    const parsed = ms(env.JWT_REFRESH_EXPIRY);
    if (typeof parsed === 'number' && !Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 7 * 24 * 60 * 60 * 1000;
})();

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  ...COOKIE_OPTIONS,
  maxAge: REFRESH_COOKIE_MAX_AGE
};

router.use((req, _res, next) => {
  loggerService.info(`[AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * Realiza a autenticação de um usuário e retorna o token de sessão juntamente com os dados básicos do perfil.
 */
const loginHandler: RequestHandler<
  EmptyParams,
  LoginSuccessResponse | { error: string },
  LoginRequest,
  EmptyQuery
> = async (
  req,
  res
) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await authService.login(
      req.body.email,
      req.body.password,
      ipAddress
    );

    if (!result) {
      await recordFailedAttempt(req.body.email, ipAddress);
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    await clearLoginAttempts(req.body.email);
    setAuthCookie(res, result.token);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }
    res.json({
      message: 'Login realizado com sucesso',
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    handleUnexpectedError(res, error, 'Erro no endpoint de login');
  }
};

/**
 * Registra um novo usuário e devolve um token de sessão válido para uso imediato.
 */
const registerHandler: RequestHandler<
  EmptyParams,
  RegisterSuccessResponse | { error: string },
  RegisterRequest,
  EmptyQuery
> = async (
  req,
  res
) => {
  try {
    const result = await authService.register(req.body);
    setAuthCookie(res, result.token);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email já está em uso') {
      res.status(409).json({ error: error.message });
      return;
    }

    handleUnexpectedError(res, error, 'Erro no endpoint de registro');
  }
};

/**
 * Atualiza informações básicas de perfil do usuário autenticado.
 */
const updateProfileHandler: RequestHandler<
  EmptyParams,
  { message: string; user: unknown } | { error: string },
  UpdateProfileRequest
> = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil';
    loggerService.error('Erro ao atualizar perfil:', error);
    res.status(400).json({ error: message });
  }
};

/**
 * Altera a senha do usuário após validar a senha atual.
 */
const changePasswordHandler: RequestHandler<
  EmptyParams,
  { message: string } | { error: string },
  ChangePasswordRequest
> = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Senha atual incorreta' || error.message === 'Usuário não encontrado')) {
      res.status(400).json({ error: error.message });
      return;
    }

    handleUnexpectedError(res, error, 'Erro ao alterar senha');
  }
};

// Handler de logout que revoga refresh token e limpa cookies de sessão
const logoutHandler: RequestHandler<EmptyParams, { message: string } | { error: string }, Record<string, unknown>> = async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  if (refreshToken) {
    try {
      await authService.revokeRefreshToken(refreshToken);
    } catch (error) {
      loggerService.warn('Falha ao revogar refresh token no logout', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Limpa cookies de sessão
  clearSessionCookies(res);
  res.json({ message: 'Logout realizado com sucesso' });
};
/**
 * Retorna os dados de perfil do usuário autenticado.
 */
const profileHandler: RequestHandler<EmptyParams, { user: unknown } | { error: string }> = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const profile = await authService.getProfile(req.user.id);

    if (!profile) {
      res.status(404).json({ error: 'Perfil não encontrado' });
      return;
    }

    res.json({ user: profile });
  } catch (error) {
    handleUnexpectedError(res, error, 'Erro ao buscar perfil');
  }
};

/**
 * Regenera o token JWT baseado na sessão atual.
 */
const refreshHandler: RequestHandler<
  EmptyParams,
  RefreshResponse | { error: string },
  RefreshRequestBody
> = async (req, res) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token não fornecido' });
      return;
    }

    const result = await authService.refreshWithToken(refreshToken);

    setAuthCookie(res, result.token);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }

    res.json({
      message: 'Token renovado',
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    if (error instanceof Error) {
      loggerService.warn('Falha ao renovar token com refresh', {
        error: error.message
      });
      res.status(401).json({ error: 'Refresh token inválido ou expirado' });
      return;
    }

    handleUnexpectedError(res, error, 'Erro ao renovar token');
      user: result.user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao renovar token';
    res.status(401).json({ error: message });
>>>>>>> origin/codex/resolve-merge-conflicts-in-auth-service
  }
};

router.post(
  '/login',
  loginRateLimiter,
  checkLoginBlock,
  validateRequest(loginSchema),
  loginHandler
);
router.post('/register', validateRequest(registerSchema), registerHandler);
<<<<<<< HEAD
router.post('/logout', logoutHandler);
router.post('/refresh', validateRequest(refreshTokenSchema), refreshHandler);
router.post('/refresh-token', validateRequest(refreshTokenSchema), refreshHandler);
=======
router.post('/logout', async (req, res) => {
  const refreshToken = getCookieValue(req, 'refresh_token');
  if (refreshToken) {
    try {
      await authService.revokeRefreshToken(refreshToken);
    } catch (error) {
      loggerService.warn('Não foi possível revogar refresh token no logout', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  clearSessionCookies(res);
  res.json({ message: 'Logout realizado com sucesso' });
});
router.post('/refresh', refreshHandler);
router.post('/refresh-token', refreshHandler);
>>>>>>> origin/codex/resolve-merge-conflicts-in-auth-service
router.get('/profile', authenticateToken, profileHandler);
router.get('/me', authenticateToken, profileHandler);
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), updateProfileHandler);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), changePasswordHandler);

function setAuthCookie(res: Response, token: string): void {
  try {
    res.cookie('auth_token', token, COOKIE_OPTIONS);
  } catch (error) {
    loggerService.warn('Não foi possível definir cookie de autenticação', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function setRefreshCookie(res: Response, token: string): void {
  try {
    res.cookie('refresh_token', token, REFRESH_COOKIE_OPTIONS);
  } catch (error) {
    loggerService.warn('Não foi possível definir cookie de refresh token', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function clearSessionCookies(res: Response): void {
  res.clearCookie('auth_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);
}

function handleUnexpectedError(res: Response, error: unknown, logMessage: string): void {
  loggerService.error(logMessage, error);
  const payload: Record<string, unknown> = { error: 'Erro interno do servidor' };
  if (env.NODE_ENV !== 'production' && error instanceof Error) {
    payload.detail = error.message;
  }
  res.status(500).json(payload);
}

function normalizeSameSite(value?: string | null): SameSiteOption | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase() as SameSiteOption;
  return allowedSameSite.includes(normalized) ? normalized : undefined;
}

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!target) {
    return undefined;
  }

  const [, value] = target.split('=');
  return value ? decodeURIComponent(value) : undefined;
}

function extractRefreshToken(req: Request): string | undefined {
  const providedToken = req.body?.refreshToken;
  return providedToken ?? getCookieValue(req.headers.cookie, 'refresh_token');
}
export default router;
