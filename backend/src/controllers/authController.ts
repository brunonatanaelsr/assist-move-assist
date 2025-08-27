import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { Pool } from 'pg';
import { ValidationError } from '../utils/errors';
import { validateSchema } from '../middleware/validateSchema';
import { z } from 'zod';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'user';
  };
}

// Esquemas de validação
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres')
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  nome_completo: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  cargo: z.string().optional(),
  departamento: z.string().optional(),
  telefone: z.string().optional()
});

const changePasswordSchema = z.object({
  senha_atual: z.string(),
  nova_senha: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres'),
  confirmar_senha: z.string()
}).refine((data) => data.nova_senha === data.confirmar_senha, {
  message: "As senhas não conferem",
  path: ["confirmar_senha"]
});

const updateProfileSchema = z.object({
  nome_completo: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').optional(),
  cargo: z.string().optional(),
  departamento: z.string().optional(),
  telefone: z.string().optional(),
  foto_url: z.string().url('URL inválida').optional()
});

export function createAuthRouter(pool: Pool) {
  const router = Router();
  const authService = new AuthService(pool);

  router.post('/login', validateSchema(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, senha } = req.body;
      const result = await authService.login(email, senha);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/register', validateSchema(registerSchema), async (req, res, next) => {
    try {
      const userData = req.body;
      const user = await authService.register(userData);
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  router.post('/change-password', validateSchema(changePasswordSchema), async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { senha_atual, nova_senha } = req.body;

      if (!userId) {
        throw new ValidationError('Usuário não autenticado');
      }

      await authService.changePassword(userId, senha_atual, nova_senha);
      res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  });

  router.put('/profile', validateSchema(updateProfileSchema), async (req, res, next) => {
    try {
      const { userId } = req.user;
      
      if (!userId) {
        throw new ValidationError('Usuário não autenticado');
      }

      const updatedUser = await authService.updateProfile(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  router.get('/profile', async (req, res, next) => {
    try {
      const { userId } = req.user;

      if (!userId) {
        throw new ValidationError('Usuário não autenticado');
      }

      const user = await authService.getUserById(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
