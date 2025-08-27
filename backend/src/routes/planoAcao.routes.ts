import { Router } from 'express';
import { planoAcaoController } from '../controllers/planoAcaoController';
import { authMiddleware, verificarPerfil, verificarPermissao } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(verificarPerfil);

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

export { router as planoAcaoRoutes };
