import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { logger } from '../utils/logger';

export class DashboardController {
  constructor(private service: DashboardService) {}

  async getDashboard(req: Request, res: Response) {
    try {
      const filters = {
        periodo: req.query.inicio && req.query.fim ? {
          inicio: new Date(req.query.inicio as string),
          fim: new Date(req.query.fim as string)
        } : undefined
      };

      const dashboard = await this.service.getDashboard(filters);
      res.json(dashboard);
    } catch (error) {
      logger.error('Erro ao buscar dashboard:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
  }

  async refreshCache(req: Request, res: Response) {
    try {
      await this.service.refreshCache();
      res.json({ message: 'Cache atualizado com sucesso' });
    } catch (error) {
      logger.error('Erro ao atualizar cache:', error);
      res.status(500).json({ error: 'Erro ao atualizar cache do dashboard' });
    }
  }
}
