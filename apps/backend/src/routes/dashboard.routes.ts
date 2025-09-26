import express from 'express';
import { db } from '../services/db';
import { authenticateToken } from '../middleware/auth';
import { loggerService } from '../services/logger';
import type Redis from 'ioredis';
import { DashboardRepository } from '../repositories/DashboardRepository';
import { pool } from '../config/database';
import redis from '../lib/redis';

const router = express.Router();
const dashboardRepository = new DashboardRepository(pool, redis as Redis);

// GET /dashboard/stats - Obter estatísticas do dashboard
router.get('/stats', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const stats = await db.getStats();
    
    // Estatísticas adicionais baseadas no perfil do usuário
    let additionalStats = {};
    
    const role = (req as any).user?.role;
    if (role === 'admin' || role === 'profissional') {
      // Estatísticas por período
      const monthlyStats = await db.query(`
        SELECT 
          date_trunc('month', created_at) as month,
          COUNT(*) as count
        FROM beneficiarias 
        WHERE created_at >= date_trunc('year', CURRENT_DATE)
        GROUP BY date_trunc('month', created_at)
        ORDER BY month
      `);

      // Status das beneficiárias
      const statusStats = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM beneficiarias
        GROUP BY status
      `);

      additionalStats = {
        monthlyRegistrations: monthlyStats,
        statusDistribution: statusStats
      };
    }

    res.json({
      ...stats,
      ...additionalStats
    });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// GET /dashboard/recent-activities - Atividades recentes
router.get('/recent-activities', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { limit = '10' } = req.query;

    // Buscar atividades recentes baseadas no perfil do usuário
    let activities = [];

    const role = (req as any).user?.role;
    if (role === 'admin' || role === 'profissional') {
      // Beneficiárias recentemente cadastradas
      const recentBeneficiarias = await db.query(`
        SELECT 
          'beneficiaria_created' as type,
          b.id,
          b.nome_completo,
          b.created_at,
          NULL::text as created_by_name
        FROM beneficiarias b
        ORDER BY b.created_at DESC
        LIMIT $1
      `, [Number(limit)]);

      // Formulários recentes
      const recentFormularios = await db.query(`
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
      `, [Number(limit)]);

      activities = [
        ...recentBeneficiarias.map(item => ({
          ...item,
          description: `Beneficiária ${item.nome_completo} foi cadastrada por ${item.created_by_name || 'Sistema'}`
        })),
        ...recentFormularios.map(item => ({
          ...item,
          description: `Formulário de ${item.formulario_tipo} criado para ${item.beneficiaria_nome} por ${item.created_by_name || 'Sistema'}`
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, Number(limit));
    }

    res.json({ activities });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar atividades recentes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// Alias: GET /dashboard/activities → recent-activities
router.get('/activities', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  // Delegate to recent-activities handler
  (req as any).query.limit = (req.query.limit as any) || '10';
  const handler = (router as any).stack.find((l: any) => l.route && l.route.path === '/recent-activities' && l.route.methods.get);
  if (handler) { (handler as any).handle_request(req, res, () => {}); return; }
  res.json({ activities: [] });
  return;
});

// GET /dashboard/tasks - tarefas pendentes (stub simples)
router.get('/tasks', authenticateToken, async (_req: express.Request, res: express.Response): Promise<void> => {
  try {
    const tarefasStats = await dashboardRepository.getTarefasStats();

    const tasks = tarefasStats.map((stat: any, index: number) => {
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

    res.json(tasks);
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar tarefas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
    return;
  }
});

// GET /dashboard/notifications - Notificações do usuário
router.get('/notifications', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { limit = '10', unread_only = 'false' } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [Number((req as any).user?.id ?? 0)];

    if (unread_only === 'true') {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC';
    
    if (limit) {
      params.push(Number(limit));
      query += ` LIMIT $${params.length}`;
    }

    const notifications = await db.query(query, params);

    res.json({ notifications });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// PUT /dashboard/notifications/:id/read - Marcar notificação como lida
router.put('/notifications/:id/read', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se a notificação pertence ao usuário
    const notification = await db.query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [id, (req as any).user!.id]
    );

    if (notification.length === 0) {
      res.status(404).json({
        error: 'Notificação não encontrada'
      });
      return;
    }

    // Marcar como lida
    await db.update('notifications', String(id), {
      read_at: new Date()
    });

    res.json({
      message: 'Notificação marcada como lida'
    });
    return;
  } catch (error) {
    loggerService.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// POST /dashboard/notifications/mark-all-read - Marcar todas como lidas
router.post('/notifications/mark-all-read', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [(req as any).user!.id]
    );

    res.json({
      message: 'Todas as notificações foram marcadas como lidas'
    });
    return;
  } catch (error) {
    loggerService.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

// GET /dashboard/quick-access - Links de acesso rápido baseados no perfil
router.get('/quick-access', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userRole = (req as any).user!.role;
    let quickAccess = [];

    // Links baseados no perfil do usuário
    if (userRole === 'admin') {
      quickAccess = [
        { label: 'Cadastrar Beneficiária', route: '/beneficiarias/cadastro', icon: 'user-plus' },
        { label: 'Gerenciar Usuários', route: '/usuarios', icon: 'users' },
        { label: 'Relatórios', route: '/relatorios', icon: 'file-text' },
        { label: 'Configurações', route: '/configuracoes', icon: 'settings' },
        { label: 'Analytics', route: '/analytics', icon: 'bar-chart' }
      ];
    } else if (userRole === 'profissional') {
      quickAccess = [
        { label: 'Cadastrar Beneficiária', route: '/beneficiarias/cadastro', icon: 'user-plus' },
        { label: 'Anamneses', route: '/formularios/anamnese', icon: 'clipboard' },
        { label: 'Declarações', route: '/formularios/declaracao', icon: 'file' },
        { label: 'Feed', route: '/feed', icon: 'rss' },
        { label: 'Mensagens', route: '/mensagens', icon: 'message-circle' }
      ];
    } else {
      quickAccess = [
        { label: 'Meu Perfil', route: '/perfil', icon: 'user' },
        { label: 'Feed', route: '/feed', icon: 'rss' },
        { label: 'Mensagens', route: '/mensagens', icon: 'message-circle' }
      ];
    }

    res.json({ quickAccess });
    return;
  } catch (error) {
    loggerService.error('Erro ao buscar links de acesso rápido:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
    return;
  }
});

export default router;
