import { Router } from 'express';
import { authenticateToken, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validationMiddleware';
import { planoAcaoController } from '../controllers/planoAcaoController';
import {
  createPlanoAcaoRequestSchema,
  updatePlanoAcaoRequestSchema
} from '../validation/schemas/planoAcao.schema';

const router = Router();

router.use(authenticateToken);

router.get('/', authorize('formularios.ler'), planoAcaoController.listar);
router.get('/:id', authorize('formularios.ler'), planoAcaoController.obterPorId);

router.post('/', authorize('formularios.criar'), validateRequest(createPlanoAcaoRequestSchema), planoAcaoController.criar);

router.put(
  '/:id',
  authorize('formularios.editar'),
  validateRequest(updatePlanoAcaoRequestSchema),
  planoAcaoController.atualizar
);

export default router;
