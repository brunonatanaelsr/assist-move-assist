import { db } from '../services/db';
import { Redis } from 'ioredis';
import { loggerService } from '../services/logger';

const CACHE_TTL = 300; // 5 minutos
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
});

interface DashboardStats {
  totalBeneficiarias: number;
  totalOficinas: number;
  totalAtendimentos: number;
  monthlyStats: MonthlyStats[];
  statusDistribution: StatusCount[];
}

interface MonthlyStats {
  month: Date;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface Activity {
  type: string;
  id: number;
  description: string;
  created_at: Date;
  created_by_name: string;
}

class DashboardService {
  async getStats(userId: number, userRole: string): Promise<DashboardStats> {
    const cacheKey = `dashboard:stats:${userRole}`;
    
    // Tentar buscar do cache
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    // Query principal usando SQL parametrizado
    const stats = await db.query<DashboardStats>(`
      SELECT
        (SELECT COUNT(*) FROM beneficiarias WHERE ativo = true) as total_beneficiarias,
        (SELECT COUNT(*) FROM oficinas WHERE ativo = true) as total_oficinas,
        (SELECT COUNT(*) FROM atendimentos WHERE ativo = true) as total_atendimentos
    `);

    // Estatísticas mensais
    const monthlyStats = await db.query<MonthlyStats>(`
      SELECT 
        date_trunc('month', created_at) as month,
        COUNT(*) as count
      FROM beneficiarias 
      WHERE created_at >= date_trunc('year', CURRENT_DATE)
      GROUP BY date_trunc('month', created_at)
      ORDER BY month
    `);

    // Distribuição por status
    const statusDistribution = await db.query<StatusCount>(`
      SELECT 
        status,
        COUNT(*) as count
      FROM beneficiarias
      GROUP BY status
    `);

    const result = {
      ...stats[0],
      monthlyStats,
      statusDistribution
    };

    // Salvar no cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async getRecentActivities(userId: number, userRole: string, page: number = 1, limit: number = 10): Promise<{
    activities: Activity[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // Buscar total de atividades
    const [totalCount] = await db.query<{count: number}>(`
      SELECT COUNT(*) as count
      FROM (
        SELECT id FROM beneficiarias
        UNION ALL
        SELECT id FROM anamneses_social
      ) as combined_activities
    `);

    // Buscar atividades paginadas
    const activities = await db.query<Activity>(`
      SELECT * FROM (
        SELECT 
          'beneficiaria_created' as type,
          b.id,
          b.nome_completo,
          b.created_at,
          NULL::text as created_by_name
        FROM beneficiarias b
        
        UNION ALL
        
        SELECT 
          'anamnese_created' as type,
          a.id,
          b.nome_completo as beneficiaria_nome,
          a.created_at,
          u.nome as created_by_name
        FROM anamneses_social a
        LEFT JOIN beneficiarias b ON a.beneficiaria_id = b.id
        LEFT JOIN usuarios u ON a.created_by = u.id
      ) as combined_activities
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return {
      activities: activities.map(activity => ({
        ...activity,
        description: this.getActivityDescription(activity)
      })),
      total: parseInt(totalCount.count),
      hasMore: totalCount.count > offset + activities.length
    };
  }

  private getActivityDescription(activity: Activity): string {
    switch (activity.type) {
      case 'beneficiaria_created':
        return `Beneficiária ${activity.nome_completo} foi cadastrada por ${activity.created_by_name || 'Sistema'}`;
      case 'anamnese_created':
        return `Anamnese criada para ${activity.beneficiaria_nome} por ${activity.created_by_name || 'Sistema'}`;
      default:
        return 'Atividade não especificada';
    }
  }

  async getNotifications(userId: number, unreadOnly: boolean = false, limit?: number): Promise<any[]> {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      params.push(limit);
      query += ' LIMIT $2';
    }

    return db.query(query, params);
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await db.query(`
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [notificationId, userId]);

    return result.length > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.query(`
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE user_id = $1 AND read_at IS NULL
    `, [userId]);
  }

  async getQuickAccessLinks(userRole: string): Promise<any[]> {
    const cacheKey = `quick-access:${userRole}`;
    
    // Tentar buscar do cache
    const cachedLinks = await redis.get(cacheKey);
    if (cachedLinks) {
      return JSON.parse(cachedLinks);
    }

    const links = this.generateQuickAccessLinks(userRole);
    
    // Salvar no cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(links));

    return links;
  }

  private generateQuickAccessLinks(userRole: string): any[] {
    switch (userRole) {
      case 'admin':
        return [
          { label: 'Cadastrar Beneficiária', route: '/beneficiarias/cadastro', icon: 'user-plus' },
          { label: 'Gerenciar Usuários', route: '/usuarios', icon: 'users' },
          { label: 'Relatórios', route: '/relatorios', icon: 'file-text' },
          { label: 'Configurações', route: '/configuracoes', icon: 'settings' },
          { label: 'Analytics', route: '/analytics', icon: 'bar-chart' }
        ];
      case 'profissional':
        return [
          { label: 'Cadastrar Beneficiária', route: '/beneficiarias/cadastro', icon: 'user-plus' },
          { label: 'Anamneses', route: '/formularios/anamnese', icon: 'clipboard' },
          { label: 'Declarações', route: '/formularios/declaracao', icon: 'file' },
          { label: 'Feed', route: '/feed', icon: 'rss' },
          { label: 'Mensagens', route: '/mensagens', icon: 'message-circle' }
        ];
      default:
        return [
          { label: 'Meu Perfil', route: '/perfil', icon: 'user' },
          { label: 'Feed', route: '/feed', icon: 'rss' },
          { label: 'Mensagens', route: '/mensagens', icon: 'message-circle' }
        ];
    }
  }
}

export const dashboardService = new DashboardService();
