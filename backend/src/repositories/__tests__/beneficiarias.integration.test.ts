import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { BeneficiariasRepository } from '../../repositories/beneficiariasRepository';
import { setupTestDatabase, teardownTestDatabase } from '../../__tests__/helpers/database';
import type { Pool } from 'pg';

let pool: Pool;
let repo: BeneficiariasRepository;

describe('BeneficiariasRepository (integration)', () => {
  beforeAll(async () => {
    const db = await setupTestDatabase();
    pool = db.pool;
    repo = new BeneficiariasRepository(pool);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('cria e busca por ID', async () => {
    const created = await repo.criar({
      nome_completo: 'Teste Integração',
      cpf: '12345678901',
      status: 'ativa' as any,
      ativo: true,
    } as any);

    const found = await repo.buscarPorId(Number((created as any).id));
    expect(found).toBeTruthy();
    expect((found as any).nome_completo).toBe('Teste Integração');
  });
});

