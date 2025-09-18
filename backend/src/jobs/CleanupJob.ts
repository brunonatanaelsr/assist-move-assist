import { Job } from '../types/Job';
import { db } from '../database';
import { logger } from '../services/logger';

interface CleanupJobPayload {
  olderThanDays?: number;
  statuses?: string[];
}

export class CleanupJob implements Job<CleanupJobPayload> {
  async execute(payload: CleanupJobPayload): Promise<void> {
    const olderThanDays = payload?.olderThanDays ?? 30;
    const statuses = payload?.statuses?.length
      ? payload.statuses
      : ['completed', 'failed', 'cancelled'];

    try {
      await db.none(
        `DELETE FROM job_queue
         WHERE status = ANY($1::text[])
         AND updated_at < NOW() - ($2 || ' days')::interval`,
        [statuses, olderThanDays]
      );

      logger.info('Limpeza de jobs antigos concluída', {
        olderThanDays,
        statuses
      });
    } catch (error: any) {
      logger.error('Erro ao executar limpeza de jobs', {
        olderThanDays,
        statuses,
        error: error?.message || error
      });
      throw error;
    }
  }
}
