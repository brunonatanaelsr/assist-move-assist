import {
  getDashboardStats,
  getRecentActivities,
  getActivitiesAlias,
  getDashboardTasks,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getQuickAccessLinks
} from '../dashboard.controller';
import { dashboardService } from '../../services/dashboard.service';

jest.mock('../../services/dashboard.service', () => ({
  dashboardService: {
    getStats: jest.fn(),
    getRecentActivities: jest.fn(),
    getTasks: jest.fn(),
    getNotifications: jest.fn(),
    markNotificationAsRead: jest.fn(),
    markAllNotificationsAsRead: jest.fn(),
    getQuickAccessLinks: jest.fn()
  }
}));

describe('DashboardController', () => {
  let mockReq: any;
  let mockRes: any;
  const serviceMock = dashboardService as jest.Mocked<typeof dashboardService>;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
      user: { id: 1, role: 'admin' }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  it('deve retornar estatísticas do dashboard', async () => {
    const stats = { total: 1 };
    serviceMock.getStats.mockResolvedValue(stats as any);

    await getDashboardStats(mockReq, mockRes);

    expect(serviceMock.getStats).toHaveBeenCalledWith('admin');
    expect(mockRes.json).toHaveBeenCalledWith(stats);
  });

  it('deve tratar erro ao buscar estatísticas', async () => {
    serviceMock.getStats.mockRejectedValue(new Error('erro'));

    await getDashboardStats(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('deve retornar atividades recentes', async () => {
    const activities = { activities: [] };
    serviceMock.getRecentActivities.mockResolvedValue(activities as any);
    mockReq.query = { limit: '5' };

    await getRecentActivities(mockReq, mockRes);

    expect(serviceMock.getRecentActivities).toHaveBeenCalledWith('admin', 5);
    expect(mockRes.json).toHaveBeenCalledWith(activities);
  });

  it('deve reutilizar handler de atividades no alias', async () => {
    const activities = { activities: [{ id: 1 }] };
    serviceMock.getRecentActivities.mockResolvedValue(activities as any);

    await getActivitiesAlias(mockReq, mockRes);

    expect(serviceMock.getRecentActivities).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(activities);
  });

  it('deve retornar tarefas do dashboard', async () => {
    const tasks = [{ id: '1' }];
    serviceMock.getTasks.mockResolvedValue(tasks as any);

    await getDashboardTasks(mockReq, mockRes);

    expect(serviceMock.getTasks).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(tasks);
  });

  it('deve retornar notificações', async () => {
    const notifications = [{ id: 1 }];
    serviceMock.getNotifications.mockResolvedValue(notifications as any);

    await getNotifications(mockReq, mockRes);

    expect(serviceMock.getNotifications).toHaveBeenCalledWith(1, false, 10);
    expect(mockRes.json).toHaveBeenCalledWith({ notifications });
  });

  it('deve marcar notificação como lida', async () => {
    serviceMock.markNotificationAsRead.mockResolvedValue(true);
    mockReq.params = { id: '2' };

    await markNotificationAsRead(mockReq, mockRes);

    expect(serviceMock.markNotificationAsRead).toHaveBeenCalledWith(2, 1);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Notificação marcada como lida' });
  });

  it('deve retornar 404 ao marcar notificação inexistente', async () => {
    serviceMock.markNotificationAsRead.mockResolvedValue(false);
    mockReq.params = { id: '3' };

    await markNotificationAsRead(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('deve marcar todas notificações como lidas', async () => {
    serviceMock.markAllNotificationsAsRead.mockResolvedValue();

    await markAllNotificationsAsRead(mockReq, mockRes);

    expect(serviceMock.markAllNotificationsAsRead).toHaveBeenCalledWith(1);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Todas as notificações foram marcadas como lidas' });
  });

  it('deve retornar links de acesso rápido', async () => {
    const links = [{ route: '/' }];
    serviceMock.getQuickAccessLinks.mockResolvedValue(links as any);

    await getQuickAccessLinks(mockReq, mockRes);

    expect(serviceMock.getQuickAccessLinks).toHaveBeenCalledWith('admin');
    expect(mockRes.json).toHaveBeenCalledWith({ quickAccess: links });
  });
});
