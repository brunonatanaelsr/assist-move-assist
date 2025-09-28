import { db } from '../database';
import { logger } from '../services/logger';
import { NotificationJob } from '../jobs/NotificationJob';
import { ReminderJob } from '../jobs/ReminderJob';
import { ReportJob } from '../jobs/ReportJob';
import { CleanupJob } from '../jobs/CleanupJob';
import type { JobConstructor } from '../types/Job';
import type { JobPayloadMap, JobType } from '../types/jobRegistry';

const LOCK_TTL = 60; // 60 segundos
const BATCH_SIZE = 10;

interface PersistedJob<K extends JobType = JobType> {
  id: number;
  job_type: K;
  payload: JobPayloadMap[K];
  tentativas: number;
  max_tentativas: number;
}

interface EnqueueOptions {
  priority?: number;
  scheduledAt?: Date;
  maxRetries?: number;
}

export class QueueService {
  private jobs: Map<JobType, JobConstructor<JobPayloadMap[JobType]>>;
  private isProcessing = false;
  private workerId: string;

  constructor() {
    this.jobs = new Map();
    this.workerId = `worker-${Math.random().toString(36).slice(2)}`;

    // Registrar jobs disponíveis
    this.registerJobs();
  }

  private registerJobs() {
    this.jobs.set('send_notification', NotificationJob);
    this.jobs.set('send_reminder', ReminderJob);
    this.jobs.set('generate_report', ReportJob);
    this.jobs.set('cleanup_data', CleanupJob);
  }

  async enqueue<K extends JobType>(
    jobType: K,
    payload: JobPayloadMap[K],
    options: EnqueueOptions = {}
  ): Promise<{ id: number }> {
    const {
      priority = 1,
      scheduledAt = new Date(),
      maxRetries = 3
    } = options;

    try {
      return await db.one<{ id: number }>(
        `INSERT INTO job_queue (
          job_type,
          payload,
          prioridade,
          scheduled_at,
          max_tentativas
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [jobType, payload, priority, scheduledAt, maxRetries]
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Erro ao enfileirar job', {
        jobType,
        error: message
      });
      throw error instanceof Error ? error : new Error(message);
    }
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.isProcessing) {
        // Buscar próximo lote de jobs
        const jobs = await db.manyOrNone<PersistedJob>(
          `UPDATE job_queue
          SET status = 'processing',
              locked_at = NOW(),
              locked_by = $1
          WHERE id IN (
            SELECT id
            FROM job_queue
            WHERE status = 'pending'
            AND scheduled_at <= NOW()
            AND (locked_at IS NULL OR locked_at < NOW() - interval '1 minute')
            ORDER BY prioridade DESC, scheduled_at
            FOR UPDATE SKIP LOCKED
            LIMIT $2
          )
          RETURNING *`,
          [this.workerId, BATCH_SIZE]
        );

        if (jobs.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Processar jobs em paralelo
        await Promise.all(jobs.map((job) => this.runJob(job)));

      }
    } catch (error) {
      logger.error('Erro no processamento de jobs', error);
      this.isProcessing = false;
    }
  }

  async retryFailedJobs() {
    try {
      await db.none(
        `UPDATE job_queue
        SET status = 'pending',
            tentativas = 0,
            locked_at = NULL,
            locked_by = NULL
        WHERE status = 'failed'
        AND created_at > NOW() - interval '24 hours'`
      );
    } catch (error) {
      logger.error('Erro ao reprocessar jobs falhos', error);
    }
  }

  async cleanupOldJobs() {
    try {
      await db.none('SELECT cleanup_old_jobs()');
    } catch (error) {
      logger.error('Erro na limpeza de jobs antigos', error);
    }
  }

  stop() {
    this.isProcessing = false;
  }

  private async runJob<K extends JobType>(job: PersistedJob<K>): Promise<void> {
    try {
      const JobClass = this.jobs.get(job.job_type);
      if (!JobClass) {
        throw new Error(`Job type ${job.job_type} não registrado`);
      }

      const jobInstance = new JobClass();
      await jobInstance.execute(job.payload);

      await db.none(
        `UPDATE job_queue
        SET status = 'completed',
            executed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1`,
        [job.id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Erro ao processar job', {
        jobId: job.id,
        jobType: job.job_type,
        error: message
      });

      await db.none(
        `UPDATE job_queue
        SET status = CASE
              WHEN tentativas + 1 >= max_tentativas THEN 'failed'
              ELSE 'pending'
            END,
            tentativas = tentativas + 1,
            last_error = $2,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = $1`,
        [job.id, message]
      );
    }
  }
}
