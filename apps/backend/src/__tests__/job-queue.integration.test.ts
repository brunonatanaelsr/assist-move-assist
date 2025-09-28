import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import type { Pool } from 'pg';
import {
  setupTestDatabase,
  teardownTestDatabase,
  truncateAllTables
} from './helpers/database';

const runIntegration = process.env.RUN_INTEGRATION === '1';
let pool: Pool;

async function createQueueService() {
  if (!runIntegration) {
    throw new Error('Integration tests desabilitados');
  }

  jest.resetModules();

  jest.doMock('../config/database', () => ({
    pool,
    db: {
      query: async (text: string, params?: any[]) => {
        const result = await pool.query(text, params);
        return result.rows;
      }
    }
  }));

  jest.doMock('../services/logger', () => ({
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
  }));

  const module = await import('../services/QueueService');
  return new module.QueueService();
}

describe('QueueService job queue (integration)', () => {
  beforeAll(async () => {
    if (!runIntegration) return;
    const db = await setupTestDatabase();
    pool = db.pool;
  });

  afterEach(async () => {
    if (!runIntegration) return;
    await truncateAllTables();
  });

  afterAll(async () => {
    if (!runIntegration) return;
    await teardownTestDatabase();
  });

  it('enqueues, processes and cleans up jobs', async () => {
    if (!runIntegration) return;

    const queueService = await createQueueService();

    const { id } = await queueService.enqueue('cleanup_data', { olderThanDays: 1 });

    const persisted = await pool.query('SELECT * FROM job_queue WHERE id = $1', [id]);
    expect(persisted.rowCount).toBe(1);
    expect(persisted.rows[0].status).toBe('pending');

    const jobRow = persisted.rows[0];
    await (queueService as any).runJob({
      id: jobRow.id,
      job_type: jobRow.job_type,
      payload: jobRow.payload,
      tentativas: jobRow.tentativas,
      max_tentativas: jobRow.max_tentativas
    });

    const completed = await pool.query(
      'SELECT status, executed_at FROM job_queue WHERE id = $1',
      [id]
    );
    expect(completed.rows[0].status).toBe('completed');
    expect(completed.rows[0].executed_at).not.toBeNull();

    await pool.query(
      `UPDATE job_queue
         SET status = 'completed',
             executed_at = NOW() - interval '40 days',
             updated_at = NOW() - interval '40 days'
       WHERE id = $1`,
      [id]
    );

    await queueService.cleanupOldJobs();

    const remaining = await pool.query('SELECT 1 FROM job_queue WHERE id = $1', [id]);
    expect(remaining.rowCount).toBe(0);
  });
});
