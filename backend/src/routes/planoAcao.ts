import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { planoAcaoController } from '../controllers/planoAcaoController';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Função helper para verificar permissões
const verificarPermissao = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};

// Rotas para Plano de Ação
router.get('/planos-acao', 
  verificarPermissao(['admin', 'profissional']), 
  planoAcaoController.listar
);

router.get('/planos-acao/:id', 
  verificarPermissao(['admin', 'profissional']), 
  planoAcaoController.obterPorId
);

router.post('/planos-acao', 
  verificarPermissao(['admin', 'profissional']), 
  planoAcaoController.criar
);

router.put('/planos-acao/:id', 
  verificarPermissao(['admin', 'profissional']), 
  planoAcaoController.atualizar
);

export default router;
