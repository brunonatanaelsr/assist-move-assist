import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { validateRequest } from '../middleware/validationMiddleware';
import { z } from 'zod';
import { loggerService } from '../services/logger';

const router = Router();

const pushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url('Endpoint inválido'),
    expirationTime: z.union([z.number().nonnegative(), z.null()]).optional(),
    keys: z.object({
      p256dh: z.string().min(1, 'Chave p256dh é obrigatória'),
      auth: z.string().min(1, 'Chave auth é obrigatória'),
    }),
  }).strict(),
  params: z.any().optional(),
  query: z.any().optional(),
});

router.post(
  '/push-subscription',
  authenticateToken,
  validateRequest(pushSubscriptionSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const userId = Number(req.user!.id);
      const { endpoint, expirationTime, keys } = req.body as {
        endpoint: string;
        expirationTime?: number | null;
        keys: { p256dh: string; auth: string };
      };

      const expirationDate = typeof expirationTime === 'number' ? new Date(expirationTime) : null;

      const result = await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, expiration_time, p256dh, auth)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           endpoint = EXCLUDED.endpoint,
           expiration_time = EXCLUDED.expiration_time,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           updated_at = NOW()
         RETURNING *`,
        [userId, endpoint, expirationDate, keys.p256dh, keys.auth]
      );

      if (result.rowCount === 0) {
        throw new Error('Falha ao salvar inscrição de notificações push');
      }

      loggerService.info('Push subscription salva/atualizada', { userId, endpoint });

      res.json(successResponse(result.rows[0]));
      return;
    } catch (error) {
      loggerService.error('Erro ao salvar inscrição de push notification', error);
      res.status(500).json(errorResponse('Erro ao salvar inscrição de notificações push'));
      return;
    }
  }
);

// GET /notifications
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
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
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar notificações'));
    return;
  }
});

// GET /notifications/unread/count
router.get('/unread/count', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false', [userId]);
    res.json({ count: result.rows[0].count });
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao contar notificações'));
    return;
  }
});

// PATCH /notifications/:id
router.patch('/:id', authenticateToken,
  validateRequest(z.object({
    params: z.object({ id: z.coerce.number() }),
    body: z.object({ read: z.boolean().optional() }),
    query: z.any().optional(),
  })),
  async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const { id } = req.params as any;
    const { read } = (req.body ?? {}) as Record<string, any>;
    const result = await pool.query(
      `UPDATE notifications SET read = COALESCE($1, read), read_at = CASE WHEN $1 = true THEN NOW() ELSE read_at END WHERE id = $2 AND user_id = $3 RETURNING *`,
      [read, id, userId]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Notificação não encontrada')); return; }
    res.json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar notificação'));
    return;
  }
});

// DELETE /notifications/:id
router.delete('/:id', authenticateToken,
  validateRequest(z.object({
    params: z.object({ id: z.coerce.number() }),
    body: z.any().optional(),
    query: z.any().optional(),
  })),
  async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const { id } = req.params as any;
    const notificationId = Number(id);
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id', [notificationId, userId]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Notificação não encontrada')); return; }
    res.json(successResponse({ id: result.rows[0].id }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao remover notificação'));
    return;
  }
});

// POST /notifications/mark-all-read
router.post('/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    await pool.query('UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false', [userId]);
    res.json(successResponse({ message: 'Todas notificações marcadas como lidas' }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao marcar todas como lidas'));
    return;
  }
});

// GET /notifications/preferences
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const result = await pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
    res.json(result.rows[0] || {});
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter preferências'));
    return;
  }
});

// PUT /notifications/preferences
router.put('/preferences', authenticateToken,
  validateRequest(z.object({
    body: z.object({}).passthrough(),
    query: z.any().optional(),
    params: z.any().optional(),
  })),
  async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const fields = (req.body ?? {}) as Record<string, any>;
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
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar preferências'));
    return;
  }
});

// POST /notifications - criar notificação manual
router.post('/', authenticateToken,
  validateRequest(z.object({
    body: z.object({
      user_id: z.coerce.number(),
      title: z.string().min(1),
      message: z.string().min(1),
      type: z.string().optional(),
      action_url: z.string().url().optional().nullable(),
      data: z.any().optional(),
    }),
    query: z.any().optional(),
    params: z.any().optional(),
  })),
  async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { user_id, title, message, type = 'info', action_url, data } = (req.body ?? {}) as Record<string, any>;
    if (!user_id || !title || !message) {
      res.status(400).json(errorResponse('user_id, title e message são obrigatórios'));
      return;
    }
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, action_url, data)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING *`,
      [user_id, title, message, type, action_url || null, JSON.stringify(data || {})]
    );
    res.status(201).json(successResponse(result.rows[0]));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar notificação'));
    return;
  }
});

export default router;
