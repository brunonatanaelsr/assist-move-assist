import pool from '../config/database';
import redisClient from '../config/redis';
import { db } from '../services/db';
import { DashboardRepository } from '../repositories/DashboardRepository';

const CACHE_TTL = 300; // 5 minutos

class DashboardService {
  constructor(private readonly repository: DashboardRepository = new DashboardRepository(pool, redisClient)) {}

  async getStats(userRole: string) {
    const cacheKey = `dashboard:stats:${userRole}`;

    const cachedStats = await redisClient.get(cacheKey);
    if (cachedStats) {
      return JSON.parse(cachedStats);
    }

    const baseStats = await db.getStats();
    let additionalStats: Record<string, unknown> = {};

    if (userRole === 'admin' || userRole === 'profissional') {
      const [monthlyStats, statusStats] = await Promise.all([
        db.query(`
          SELECT
            date_trunc('month', created_at) as month,
            COUNT(*) as count
          FROM beneficiarias
          WHERE created_at >= date_trunc('year', CURRENT_DATE)
          GROUP BY date_trunc('month', created_at)
          ORDER BY month
        `),
        db.query(`
          SELECT
            status,
            COUNT(*) as count
          FROM beneficiarias
          GROUP BY status
        `)
      ]);

      additionalStats = {
        monthlyRegistrations: monthlyStats,
        statusDistribution: statusStats
      };
    }

    const result = {
      ...baseStats,
      ...additionalStats
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async getRecentActivities(userRole: string, limit: number = 10) {
    if (userRole !== 'admin' && userRole !== 'profissional') {
      return { activities: [] };
    }

    const [recentBeneficiarias, recentFormularios] = await Promise.all([
      db.query(`
        SELECT
          'beneficiaria_created' as type,
          b.id,
          b.nome_completo,
          b.created_at,
          NULL::text as created_by_name
        FROM beneficiarias b
        ORDER BY b.created_at DESC
        LIMIT $1
      `, [limit]),
      db.query(`
        SELECT
          'formulario_created' as type,
          f.id,
          b.nome_completo as beneficiaria_nome,
          f.tipo as formulario_tipo,
          f.created_at,
          u.nome as created_by_name
        FROM formularios f
        LEFT JOIN beneficiarias b ON f.beneficiaria_id = b.id
        LEFT JOIN usuarios u ON f.usuario_id = u.id
        ORDER BY f.created_at DESC
        LIMIT $1
      `, [limit])
    ]);

    const activities = [
      ...recentBeneficiarias.map((item: any) => ({
        ...item,
        description: `Beneficiária ${item.nome_completo} foi cadastrada por ${item.created_by_name || 'Sistema'}`
      })),
      ...recentFormularios.map((item: any) => ({
        ...item,
        description: `Formulário de ${item.formulario_tipo} criado para ${item.beneficiaria_nome} por ${item.created_by_name || 'Sistema'}`
      }))
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return { activities };
  }

  async getTasks() {
    const tarefasStats = await this.repository.getTarefasStats();

    return tarefasStats.map((stat: any, index: number) => {
      const totalPendentes = Number(stat.pendentes ?? 0);
      const totalTarefas = Number(stat.total_tarefas ?? 0);
      const totalConcluidas = Number(stat.concluidas ?? 0);
      const mediaDiasConclusao =
        stat.media_dias_conclusao !== null && stat.media_dias_conclusao !== undefined
          ? Number(stat.media_dias_conclusao)
          : null;
      const taxaConclusao =
        stat.taxa_conclusao !== null && stat.taxa_conclusao !== undefined
          ? Number(stat.taxa_conclusao)
          : null;

      const priority = totalPendentes >= 10
        ? 'Alta'
        : totalPendentes >= 5
          ? 'Média'
          : 'Baixa';

      const due = totalPendentes > 0
        ? `Em aberto (${totalPendentes} pendente${totalPendentes === 1 ? '' : 's'})`
        : 'Nenhuma pendência';

      return {
        id: stat.responsavel_id ? String(stat.responsavel_id) : `responsavel-${index}`,
        title: stat.responsavel_nome
          ? `Pendências de ${stat.responsavel_nome}`
          : 'Pendências sem responsável',
        due,
        priority,
        meta: {
          total: totalTarefas,
          pendentes: totalPendentes,
          concluidas: totalConcluidas,
          mediaDiasConclusao,
          taxaConclusao
        }
      };
    });
  }

  async getNotifications(userId: number, unreadOnly: boolean = false, limit?: number) {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params: Array<string | number> = [userId];

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    return db.query(query, params);
  }

  async markNotificationAsRead(notificationId: number, userId: number) {
    const result = await db.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id`,
      [notificationId, userId]
    );

    return result.length > 0;
  }

  async markAllNotificationsAsRead(userId: number) {
    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [userId]
    );
  }

  async getQuickAccessLinks(userRole: string) {
    const cacheKey = `quick-access:${userRole}`;

    const cachedLinks = await redisClient.get(cacheKey);
    if (cachedLinks) {
      return JSON.parse(cachedLinks);
    }

    const links = this.generateQuickAccessLinks(userRole);

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(links));

    return links;
  }

  private generateQuickAccessLinks(userRole: string) {
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
