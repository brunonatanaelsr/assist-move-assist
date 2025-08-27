import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { DashboardService } from '../services/DashboardService';
import { DashboardRepository } from '../repositories/DashboardRepository';
import { pool } from '../config/database';
import { redis } from '../config/redis';

const router = Router();
const repository = new DashboardRepository(pool, redis);
const service = new DashboardService(repository, redis);
const controller = new DashboardController(service);

router.get('/dashboard', controller.getDashboard.bind(controller));
router.post('/dashboard/refresh', controller.refreshCache.bind(controller));

export default router;
