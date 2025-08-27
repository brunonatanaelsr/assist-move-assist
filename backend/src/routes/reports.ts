import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { ReportsController } from '../controllers/reportsController';

const router = Router();
const reportsController = new ReportsController();

// Rotas do dashboard
router.get('/dashboard', isAuthenticated, reportsController.getDashboardMetrics);
router.get('/projects/:id', isAuthenticated, reportsController.getProjectMetrics);
router.get('/forms/:id', isAuthenticated, reportsController.getFormMetrics);
router.get('/regional', isAuthenticated, reportsController.getRegionalMetrics);

// Rotas de templates
router.get('/templates', isAuthenticated, reportsController.getTemplates);
router.post('/templates', isAuthenticated, reportsController.createTemplate);
router.put('/templates/:id', isAuthenticated, reportsController.updateTemplate);
router.delete('/templates/:id', isAuthenticated, reportsController.deleteTemplate);

// Rota de exportação
router.post('/export/:templateId', isAuthenticated, reportsController.exportReport);

export default router;
