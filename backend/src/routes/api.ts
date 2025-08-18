import { Router } from 'express';
import authRoutes from './auth';
import beneficiariasRoutes from './beneficiarias';
import dashboardRoutes from './dashboard';
import healthRoutes from './health';
import relatoriosRoutes from './relatorios';

const router = Router();

router.use('/auth', authRoutes);
router.use('/beneficiarias', beneficiariasRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);
router.use('/relatorios', relatoriosRoutes);

export { router as apiRoutes };
export default router;
