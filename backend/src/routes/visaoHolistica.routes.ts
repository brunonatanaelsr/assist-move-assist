import { Router } from 'express';
import { authenticateToken, requireProfissional } from '../middleware/auth';
import { visaoHolisticaController } from '../controllers/visaoHolistica.controller';

const router = Router();

router.get('/:beneficiariaId', authenticateToken, visaoHolisticaController.get);
router.post('/', authenticateToken, requireProfissional, visaoHolisticaController.create);

export default router;
