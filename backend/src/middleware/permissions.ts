import { Response, NextFunction } from 'express';
import { PERMISSIONS, AuthenticatedRequest } from './auth';
import { db } from '../services/db';

export function requirePermissions(permissions: PERMISSIONS[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Não autenticado' 
        });
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
        userPermissions.rows.some(row => row.permission_name === permission)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar este recurso'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
