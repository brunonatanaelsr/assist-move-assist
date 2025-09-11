import express from 'express';
import type { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { loggerService } from '../services/logger';
import { authService } from '../services';

interface RequestWithBody<T = any> {
  body: T;
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
}

type AuthRequestWithBody<T> = express.Request & { body: T; user?: any };

interface LoginRequestBody {
  email: string;
  password: string;
}

interface RegisterRequestBody {
  email: string;
  password: string;
  nome_completo: string;
  role: string;
}

interface UpdateProfileBody {
  nome_completo?: string;
  avatar_url?: string;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

const router = express.Router();

// Rota base /api/auth
router.use((req, res, next) => {
  loggerService.info(`[AUTH] ${req.method} ${req.originalUrl}`);
  next();
});

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction, // em dev, permitir cookies sem HTTPS
  sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 dia
};

// POST /auth/login
router.post('/login', async (req: RequestWithBody<LoginRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Email e senha são obrigatórios'
      });
      return;
    }

    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const result = await authService.login(email, password, ipAddress);
    loggerService.info('[AUTH] login result ' + String(!!result));

    if (!result) {
      res.status(401).json({
        error: 'Credenciais inválidas'
      });
      return;
    }

    // Em dev/CI, o token no corpo é suficiente para os smokes/E2E
    // Evite depender de cookies para reduzir falhas ambientais

    loggerService.info('[AUTH] sending response');
    res.json({
      message: 'Login realizado com sucesso',
      token: result.token,
      user: result.user
    });
    return;
  } catch (error: any) {
    loggerService.error('Erro no endpoint de login:', error);
    const payload: any = { error: 'Erro interno do servidor' };
    if (process.env.NODE_ENV !== 'production') {
      payload.detail = String(error?.message || 'unknown');
    }
    res.status(500).json(payload);
    return;
  }
});

// POST /auth/logout
router.post('/logout', async (_req, res: Response): Promise<void> => {
  try {
    res.clearCookie('auth_token', {
      ...COOKIE_OPTIONS,
      // limpar funciona melhor sem sameSite muito restrito em dev
      sameSite: isProduction ? 'strict' : 'lax',
    } as any);
    res.json({ message: 'Logout realizado com sucesso' });
    return;
  } catch (error) {
    loggerService.error('Erro no endpoint de logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
    return;
  }
});

// POST /auth/refresh - renova token baseado no cookie/header válidos
router.post('/refresh', authenticateToken, async (req: any, res: Response): Promise<void> => {
  try {
    const payload = {
      id: Number(req.user!.id),
      email: String(req.user!.email),
      role: String(req.user!.role),
    };
    const token = authService.generateToken(payload);
    res.cookie('auth_token', token, COOKIE_OPTIONS);
    res.json({ message: 'Token renovado', user: payload });
    return;
  } catch (error) {
    loggerService.error('Erro ao renovar token:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
    return;
  }
});

// POST /auth/register
router.post('/register', async (req: RequestWithBody<RegisterRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password, nome_completo, role } = req.body;

    if (!email || !password || !nome_completo) {
      res.status(400).json({
        error: 'Email, senha e nome completo são obrigatórios'
      });
      return;
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Formato de email inválido'
      });
      return;
    }

    // Validação de senha
    if (password.length < 6) {
      res.status(400).json({
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
      return;
    }

    const result = await authService.register({
      email,
      password,
      nome_completo,
      role
    });

    res.cookie('auth_token', result.token, COOKIE_OPTIONS);

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      user: result.user
    });
    return;
  } catch (error: any) {
    loggerService.error('Erro no endpoint de registro:', error);
    
    if (error.message === 'Email já está em uso') {
      res.status(409).json({
        error: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// GET /auth/profile
router.get('/profile', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const profile = await authService.getProfile(Number(req.user!.id));

    if (!profile) {
      res.status(404).json({
        error: 'Perfil não encontrado'
      });
      return;
    }

    res.json({
      user: profile
    });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// PUT /auth/profile
router.put('/profile', authenticateToken, async (req: AuthRequestWithBody<UpdateProfileBody>, res: Response): Promise<void> => {
  try {
    const { nome_completo, avatar_url } = req.body;

    const updatedUser = await authService.updateProfile(Number(req.user!.id), {
      nome_completo,
      avatar_url
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
    return;
  } catch (error: any) {
    loggerService.error('Erro ao atualizar perfil:', error);
    res.status(400).json({
      error: error.message || 'Erro ao atualizar perfil'
    });
    return;
  }
});

// POST /auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequestWithBody<ChangePasswordBody>, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      });
      return;
    }

    await authService.changePassword(Number(req.user!.id), currentPassword, newPassword);

    res.json({
      message: 'Senha alterada com sucesso'
    });
    return;
  } catch (error: any) {
    loggerService.error('Erro ao alterar senha:', error);
    
    if (error.message === 'Senha atual incorreta' || error.message === 'Usuário não encontrado') {
      res.status(400).json({
        error: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// POST /auth/refresh-token
router.post('/refresh-token', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    // Gerar novo token com as informações atuais do usuário
    const newToken = authService.generateToken({ id: Number((req as any).user!.id), email: String((req as any).user!.email || ''), role: String((req as any).user!.role) });

    res.cookie('auth_token', newToken, COOKIE_OPTIONS);

    res.json({
      message: 'Token renovado com sucesso'
    });
    return;
  } catch (error) {
    loggerService.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// POST /auth/logout
export default router;
// GET /auth/me - alias para profile
router.get('/me', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const profile = await authService.getProfile(Number((req as any).user!.id));
    if (!profile) { res.status(404).json({ error: 'Perfil não encontrado' }); return; }
    res.json({ user: profile });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar /auth/me:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
    return;
  }
});
