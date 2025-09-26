import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import type { Pool } from 'pg';
import { setupTestDatabase, teardownTestDatabase } from '../../__tests__/helpers/database';
import { OficinaService } from '../oficina.service';

type SqlParam = string | number | boolean | null | Date;

let pool: Pool | null = null;
let redisContainer: StartedTestContainer | null = null;
let redis: Redis | null = null;
let service: OficinaService | null = null;

const runOnlyIfEnabled = process.env.RUN_INTEGRATION === '1';

// Minimal helper to insert records directly
async function insert(sql: string, params: SqlParam[] = []): Promise<void> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  await pool.query(sql, params);
}

function getService(): OficinaService {
  if (!service) {
    throw new Error('OficinaService not initialized');
  }

  return service;
}

describe('OficinaService (integration)', () => {
  beforeAll(async () => {
    if (!runOnlyIfEnabled) return;
    const db = await setupTestDatabase();
    pool = db.pool;
    redisContainer = await new GenericContainer('redis:7').withExposedPorts(6379).start();
    const host = redisContainer.getHost();
    const port = redisContainer.getMappedPort(6379);
    redis = new Redis({ host, port });
    service = new OficinaService(pool, redis);
  });

  afterAll(async () => {
    if (!runOnlyIfEnabled) return;
    await redis?.quit();
    await redisContainer?.stop();
    await teardownTestDatabase();
  });

  it('lista e busca oficinas com cache', async () => {
    if (!runOnlyIfEnabled) return;
    const oficinaService = getService();
    // Inserir projeto e oficina
    await insert(`INSERT INTO projetos (id, nome, ativo) VALUES (1,'Proj',true)`);
    await insert(`INSERT INTO oficinas (id, nome, projeto_id, ativo, status) VALUES (10,'Of A',1,true,'ativa')`);

    // 1ª chamada (sem cache)
    const paginationFilters: Parameters<OficinaService['listarOficinas']>[0] = { page: 1, limit: 10 };
    const page = (await oficinaService.listarOficinas(paginationFilters)) as { data: unknown[] };
    expect(page.data.length).toBeGreaterThan(0);

    // 2ª chamada (com cache) — deve retornar mesmo resultado rapidamente
    const cached = (await oficinaService.listarOficinas(paginationFilters)) as { data: unknown[] };
    expect(cached.data.length).toBe(page.data.length);

    // Buscar detalhe
    const of = await oficinaService.buscarOficina(10);
    expect(of).toBeTruthy();
    expect(of.nome).toBe('Of A');
  });

  it('lista participantes por projeto da oficina', async () => {
    if (!runOnlyIfEnabled) return;
    const oficinaService = getService();
    // projeto 2
    await insert(`INSERT INTO projetos (id, nome, ativo) VALUES (2,'Proj 2',true)`);
    await insert(`INSERT INTO oficinas (id, nome, projeto_id, ativo, status) VALUES (20,'Of B',2,true,'ativa')`);

    // beneficiária 1
    await insert(`INSERT INTO beneficiarias (id, nome_completo, cpf, ativo, status) VALUES (101,'Maria','11111111111',true,'ativa')`);
    // participação ligada ao projeto 2
    await insert(`INSERT INTO participacoes (beneficiaria_id, projeto_id, status, ativo) VALUES (101,2,'inscrita',true)`);

    const participantes = await oficinaService.listarParticipantes(20);
    expect(Array.isArray(participantes)).toBe(true);
    expect(participantes.length).toBeGreaterThan(0);
  });
});

