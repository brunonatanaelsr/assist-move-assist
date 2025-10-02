import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import { planoAcaoController } from '../controllers/planoAcaoController';
import { planoAcaoSchema } from '../validators/planoAcao.validator';
import { z } from '../openapi/init';

const router = Router();

router.use(authenticateToken);

router.get('/', authorize('formularios.ler'), planoAcaoController.listar);
router.get('/:id', authorize('formularios.ler'), planoAcaoController.obterPorId);

router.post(
  '/',
  authorize('formularios.criar'),
  validateRequest(z.object({ body: planoAcaoSchema })),
  planoAcaoController.criar
);

router.put(
  '/:id',
  authorize('formularios.editar'),
  validateRequest(z.object({ body: planoAcaoSchema.partial() })),
  planoAcaoController.atualizar
);

export default router;
