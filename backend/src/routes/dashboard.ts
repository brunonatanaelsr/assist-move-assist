import express from 'express';
import { db } from '../services/db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { loggerService } from '../services/logger';

const router = express.Router();

// GET /dashboard/stats - Obter estatísticas do dashboard
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const stats = await db.getStats();
    
    // Estatísticas adicionais baseadas no perfil do usuário
    let additionalStats = {};
    
    if (req.user!.role === 'admin' || req.user!.role === 'profissional') {
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
  } catch (error) {
    loggerService.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /dashboard/recent-activities - Atividades recentes
router.get('/recent-activities', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { limit = '10' } = req.query;

    // Buscar atividades recentes baseadas no perfil do usuário
    let activities = [];

    if (req.user!.role === 'admin' || req.user!.role === 'profissional') {
      // Beneficiárias recentemente cadastradas
      const recentBeneficiarias = await db.query(`
        SELECT 
          'beneficiaria_created' as type,
          b.id,
          b.nome_completo,
          b.created_at,
          p.nome_completo as created_by_name
        FROM beneficiarias b
        LEFT JOIN profiles p ON b.created_by = p.id
        ORDER BY b.created_at DESC
        LIMIT $1
      `, [Number(limit)]);

      // Anamneses recentes
      const recentAnamneses = await db.query(`
        SELECT 
          'anamnese_created' as type,
          a.id,
          b.nome_completo as beneficiaria_nome,
          a.created_at,
          p.nome_completo as created_by_name
        FROM anamneses_social a
        LEFT JOIN beneficiarias b ON a.beneficiaria_id = b.id
        LEFT JOIN profiles p ON a.created_by = p.id
        ORDER BY a.created_at DESC
        LIMIT $1
      `, [Number(limit)]);

      activities = [
        ...recentBeneficiarias.map(item => ({
          ...item,
          description: `Beneficiária ${item.nome_completo} foi cadastrada por ${item.created_by_name || 'Sistema'}`
        })),
        ...recentAnamneses.map(item => ({
          ...item,
          description: `Anamnese criada para ${item.beneficiaria_nome} por ${item.created_by_name || 'Sistema'}`
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, Number(limit));
    }

    res.json({ activities });
  } catch (error) {
    loggerService.error('Erro ao buscar atividades recentes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /dashboard/notifications - Notificações do usuário
router.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { limit = '10', unread_only = 'false' } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [req.user!.id];

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
  } catch (error) {
    loggerService.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /dashboard/notifications/:id/read - Marcar notificação como lida
router.put('/notifications/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;

    // Verificar se a notificação pertence ao usuário
    const notification = await db.query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (notification.length === 0) {
      return res.status(404).json({
        error: 'Notificação não encontrada'
      });
    }

    // Marcar como lida
    await db.update('notifications', id, {
      read_at: new Date()
    });

    res.json({
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    loggerService.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// POST /dashboard/notifications/mark-all-read - Marcar todas como lidas
router.post('/notifications/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
      [req.user!.id]
    );

    res.json({
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    loggerService.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// GET /dashboard/quick-access - Links de acesso rápido baseados no perfil
router.get('/quick-access', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userRole = req.user!.role;
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
  } catch (error) {
    loggerService.error('Erro ao buscar links de acesso rápido:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
