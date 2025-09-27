import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { loggerService } from '../services/logger';

const getUserRole = (req: Request): string => {
  return ((req as any).user?.role as string) ?? 'default';
};

const getUserId = (req: Request): number => {
  return Number((req as any).user?.id ?? 0);
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const role = getUserRole(req);
    const stats = await dashboardService.getStats(role);

    return res.json(stats);
  } catch (error) {
    loggerService.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const role = getUserRole(req);
    const activities = await dashboardService.getRecentActivities(role, Number(limit));

    return res.json(activities);
  } catch (error) {
    loggerService.error('Erro ao buscar atividades recentes:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getActivitiesAlias = async (req: Request, res: Response) => {
  const limit = (req.query.limit as string) || '10';
  (req as any).query.limit = limit;
  return getRecentActivities(req, res);
};

export const getDashboardTasks = async (_req: Request, res: Response) => {
  try {
    const tasks = await dashboardService.getTasks();
    return res.json(tasks);
  } catch (error) {
    loggerService.error('Erro ao buscar tarefas do dashboard:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { limit = '10', unread_only = 'false' } = req.query;
    const notifications = await dashboardService.getNotifications(
      getUserId(req),
      unread_only === 'true',
      Number(limit)
    );

    return res.json({ notifications });
  } catch (error) {
    loggerService.error('Erro ao buscar notificações:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await dashboardService.markNotificationAsRead(Number(id), getUserId(req));

    if (!success) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    return res.json({
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    loggerService.error('Erro ao marcar notificação como lida:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    await dashboardService.markAllNotificationsAsRead(getUserId(req));
    return res.json({
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    loggerService.error('Erro ao marcar todas as notificações como lidas:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

export const getQuickAccessLinks = async (req: Request, res: Response) => {
  try {
    const links = await dashboardService.getQuickAccessLinks(getUserRole(req));

    return res.json({ quickAccess: links });
  } catch (error) {
    loggerService.error('Erro ao buscar links de acesso rápido:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};
