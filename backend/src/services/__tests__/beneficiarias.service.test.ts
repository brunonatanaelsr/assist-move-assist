import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { BeneficiariasService } from '../beneficiarias.service';

// Mocks
const mockDb = {
  query: vi.fn()
} as unknown as Pool;

const mockRedis = {
  del: vi.fn(),
  get: vi.fn(),
  set: vi.fn()
} as unknown as Redis;

describe('BeneficiariasService', () => {
  let service: BeneficiariasService;

  beforeEach(() => {
    service = new BeneficiariasService(mockDb, mockRedis);
    vi.clearAllMocks();
  });

  describe('listar', () => {
    it('should list beneficiarias with pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })
        .mockResolvedValueOnce({ 
          rows: [
            { id: 1, nome_completo: 'Test', status: 'ATIVO' }
          ]
        });

      const result = await service.listar({ page: 1, limit: 10 });

      expect(result.beneficiarias).toHaveLength(1);
      expect(result.pagination.total).toBe(10);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should use cache when available', async () => {
      const cachedData = {
        beneficiarias: [{ id: 1 }],
        pagination: { total: 10 }
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const result = await service.listar();

      expect(result).toEqual(cachedData);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('criar', () => {
    const mockInput = {
      nome_completo: 'Test User',
      cpf: '12345678901',
      data_nascimento: '1990-01-01',
      telefone: '11999999999',
      email: 'test@example.com'
    };

    it('should create new beneficiaria', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // CPF check
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, ...mockInput }] 
        });

      const result = await service.criar(mockInput);

      expect(result.id).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('beneficiarias:list:*');
    });

    it('should prevent duplicate CPF', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1 }] 
      });

      await expect(service.criar(mockInput))
        .rejects
        .toThrow('CPF já cadastrado');
    });
  });

  describe('atualizar', () => {
    it('should update existing beneficiaria', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, nome_completo: 'Updated' }]
        });

      const result = await service.atualizar(1, { 
        nome_completo: 'Updated' 
      });

      expect(result.nome_completo).toBe('Updated');
      expect(mockRedis.del).toHaveBeenCalledWith('beneficiarias:list:*');
    });

    it('should throw if beneficiaria not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.atualizar(1, {}))
        .rejects
        .toThrow('Beneficiária não encontrada');
    });
  });

  describe('excluir', () => {
    it('should soft delete beneficiaria', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const result = await service.excluir(1);

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('beneficiarias:list:*');
    });

    it('should throw if beneficiaria not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.excluir(1))
        .rejects
        .toThrow('Beneficiária não encontrada');
    });
  });
});
