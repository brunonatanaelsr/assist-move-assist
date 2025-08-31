import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import type { Pool } from 'pg';
import { setupTestDatabase, teardownTestDatabase } from '../../__tests__/helpers/database';
import { OficinaService } from '../oficina.service';

let pool: Pool;
let redisContainer: StartedTestContainer;
let redis: Redis;
let service: OficinaService;

const runOnlyIfEnabled = process.env.RUN_INTEGRATION === '1';

// Minimal helper to insert records directly
async function insert(sql: string, params: any[] = []) {
  // @ts-ignore
  await pool.query(sql, params);
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
    service = new OficinaService(pool as any, redis as any);
  });

  afterAll(async () => {
    if (!runOnlyIfEnabled) return;
    await redis?.quit();
    await redisContainer?.stop();
    await teardownTestDatabase();
  });

  it('lista e busca oficinas com cache', async () => {
    if (!runOnlyIfEnabled) return;
    // Inserir projeto e oficina
    await insert(`INSERT INTO projetos (id, nome, ativo) VALUES (1,'Proj',true)`);
    await insert(`INSERT INTO oficinas (id, nome, projeto_id, ativo, status) VALUES (10,'Of A',1,true,'ativa')`);

    // 1ª chamada (sem cache)
    const page = await service.listarOficinas({ page: 1, limit: 10 } as any);
    expect(page.data.length).toBeGreaterThan(0);

    // 2ª chamada (com cache) — deve retornar mesmo resultado rapidamente
    const cached = await service.listarOficinas({ page: 1, limit: 10 } as any);
    expect(cached.data.length).toBe(page.data.length);

    // Buscar detalhe
    const of = await service.buscarOficina(10);
    expect(of).toBeTruthy();
    expect((of as any).nome).toBe('Of A');
  });

  it('lista participantes por projeto da oficina', async () => {
    if (!runOnlyIfEnabled) return;
    // projeto 2
    await insert(`INSERT INTO projetos (id, nome, ativo) VALUES (2,'Proj 2',true)`);
    await insert(`INSERT INTO oficinas (id, nome, projeto_id, ativo, status) VALUES (20,'Of B',2,true,'ativa')`);

    // beneficiária 1
    await insert(`INSERT INTO beneficiarias (id, nome_completo, cpf, ativo, status) VALUES (101,'Maria','11111111111',true,'ativa')`);
    // participação ligada ao projeto 2
    await insert(`INSERT INTO participacoes (beneficiaria_id, projeto_id, status, ativo) VALUES (101,2,'inscrita',true)`);

    const participantes = await service.listarParticipantes(20);
    expect(Array.isArray(participantes)).toBe(true);
    expect(participantes.length).toBeGreaterThan(0);
  });
});

