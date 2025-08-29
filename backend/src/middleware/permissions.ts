import { Request, Response, NextFunction } from 'express';
import { PERMISSIONS } from './auth';
import { db } from '../services/db';

export function requirePermissions(permissions: PERMISSIONS[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({ 
          success: false, 
          message: 'Não autenticado' 
        });
        return;
      }

      // Verificar permissões do usuário
      const userPermissions = await db.query(
        `SELECT p.permission_name
         FROM user_permissions up
         JOIN permissions p ON up.permission_id = p.id
         WHERE up.user_id = $1`,
        [user.id]
      );

      const hasPermission = permissions.every(permission =>
        (userPermissions as any[]).some((row: any) => row.permission_name === permission)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar este recurso'
        });
        return;
      }

      return next();
    } catch (error) {
      return next(error as any);
    }
  };
}
