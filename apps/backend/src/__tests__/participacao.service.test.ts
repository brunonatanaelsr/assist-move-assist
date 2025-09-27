import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ParticipacaoService } from '../services/participacao.service';
import { AppError } from '../utils';
import type { Pool } from 'pg';
import type { RedisClient } from '../lib/redis';

const queryMock: any = jest.fn();
const poolMock = { query: queryMock } as unknown as Pool;

const redisMock: RedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  multi: jest.fn(),
  on: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  lpush: jest.fn(),
  lrange: jest.fn(),
  lrem: jest.fn()
} as unknown as RedisClient;

describe('ParticipacaoService.atualizarParticipacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve lançar erro amigável quando nenhum campo é fornecido para atualização', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, beneficiaria_id: 10 }] });
    const service = new ParticipacaoService(poolMock, redisMock);

    const promise = service.atualizarParticipacao(1, {} as any);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      message: 'Nenhum campo fornecido para atualização',
      statusCode: 400
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
