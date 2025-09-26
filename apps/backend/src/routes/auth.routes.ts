import type { CookieOptions, RequestHandler, Response } from 'express';
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import { loggerService } from '../services/logger';
import { authService } from '../services';
import { env } from '../config/env';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
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
  user: {
    id: number;
    email?: string;
    role: string;
  };
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
    const result = await authService.login(req.body.email, req.body.password, ipAddress);

    if (!result) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    setAuthCookie(res, result.token);
    res.json({
      message: 'Login realizado com sucesso',
      token: result.token,
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
    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token: result.token,
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
const refreshHandler: RequestHandler<EmptyParams, RefreshResponse | { error: string }> = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { id, email, role, permissions } = req.user;

    if (!email) {
      loggerService.warn('Usuário autenticado sem e-mail ao renovar token', { userId: id });
      res.status(400).json({ error: 'Sessão inválida' });
      return;
    }

    const token = authService.generateToken({ id, email, role, permissions });
    setAuthCookie(res, token);
    res.json({
      message: 'Token renovado',
      token,
      user: { id, email, role }
    });
  } catch (error) {
    handleUnexpectedError(res, error, 'Erro ao renovar token');
  }
};

router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/register', validateRequest(registerSchema), registerHandler);
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout realizado com sucesso' });
});
router.post('/refresh', authenticateToken, refreshHandler);
router.post('/refresh-token', authenticateToken, refreshHandler);
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

function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token', COOKIE_OPTIONS);
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

export default router;
