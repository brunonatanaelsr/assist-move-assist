import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import { successResponse, errorResponse } from '../utils/responseFormatter';

const router = Router();

// GET /calendar/events
router.get('/events', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as any;
    const where: string[] = [];
    const params: any[] = [];
    if (startDate && endDate) {
      where.push('(start <= $1 AND "end" >= $2)');
      params.push(endDate, startDate);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(`SELECT * FROM calendar_events ${whereClause} ORDER BY start ASC`, params);
    res.json(result.rows);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao listar eventos'));
    return;
  }
});

// GET /calendar/events/:id
router.get('/events/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const result = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Evento não encontrado')); return; }
    res.json(result.rows[0]);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter evento'));
    return;
  }
});

// POST /calendar/events
router.post('/events', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { title, description, start, end, allDay, location, type, status } = req.body || {};
    const createdBy = Number((req as any).user!.id);
    const result = await pool.query(
      `INSERT INTO calendar_events (title, description, start, "end", all_day, location, type, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [title, description || null, start, end, !!allDay, location || null, type || 'OUTRO', status || 'AGENDADO', createdBy]
    );
    res.status(201).json(result.rows[0]);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar evento'));
    return;
  }
});

// PUT /calendar/events/:id
router.put('/events/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    const { title, description, start, end, allDay, location, type, status } = req.body || {};
    const result = await pool.query(
      `UPDATE calendar_events SET 
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         start = COALESCE($4, start),
         "end" = COALESCE($5, "end"),
         all_day = COALESCE($6, all_day),
         location = COALESCE($7, location),
         type = COALESCE($8, type),
         status = COALESCE($9, status)
       WHERE id = $1
       RETURNING *`,
      [id, title || null, description || null, start || null, end || null, allDay === undefined ? null : !!allDay, location || null, type || null, status || null]
    );
    if (result.rowCount === 0) { res.status(404).json(errorResponse('Evento não encontrado')); return; }
    res.json(result.rows[0]);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar evento'));
    return;
  }
});

// DELETE /calendar/events/:id
router.delete('/events/:id', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { id } = req.params as any;
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [id]);
    res.status(204).end();
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao excluir evento'));
    return;
  }
});

// POST /calendar/events/recurring
router.post('/events/recurring', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { event, recurrence } = req.body || {};
    // Implementação simplificada: cria apenas um evento base
    const created = await pool.query(
      `INSERT INTO calendar_events (title, description, start, "end", all_day, location, type, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [event?.title, event?.description || null, event?.start, event?.end, !!event?.allDay, event?.location || null, event?.type || 'OUTRO', event?.status || 'AGENDADO', (req as any).user!.id]
    );
    res.status(201).json([created.rows[0]]);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao criar eventos recorrentes'));
    return;
  }
});

// PUT /calendar/events/:eventId/participants/:participantId
router.put('/events/:eventId/participants/:participantId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { eventId, participantId } = req.params as any;
    const { status } = req.body || {};
    await pool.query(
      `INSERT INTO calendar_event_participants (event_id, participant_id, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (event_id, participant_id) DO UPDATE SET status = EXCLUDED.status`,
      [eventId, participantId, status || 'TENTATIVE']
    );
    res.json(successResponse({ eventId, participantId, status: status || 'TENTATIVE' }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar participante'));
    return;
  }
});

// PUT /calendar/events/:eventId/attendance/:participantId
router.put('/events/:eventId/attendance/:participantId', authenticateToken, async (req, res): Promise<void> => {
  try {
    const { eventId, participantId } = req.params as any;
    const { attended } = req.body || {};
    await pool.query(
      `INSERT INTO calendar_event_participants (event_id, participant_id, attended)
       VALUES ($1,$2,$3)
       ON CONFLICT (event_id, participant_id) DO UPDATE SET attended = EXCLUDED.attended`,
      [eventId, participantId, !!attended]
    );
    res.json(successResponse({ eventId, participantId, attended: !!attended }));
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao atualizar presença'));
    return;
  }
});

export default router;
// GET /calendar/stats
router.get('/stats', authenticateToken, async (_req, res): Promise<void> => {
  try {
    const total = await pool.query('SELECT COUNT(*)::int as c FROM calendar_events');
    const upcoming = await pool.query('SELECT COUNT(*)::int as c FROM calendar_events WHERE start >= NOW()');
    const thisMonth = await pool.query("SELECT COUNT(*)::int as c FROM calendar_events WHERE date_trunc('month', start) = date_trunc('month', NOW())");
    const byType = await pool.query('SELECT type, COUNT(*)::int as count FROM calendar_events GROUP BY type');
    const byStatus = await pool.query('SELECT status, COUNT(*)::int as count FROM calendar_events GROUP BY status');
    const stats = {
      total_events: total.rows[0].c,
      upcoming_events: upcoming.rows[0].c,
      events_this_month: thisMonth.rows[0].c,
      events_by_type: Object.fromEntries(byType.rows.map((r:any)=>[r.type, r.count])),
      events_by_status: Object.fromEntries(byStatus.rows.map((r:any)=>[r.status, r.count])),
      popular_times: [],
      attendance_rate: 0
    };
    res.json(stats);
    return;
  } catch (error) {
    res.status(500).json(errorResponse('Erro ao obter estatísticas'));
    return;
  }
});
