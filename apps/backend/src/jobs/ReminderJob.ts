import { Job } from '../types/Job';
import { redis } from '../lib/redis';
import { logger } from '../services/logger';
import { db } from '../database';

export interface ReminderJobPayload {
  reminderId: string;
  notificationId?: string;
  scheduledAt?: string | Date;
  metadata?: Record<string, unknown>;
}

export class ReminderJob implements Job<ReminderJobPayload> {
  async execute(payload: ReminderJobPayload): Promise<void> {
    if (!payload?.reminderId) {
      logger.warn('Payload de lembrete inválido recebido', { payload });
      return;
    }

    const { reminderId, scheduledAt, notificationId, metadata } = payload;

    const reminderKey = `reminder:${reminderId}`;
    const processedAt = new Date().toISOString();

    await redis.setex(
      reminderKey,
      24 * 60 * 60,
      JSON.stringify({
        reminderId,
        notificationId: notificationId ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        metadata: metadata ?? null,
        processedAt
      })
    );

    try {
      await db.none(
        `UPDATE reminders
         SET status = 'processed',
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [reminderId]
      );
    } catch (error: any) {
      // Se a tabela não existir ou a atualização falhar não queremos quebrar o job.
      logger.debug('Falha ao atualizar lembrete no banco de dados', {
        reminderId,
        error: error?.message || error
      });
    }

    logger.info('Lembrete processado com sucesso', {
      reminderId,
      notificationId,
      scheduledAt,
      processedAt
    });
  }
}
