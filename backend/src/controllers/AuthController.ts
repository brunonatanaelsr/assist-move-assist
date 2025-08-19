import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginRequest } from '../types/auth';
import { updatePasswordSchema } from '../validators/auth.validator';
import { AuthenticationError, ValidationError } from '../utils/errors';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials: LoginRequest = req.body;
      const result = await this.authService.login(credentials);
      res.json({
        success: true,
        data: result,
        message: 'Login realizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthenticationError('Usuário não autenticado');
      }

      const profile = await this.authService.getUserProfile(userId);
      res.json({
        success: true,
        data: profile,
        message: 'Dados do usuário carregados com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthenticationError('Usuário não autenticado');
      }

      const validatedData = updatePasswordSchema.parse(req.body);
      
      await this.authService.updatePassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
      );

      res.json({
        success: true,
        message: 'Senha atualizada com sucesso'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }
      next(error);
    }
  };

  logout = async (req: Request, res: Response) => {
    // No backend stateless, o logout é principalmente gerenciado pelo cliente
    // removendo o token. Aqui apenas confirmamos a operação.
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  };
}
