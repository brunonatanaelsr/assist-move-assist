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
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema
} from '../validators/auth.validator';
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
  deviceId?: string;
}

interface LogoutRequestBody {
  refreshToken?: string;
  deviceId?: string;
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
  const rawRefreshExpiry = env.JWT_REFRESH_EXPIRY;

  if (typeof rawRefreshExpiry === 'number') {
    return rawRefreshExpiry * 1000;
  }

  if (typeof rawRefreshExpiry === 'string' && rawRefreshExpiry.trim().length > 0) {
    const parsed = ms(rawRefreshExpiry as ms.StringValue);
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
    const userAgent = req.get('user-agent') || null;
    const deviceId = req.body.deviceId ?? null;
    const result = await authService.login(
      req.body.email,
      req.body.password,
      ipAddress,
      deviceId,
      userAgent
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

const logoutHandler: RequestHandler<
  EmptyParams,
  { message: string } | { error: string },
  LogoutRequestBody
> = async (req, res) => {
  const refreshToken = extractRefreshToken(req);
  const deviceId = req.body?.deviceId ?? null;
  const userAgent = req.get('user-agent') || null;
  const revocationMetadata = { deviceId, userAgent };

  if (refreshToken) {
    try {
      loggerService.info('Processando logout com metadados de dispositivo', revocationMetadata);
      await authService.revokeRefreshToken(refreshToken, revocationMetadata);
    } catch (error) {
      loggerService.warn('Falha ao revogar refresh token no logout', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  clearAuthCookie(res);
  clearRefreshCookie(res);
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
      res.status(400).json({ error: 'Refresh token é obrigatório' });
      return;
    }

    const userAgent = req.get('user-agent') || null;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const deviceId = req.body?.deviceId ?? null;

    const result = await authService.renewAccessToken(refreshToken, {
      deviceId,
      userAgent,
      ipAddress
    });

    setAuthCookie(res, result.token);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }

    const role = result.user.papel ?? (result.user as { role?: string }).role ?? '';

    res.json({
      message: 'Token renovado',
      token: result.token,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        role
      }
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
router.post('/logout', logoutHandler);
router.post('/refresh', validateRequest(refreshTokenSchema), refreshHandler);
router.post('/refresh-token', validateRequest(refreshTokenSchema), refreshHandler);
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

function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response): void {
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
