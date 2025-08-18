import { Router } from 'express';
import authRoutes from './auth';
import beneficiariasRoutes from './beneficiarias';
import dashboardRoutes from './dashboard';
import healthRoutes from './health';

const router = Router();

router.use('/auth', authRoutes);
router.use('/beneficiarias', beneficiariasRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);

export { router as apiRoutes };
export default router;
