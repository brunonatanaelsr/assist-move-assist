import { Pool } from 'pg';
import { logger } from '../services/logger';
import type { StoredWebhookEvent, WebhookPayload } from '../types/webhooks';

export class WebhookQueue {
  private pool: Pool;
  private maxRetries: number;
  private processing: boolean;

  constructor(pool: Pool, maxRetries: number = 3) {
    this.pool = pool;
    this.maxRetries = maxRetries;
    this.processing = false;
  }

  async enqueue(
    endpoint: string,
    eventType: string,
    payload: WebhookPayload
  ): Promise<string> {
    try {
      const result = await this.pool.query(
        `INSERT INTO webhooks (
          endpoint,
          event_type,
          payload,
          status,
          next_retry_at
        ) VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
        RETURNING id`,
        [endpoint, eventType, payload]
      );

      // Inicia o processamento se não estiver rodando
      if (!this.processing) {
        this.processQueue();
      }

      return result.rows[0].id;
    } catch (error) {
      const message = this.getErrorMessage(error);
      logger.error('Erro ao enfileirar webhook:', { error: message });
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        const event = await this.getNextEvent();
        if (!event) {
          break;
        }

        try {
          await this.processEvent(event);
        } catch (error) {
          await this.handleEventError(event, error);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async getNextEvent(): Promise<StoredWebhookEvent | null> {
    const result = await this.pool.query(
      `UPDATE webhooks
       SET status = 'processing'
       WHERE id = (
         SELECT id
         FROM webhooks
         WHERE status = 'pending'
         AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`
    );

    return (result.rows[0] as StoredWebhookEvent | undefined) || null;
  }

  private async processEvent(event: StoredWebhookEvent): Promise<void> {
    try {
      const response = await fetch(event.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': event.event_type,
          'X-Webhook-ID': event.id
        },
        body: JSON.stringify(event.payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await this.markEventCompleted(event.id);
    } catch (error) {
      throw error;
    }
  }

  private async handleEventError(
    event: StoredWebhookEvent,
    error: unknown
  ): Promise<void> {
    const retryCount = event.retry_count + 1;
    const message = this.getErrorMessage(error);

    if (retryCount >= this.maxRetries) {
      await this.markEventFailed(event.id, message);
      return;
    }

    // Exponential backoff com jitter
    const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 1800000); // max 30 min
    const jitter = Math.floor(Math.random() * 1000);
    const nextRetryAt = new Date(Date.now() + baseDelay + jitter);

    await this.pool.query(
      `UPDATE webhooks
       SET retry_count = $1,
           next_retry_at = $2,
           error_message = $3,
           status = 'pending'
       WHERE id = $4`,
      [retryCount, nextRetryAt, message, event.id]
    );
  }

  private async markEventCompleted(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhooks
       SET status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }

  private async markEventFailed(id: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE webhooks
       SET status = 'failed',
           error_message = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error, id]
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }
    }

    return 'Erro desconhecido ao processar webhook';
  }

  // Método para reagendar webhooks falhos
  async retryFailedWebhooks(): Promise<void> {
    await this.pool.query(
      `UPDATE webhooks
       SET status = 'pending',
           retry_count = 0,
           next_retry_at = CURRENT_TIMESTAMP,
           error_message = null
       WHERE status = 'failed'
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );

    // Inicia o processamento
    if (!this.processing) {
      this.processQueue();
    }
  }

  // Método para limpar webhooks antigos
  async cleanup(days: number = 30): Promise<void> {
    await this.pool.query(
      `DELETE FROM webhooks
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
       AND status IN ('completed', 'failed')`,
      [days]
    );
  }
}
