import express from 'express';
import { AuthService, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { loggerService } from '../services/logger';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 dia
};

// POST /auth/login
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios'
      });
    }

    const result = await AuthService.login(email, password);

    if (!result) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      });
    }

    res.cookie('auth_token', result.token, COOKIE_OPTIONS);

    res.json({
      message: 'Login realizado com sucesso',
      user: result.user
    });
  } catch (error) {
    loggerService.error('Erro no endpoint de login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /auth/register
router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, nome_completo, role } = req.body;

    if (!email || !password || !nome_completo) {
      return res.status(400).json({
        error: 'Email, senha e nome completo são obrigatórios'
      });
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    // Validação de senha
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    const result = await AuthService.register({
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
  } catch (error: any) {
    loggerService.error('Erro no endpoint de registro:', error);
    
    if (error.message === 'Email já está em uso') {
      return res.status(409).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /auth/profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const profile = await AuthService.getProfile(req.user!.id);

    if (!profile) {
      return res.status(404).json({
        error: 'Perfil não encontrado'
      });
    }

    res.json({
      user: profile
    });
  } catch (error) {
    loggerService.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /auth/profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { nome_completo, avatar_url } = req.body;

    const updatedUser = await AuthService.updateProfile(req.user!.id, {
      nome_completo,
      avatar_url
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error: any) {
    loggerService.error('Erro ao atualizar perfil:', error);
    res.status(400).json({
      error: error.message || 'Erro ao atualizar perfil'
    });
  }
});

// POST /auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    await AuthService.changePassword(req.user!.id, currentPassword, newPassword);

    res.json({
      message: 'Senha alterada com sucesso'
    });
  } catch (error: any) {
    loggerService.error('Erro ao alterar senha:', error);
    
    if (error.message === 'Senha atual incorreta' || error.message === 'Usuário não encontrado') {
      return res.status(400).json({
        error: error.message
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /auth/refresh-token
router.post('/refresh-token', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    // Gerar novo token com as informações atuais do usuário
    const newToken = AuthService.generateToken({
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.cookie('auth_token', newToken, COOKIE_OPTIONS);

    res.json({
      message: 'Token renovado com sucesso'
    });
  } catch (error) {
    loggerService.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /auth/logout
router.post('/logout', async (req: express.Request, res: express.Response) => {
  try {
    res.clearCookie('auth_token', COOKIE_OPTIONS);

    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    loggerService.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
