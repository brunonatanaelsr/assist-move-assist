import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// GET /notifications
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const { read, type, page = '1', limit = '20' } = req.query as any;
    const p = Math.max(parseInt(page) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let idx = 2;
    if (read !== undefined) {
      where.push('read = $' + idx++);
      params.push(read === 'true');
    }
    if (type && Array.isArray(type)) {
      where.push(`type = ANY($${idx++})`);
      params.push(type);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, l, (p - 1) * l]
    );
    res.json(successResponse(result.rows));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar notificações'));
  }
});

// GET /notifications/unread/count
router.get('/unread/count', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false', [userId]);
    res.json({ count: result.rows[0].count });
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao contar notificações'));
  }
});

// PATCH /notifications/:id
router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const { id } = req.params as any;
    const { read } = req.body || {};
    const result = await pool.query(
      `UPDATE notifications SET read = COALESCE($1, read), read_at = CASE WHEN $1 = true THEN NOW() ELSE read_at END WHERE id = $2 AND user_id = $3 RETURNING *`,
      [read, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json(errorResponse('Notificação não encontrada'));
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar notificação'));
  }
});

// POST /notifications/mark-all-read
router.post('/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    await pool.query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
    res.json(successResponse({ message: 'Todas notificações marcadas como lidas' }));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao marcar todas como lidas'));
  }
});

// GET /notifications/preferences
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter preferências'));
  }
});

// PUT /notifications/preferences
router.put('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.user!.id);
    const fields = req.body || {};
    const result = await pool.query(
      `INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, mention_notifications, assignment_notifications, activity_notifications, form_response_notifications, reminder_notifications, notification_types, quiet_hours_start, quiet_hours_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (user_id) DO UPDATE SET
         email_notifications = COALESCE(EXCLUDED.email_notifications, notification_preferences.email_notifications),
         push_notifications = COALESCE(EXCLUDED.push_notifications, notification_preferences.push_notifications),
         mention_notifications = COALESCE(EXCLUDED.mention_notifications, notification_preferences.mention_notifications),
         assignment_notifications = COALESCE(EXCLUDED.assignment_notifications, notification_preferences.assignment_notifications),
         activity_notifications = COALESCE(EXCLUDED.activity_notifications, notification_preferences.activity_notifications),
         form_response_notifications = COALESCE(EXCLUDED.form_response_notifications, notification_preferences.form_response_notifications),
         reminder_notifications = COALESCE(EXCLUDED.reminder_notifications, notification_preferences.reminder_notifications),
         notification_types = COALESCE(EXCLUDED.notification_types, notification_preferences.notification_types),
         quiet_hours_start = COALESCE(EXCLUDED.quiet_hours_start, notification_preferences.quiet_hours_start),
         quiet_hours_end = COALESCE(EXCLUDED.quiet_hours_end, notification_preferences.quiet_hours_end)
       RETURNING *`,
      [
        userId,
        fields.email_notifications,
        fields.push_notifications,
        fields.mention_notifications,
        fields.assignment_notifications,
        fields.activity_notifications,
        fields.form_response_notifications,
        fields.reminder_notifications,
        fields.notification_types,
        fields.quiet_hours_start,
        fields.quiet_hours_end,
      ]
    );
    res.json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar preferências'));
  }
});

// POST /notifications - criar notificação manual
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { user_id, title, message, type = 'info', action_url, data } = req.body || {};
    if (!user_id || !title || !message) {
      return res.status(400).json(errorResponse('user_id, title e message são obrigatórios'));
    }
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, action_url, data)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING *`,
      [user_id, title, message, type, action_url || null, JSON.stringify(data || {})]
    );
    res.status(201).json(successResponse(result.rows[0]));
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar notificação'));
  }
});

export default router;

